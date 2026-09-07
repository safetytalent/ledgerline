import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { categorizeTransaction, meetsAutoPostThreshold } from "@/lib/agents/categorization-agent";

/**
 * POST /api/qbo/webhook
 *
 * Intuit calls this whenever a subscribed event happens (new/updated
 * transaction). The `intuit-signature` header is verified against
 * QBO_CLIENT_SECRET (technically the webhook "verifier token" Intuit
 * issues separately — see QBO_WEBHOOK_VERIFIER_TOKEN below) before the
 * payload is trusted. Without this, anyone who finds this URL could
 * post fake transaction events and get them auto-categorized/posted.
 *
 * Flow once verified:
 *   1. For each changed transaction, pull the full record from QBO.
 *   2. Run it through the categorization agent.
 *   3. Auto-post or drop into the review queue based on confidence.
 */
function isValidIntuitSignature(rawBody: string, signatureHeader: string | null): boolean {
  const verifierToken = process.env.QBO_WEBHOOK_VERIFIER_TOKEN;
  if (!verifierToken) {
    throw new Error(
      "QBO_WEBHOOK_VERIFIER_TOKEN is not set — required to verify Intuit webhook signatures."
    );
  }
  if (!signatureHeader) return false;

  const expected = crypto
    .createHmac("sha256", verifierToken)
    .update(rawBody)
    .digest("base64");

  const sigBuf = Buffer.from(signatureHeader);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expectedBuf);
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signatureHeader = req.headers.get("intuit-signature");

  if (!isValidIntuitSignature(rawBody, signatureHeader)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);

  for (const event of payload?.eventNotifications ?? []) {
    const realmId = event.realmId;

    const client = await prisma.client.findFirst({ where: { qboRealmId: realmId } });
    if (!client) continue;

    for (const entity of event.dataChangeEvent?.entities ?? []) {
      // In a real implementation: fetch full transaction details from
      // QBO using entity.id, then extract vendorName/amount/date below.
      const vendorName = "PLACEHOLDER_VENDOR";
      const amount = 0;

      const lookupMemory = async (clientId: string, vendor: string) => {
        const row = await prisma.correctionMemory.findUnique({
          where: { clientId_vendorName: { clientId, vendorName: vendor } },
        });
        if (!row) return null;
        return {
          clientId: row.clientId,
          vendorName: row.vendorName,
          correctCategory: row.correctCategory,
          jobOrCostCode: row.jobOrCostCode ?? undefined,
          timesConfirmed: row.timesConfirmed,
        };
      };

      const result = await categorizeTransaction(client.id, vendorName, amount, lookupMemory);

      await prisma.transaction.create({
        data: {
          clientId: client.id,
          qboTxnId: entity.id,
          vendorName,
          amount,
          txnDate: new Date(),
          suggestedCategory: result.suggestedCategory,
          confidence: result.confidence,
          reasoning: result.reasoning,
          status: meetsAutoPostThreshold(result.confidence) ? "AUTO_POSTED" : "PENDING",
          autoPosted: meetsAutoPostThreshold(result.confidence),
        },
      });
    }
  }

  return NextResponse.json({ received: true });
}
