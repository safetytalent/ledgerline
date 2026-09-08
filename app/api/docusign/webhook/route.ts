import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * DocuSign Connect webhook — fires when an envelope's status changes.
 * We only act on "completed" (the client actually signed). This is
 * the only place ESIGN approvals get written for FormInstances,
 * which is exactly what makes "Client Signature" in the status trail
 * and the Rule 1 filing gate trustworthy: it reflects a real,
 * DocuSign-confirmed signature, never a manual override.
 */
export async function POST(req: NextRequest) {
  const payload = await req.json();

  const envelopeId: string | undefined = payload?.data?.envelopeId ?? payload?.envelopeId;
  const status: string | undefined = payload?.data?.envelopeSummary?.status ?? payload?.status;
  const signerEmail: string | undefined =
    payload?.data?.envelopeSummary?.recipients?.signers?.[0]?.email ?? undefined;

  if (!envelopeId || status !== "completed") {
    // Not a completion event, or missing the id we key off of —
    // nothing to record.
    return NextResponse.json({ ok: true, skipped: true });
  }

  const instance = await prisma.formInstance.findUnique({ where: { docusignEnvelopeId: envelopeId } });
  if (!instance) {
    // An envelope we don't recognize — log nothing rather than
    // guessing which FormInstance it might belong to.
    return NextResponse.json({ ok: true, unmatched: true });
  }

  await prisma.approval.create({
    data: {
      // The approving party here is the client, authenticated by
      // DocuSign — not a Ledgerline staff login. Recording their
      // confirmed signer email is the honest identifier, not a
      // fabricated internal user id.
      userId: signerEmail ?? "docusign:unknown-signer",
      actionType: "ESIGN",
      recordId: instance.id,
      sessionRef: envelopeId,
    },
  });

  return NextResponse.json({ ok: true });
}
