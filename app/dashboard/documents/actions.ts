"use server";

import { prisma } from "@/lib/db";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function supabaseAdmin() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
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

  await prisma.document.create({
    data: { clientId, fileName: file.name, storagePath },
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
