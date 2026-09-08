"use server";

import { prisma } from "@/lib/db";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { createClient as createSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { extractDocumentFields, type ExtractedField } from "@/lib/agents/intake-agent";

function supabaseAdmin() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function currentUserId(): Promise<string> {
  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? "unknown";
}

export async function uploadDocument(clientId: string, formData: FormData) {
  const file = formData.get("file") as File;
  if (!file || file.size === 0) return;

  const storagePath = `${clientId}/${Date.now()}-${file.name}`;
  const bytes = await file.arrayBuffer();

  const { error } = await supabaseAdmin()
    .storage.from("documents")
    .upload(storagePath, bytes, { contentType: file.type });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const doc = await prisma.document.create({
    data: { clientId, fileName: file.name, storagePath },
  });

  // Intake Agent: kick off AI extraction right away so a bookkeeper
  // never has to remember a separate step. Best-effort — a failed
  // extraction never blocks the upload itself; it just leaves the
  // document at FAILED for someone to retry or fill in by hand.
  extractDocumentFields(doc.id).catch(() => {});

  revalidatePath("/dashboard/documents");
}

export async function retryExtraction(documentId: string) {
  await extractDocumentFields(documentId);
  revalidatePath("/dashboard/documents");
}

/**
 * Reads every document for a client that hasn't been successfully
 * read yet (NOT_EXTRACTED — usually because it was uploaded before
 * this feature existed — or FAILED). Fires them all at once rather
 * than waiting on each one in turn — awaiting ten documents
 * sequentially in a single request risks exceeding the server's
 * execution time limit and erroring out. Refresh the page after a
 * few seconds to see each one's status update as it finishes.
 */
export async function retryAllExtractionsForClient(clientId: string) {
  const stuck = await prisma.document.findMany({
    where: { clientId, extractionStatus: { in: ["NOT_EXTRACTED", "FAILED"] } },
    select: { id: true },
  });

  for (const doc of stuck) {
    extractDocumentFields(doc.id).catch(() => {});
  }

  revalidatePath("/dashboard/documents");
  revalidatePath(`/dashboard/clients/${clientId}`);
}

/**
 * The human checkpoint: a bookkeeper reviews what the Intake Agent
 * read off the document, corrects anything wrong, and confirms it.
 * Only after this call does the document's data count as verified —
 * nothing upstream may treat AI-extracted, unverified fields as fact.
 */
export async function verifyExtraction(documentId: string, fields: ExtractedField[]) {
  const userId = await currentUserId();
  if (userId === "unknown") {
    throw new Error("Verifying extracted data requires a signed-in user.");
  }

  await prisma.document.update({
    where: { id: documentId },
    data: {
      extractedFields: fields,
      extractionStatus: "VERIFIED",
      verifiedBy: userId,
      verifiedAt: new Date(),
    },
  });

  await prisma.approval.create({
    data: { userId, actionType: "VERIFY_EXTRACTION", recordId: documentId },
  });

  revalidatePath("/dashboard/documents");
}

export async function getDocumentUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabaseAdmin()
    .storage.from("documents")
    .createSignedUrl(storagePath, 60 * 10); // 10-minute link

  if (error) throw new Error(`Could not create link: ${error.message}`);
  return data.signedUrl;
}

export async function deleteDocument(id: string, storagePath: string) {
  await supabaseAdmin().storage.from("documents").remove([storagePath]);
  await prisma.document.delete({ where: { id } });
  revalidatePath("/dashboard/documents");
}
