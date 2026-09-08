"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseServer } from "@/lib/supabase/server";
import { sendEnvelopeForSignature } from "@/lib/docusign/client";

async function currentUserId(): Promise<string> {
  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? "unknown";
}

/**
 * Advances a FormInstance's internal review stage — the "Send for
 * preparer review" step in the status trail. This is a workflow
 * checkpoint, not the Rule 1 filing gate itself: the actual
 * "Approve & File" hard gate belongs to Phase K, once e-signature
 * (Phase J) exists to satisfy it. This step only unlocks "Send for
 * e-signature" further down the trail.
 */
export async function sendForPreparerReview(formInstanceId: string) {
  const userId = await currentUserId();
  if (userId === "unknown") {
    throw new Error("Preparer review requires a signed-in user.");
  }
  await prisma.approval.create({
    data: { userId, actionType: "PREPARER_REVIEW", recordId: formInstanceId },
  });
  revalidatePath("/dashboard/document-library");
}

/**
 * Phase J — sends a form for the client's actual e-signature via
 * DocuSign. This is the Rule 1 enforcement point for "Send for
 * e-signature": the check below is the real gate, not the disabled
 * button in the UI. A direct call to this action with no prior
 * PREPARER_REVIEW approval on record is rejected here, at the
 * server/database layer, exactly as Rule 1 requires.
 */
export async function sendForESignature(formInstanceId: string) {
  const priorApprovals = await prisma.approval.findMany({ where: { recordId: formInstanceId } });
  const reviewed = priorApprovals.some((a: (typeof priorApprovals)[number]) => a.actionType === "PREPARER_REVIEW");
  if (!reviewed) {
    throw new Error(
      "Rule 1: this form has no recorded preparer review. E-signature cannot be requested until a preparer has reviewed it."
    );
  }

  const instance = await prisma.formInstance.findUniqueOrThrow({
    where: { id: formInstanceId },
    include: { client: true, template: true },
  });

  if (!instance.client.contactEmail) {
    throw new Error(
      `${instance.client.name} has no contact email on file — add one before requesting a signature.`
    );
  }

  const fields = instance.fieldsData as unknown as { label: string; value: string }[];
  const documentText = [
    instance.template.name,
    `Client: ${instance.client.name}`,
    "",
    ...fields.map((f) => `${f.label}: ${f.value || "(blank)"}`),
  ].join("\n");

  const { envelopeId } = await sendEnvelopeForSignature({
    recipientEmail: instance.client.contactEmail,
    recipientName: instance.client.name,
    documentTitle: instance.template.name,
    documentText,
  });

  await prisma.formInstance.update({
    where: { id: formInstanceId },
    data: { docusignEnvelopeId: envelopeId },
  });

  revalidatePath("/dashboard/document-library");
}
