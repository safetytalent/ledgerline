import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getValidAccessToken } from "@/lib/qbo/access-token";
import { processQboEntity } from "@/lib/agents/process-transaction";
import { fetchEntityById } from "@/lib/qbo/client";
import { generateRemindersForClient } from "@/lib/agents/ar-nudge-agent";

const API_BASE =
  process.env.QBO_ENVIRONMENT === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";

async function queryEntities(
  realmId: string,
  accessToken: string,
  entityType: "Purchase" | "Bill" | "Invoice" | "SalesReceipt" | "Deposit"
): Promise<string[]> {
  // Last 90 days — a reasonable pull window; older history isn't
  // usually still awaiting categorization.
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const query = encodeURIComponent(
    `select Id from ${entityType} where TxnDate > '${since}' maxresults 100`
  );
  const res = await fetch(`${API_BASE}/v3/company/${realmId}/query?query=${query}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const rows = data?.QueryResponse?.[entityType] ?? [];
  return rows.map((r: { Id: string }) => r.Id);
}

/**
 * AR Nudge Agent's data source. The general Transaction pipeline
 * above records Invoices too, but only as a generic income line — it
 * has no concept of "balance still owed" or "due date". This is a
 * separate, narrower sync that pulls exactly those two fields for
 * every invoice, so the aging report reflects what's actually still
 * unpaid in QuickBooks right now, not a static snapshot.
 */
async function syncInvoiceRecords(
  clientId: string,
  realmId: string,
  accessToken: string,
  invoiceIds: string[]
) {
  for (const id of invoiceIds) {
    const raw = await fetchEntityById(realmId, accessToken, "Invoice", id);
    if (!raw) continue;

    const balance = Number(raw.Balance ?? 0);
    const totalAmount = Number(raw.TotalAmt ?? 0);
    const customerName = raw.CustomerRef?.name ?? "Unknown Customer";
    const dueDate = raw.DueDate ? new Date(raw.DueDate) : new Date();
    const txnDate = raw.TxnDate ? new Date(raw.TxnDate) : new Date();

    await prisma.invoice.upsert({
      where: { qboInvoiceId: id },
      create: { clientId, qboInvoiceId: id, customerName, totalAmount, balance, dueDate, txnDate },
      update: { customerName, totalAmount, balance, dueDate, txnDate },
    });
  }
}

/**
 * POST /api/qbo/sync
 * Body: { clientId: string }
 *
 * Phase B's "pull transactions via the existing QuickBooks connection"
 * — an active counterpart to the reactive webhook. Useful for
 * backfilling a client's recent history (webhooks only fire for
 * changes going forward, not what already existed when they connected)
 * and as a safety net if a webhook event was ever missed.
 *
 * Runs every found transaction through the exact same
 * categorization/Rule-2/auto-post/audit-log pipeline as the webhook —
 * see lib/agents/process-transaction.ts.
 */
export async function POST(req: NextRequest) {
  const { clientId } = await req.json();
  if (!clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client || !client.qboRealmId) {
    return NextResponse.json({ error: "Client not found or not connected to QuickBooks" }, { status: 404 });
  }

  const accessToken = await getValidAccessToken(clientId);
  if (!accessToken) {
    return NextResponse.json({ error: "No valid QuickBooks connection" }, { status: 400 });
  }

  const [purchaseIds, billIds, invoiceIds, salesReceiptIds, depositIds] = await Promise.all([
    queryEntities(client.qboRealmId, accessToken, "Purchase"),
    queryEntities(client.qboRealmId, accessToken, "Bill"),
    queryEntities(client.qboRealmId, accessToken, "Invoice"),
    queryEntities(client.qboRealmId, accessToken, "SalesReceipt"),
    queryEntities(client.qboRealmId, accessToken, "Deposit"),
  ]);

  const allEntities: { type: "Purchase" | "Bill" | "Invoice" | "SalesReceipt" | "Deposit"; id: string }[] = [
    ...purchaseIds.map((id) => ({ type: "Purchase" as const, id })),
    ...billIds.map((id) => ({ type: "Bill" as const, id })),
    ...invoiceIds.map((id) => ({ type: "Invoice" as const, id })),
    ...salesReceiptIds.map((id) => ({ type: "SalesReceipt" as const, id })),
    ...depositIds.map((id) => ({ type: "Deposit" as const, id })),
  ];

  let processed = 0;
  for (const entity of allEntities) {
    const txn = await processQboEntity(clientId, client.qboRealmId, accessToken, entity.type, entity.id);
    if (txn) processed++;
  }

  await syncInvoiceRecords(clientId, client.qboRealmId, accessToken, invoiceIds);
  await generateRemindersForClient(clientId);

  return NextResponse.json({ found: allEntities.length, processed });
}
