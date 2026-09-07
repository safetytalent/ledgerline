import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { categorizeTransaction, meetsAutoPostThreshold } from "@/lib/agents/categorization-agent";
import { fetchEntityById, extractTransactionFields, refreshAccessToken } from "@/lib/qbo/client";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

/**
 * POST /api/qbo/webhook
 *
 * Intuit calls this whenever a subscribed event happens (new/updated
 * transaction). The `intuit-signature` header is verified against
 * QBO_WEBHOOK_VERIFIER_TOKEN before the payload is trusted.
 *
 * Flow:
 *   1. For each changed transaction, get a valid access token
 *      (refreshing it first if it's expired).
 *   2. Pull the real transaction from QBO (real vendor/amount/date —
 *      no more placeholder data).
 *   3. Run it through the categorization agent.
 *   4. Auto-post or drop into the review queue based on confidence.
 *
 * Handles Purchase and Bill entity types fully. Other types (Deposit,
 * Invoice, etc.) are recorded with a generic label rather than guessed
 * at — see extractTransactionFields in lib/qbo/client.ts.
 */
function isValidIntuitSignature(rawBody: string, signatureHeader: string | null): boolean {
  const verifierToken = process.env.QBO_WEBHOOK_VERIFIER_TOKEN;
  if (!verifierToken) {
    throw new Error(
      "QBO_WEBHOOK_VERIFIER_TOKEN is not set — required to verify Intuit webhook signatures."
    );
  }
  if (!signatureHeader) return false;

  const expected = crypto.createHmac("sha256", verifierToken).update(rawBody).digest("base64");

  const sigBuf = Buffer.from(signatureHeader);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expectedBuf);
}

/**
 * Returns a valid, decrypted access token for a client — refreshing
 * and re-saving it first if the stored one has expired. QBO access
 * tokens are short-lived (about 1 hour), so this will run often.
 */
async function getValidAccessToken(clientId: string): Promise<string | null> {
  const conn = await prisma.qboConnection.findUnique({ where: { clientId } });
  if (!conn) return null;

  if (conn.expiresAt > new Date()) {
    return decryptSecret(conn.accessToken);
  }

  const refreshToken = decryptSecret(conn.refreshToken);
  const tokens = await refreshAccessToken(refreshToken);

  await prisma.qboConnection.update({
    where: { clientId },
    data: {
      accessToken: encryptSecret(tokens.access_token),
      refreshToken: encryptSecret(tokens.refresh_token),
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    },
  });

  return tokens.access_token;
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

    const accessToken = await getValidAccessToken(client.id);
    if (!accessToken) continue; // no connection on file for this client

    for (const entity of event.dataChangeEvent?.entities ?? []) {
      const entityType = entity.name; // e.g. "Purchase", "Bill", "Deposit"

      let vendorName: string;
      let amount: number;
      let txnDate: Date;

      try {
        const raw = await fetchEntityById(realmId, accessToken, entityType, entity.id);
        if (!raw) continue;
        ({ vendorName, amount, txnDate } = extractTransactionFields(entityType, raw));
      } catch {
        // If QBO's API call fails for this one entity, skip it rather
        // than saving a fabricated placeholder row.
        continue;
      }

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
      const autoPost = meetsAutoPostThreshold(result.confidence);

      const txn = await prisma.transaction.upsert({
        where: { qboTxnId: entity.id },
        create: {
          clientId: client.id,
          qboTxnId: entity.id,
          vendorName,
          amount,
          txnDate,
          suggestedCategory: result.suggestedCategory,
          confidenceScore: result.confidence,
          reasoning: result.reasoning,
          reviewStatus: autoPost ? "AUTO_POSTED" : "PENDING_REVIEW",
        },
        update: {
          vendorName,
          amount,
          txnDate,
          suggestedCategory: result.suggestedCategory,
          confidenceScore: result.confidence,
          reasoning: result.reasoning,
        },
      });

      // Phase A: every auto-post is still a logged approval event —
      // the system is the actor, but it's recorded the same way a
      // human approval would be, for the audit trail.
      if (autoPost) {
        await prisma.approval.create({
          data: { userId: "system", actionType: "POST", recordId: txn.id },
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
