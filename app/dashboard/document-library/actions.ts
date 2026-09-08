"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseServer } from "@/lib/supabase/server";

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
