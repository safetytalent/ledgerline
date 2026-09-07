import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { processQboEntity } from "@/lib/agents/process-transaction";
import { getValidAccessToken } from "@/lib/qbo/access-token";

/**
 * POST /api/qbo/webhook
 *
 * Intuit calls this whenever a subscribed event happens (new/updated
 * transaction). The `intuit-signature` header is verified against
 * QBO_WEBHOOK_VERIFIER_TOKEN before the payload is trusted.
 *
 * The actual categorization/Rule-2/auto-post/audit-log pipeline lives
 * in lib/agents/process-transaction.ts — shared with the pull-sync
 * endpoint at /api/qbo/sync, so there's one decision path, not two.
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
      await processQboEntity(client.id, realmId, accessToken, entity.name, entity.id);
    }
  }

  return NextResponse.json({ received: true });
}
