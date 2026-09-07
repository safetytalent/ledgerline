import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getValidAccessToken } from "@/lib/qbo/access-token";
import { processQboEntity } from "@/lib/agents/process-transaction";

const API_BASE =
  process.env.QBO_ENVIRONMENT === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";

async function queryEntities(
  realmId: string,
  accessToken: string,
  entityType: "Purchase" | "Bill"
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

  const [purchaseIds, billIds] = await Promise.all([
    queryEntities(client.qboRealmId, accessToken, "Purchase"),
    queryEntities(client.qboRealmId, accessToken, "Bill"),
  ]);

  let processed = 0;
  for (const id of purchaseIds) {
    const txn = await processQboEntity(clientId, client.qboRealmId, accessToken, "Purchase", id);
    if (txn) processed++;
  }
  for (const id of billIds) {
    const txn = await processQboEntity(clientId, client.qboRealmId, accessToken, "Bill", id);
    if (txn) processed++;
  }

  return NextResponse.json({ found: purchaseIds.length + billIds.length, processed });
}
