"use server";

import { prisma } from "@/lib/db";
import { createClient as createSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Server Actions backing the Review Queue buttons. Each one updates the
 * real Transaction row, writes to CorrectionMemory (so the same vendor
 * is categorized with higher confidence next time), and — per Phase A —
 * logs every human approval/correction to the audit tables that never
 * get bypassed: Approval on every posting decision, LearningLog on
 * every correction.
 */

async function currentUserId(): Promise<string> {
  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? "unknown";
}

export async function confirmTransaction(id: string) {
  const txn = await prisma.transaction.findUnique({ where: { id } });
  if (!txn) return;

  const userId = await currentUserId();

  await prisma.transaction.update({
    where: { id },
    data: {
      reviewStatus: "APPROVED",
      finalCategory: txn.suggestedCategory,
    },
  });

  await prisma.approval.create({
    data: { userId, actionType: "POST", recordId: id },
  });

  if (txn.suggestedCategory) {
    await prisma.correctionMemory.upsert({
      where: { clientId_vendorName: { clientId: txn.clientId, vendorName: txn.vendorName } },
      create: {
        clientId: txn.clientId,
        vendorName: txn.vendorName,
        correctCategory: txn.suggestedCategory,
        timesConfirmed: 1,
      },
      update: {
        correctCategory: txn.suggestedCategory,
        timesConfirmed: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });
  }

  revalidatePath("/dashboard");
}

export async function recodeTransaction(id: string, newCategory: string) {
  const txn = await prisma.transaction.findUnique({ where: { id } });
  if (!txn || !newCategory.trim()) return;

  const userId = await currentUserId();
  const trimmed = newCategory.trim();

  await prisma.transaction.update({
    where: { id },
    data: {
      reviewStatus: "APPROVED",
      finalCategory: trimmed,
    },
  });

  await prisma.approval.create({
    data: { userId, actionType: "POST", recordId: id },
  });

  // This is a real correction — the agent suggested one category, a
  // human picked a different one. Log it to the Learning Log so
  // firm-wide correction patterns can be reviewed later.
  await prisma.learningLog.create({
    data: {
      userId,
      recordId: id,
      fromValue: txn.suggestedCategory,
      toValue: trimmed,
      reasonCode: "wrong_category",
    },
  });

  await prisma.correctionMemory.upsert({
    where: { clientId_vendorName: { clientId: txn.clientId, vendorName: txn.vendorName } },
    create: {
      clientId: txn.clientId,
      vendorName: txn.vendorName,
      correctCategory: trimmed,
      timesConfirmed: 1,
    },
    update: {
      correctCategory: trimmed,
      timesConfirmed: { increment: 1 },
      lastUsedAt: new Date(),
    },
  });

  revalidatePath("/dashboard");
}

// Marks the transaction as escalated to the client for clarification —
// it stays pending_review (a human still hasn't posted it) but the
// separate escalatedToClient flag keeps it visibly distinct in the
// Agent Activity feed.
export async function askClient(id: string) {
  await prisma.transaction.update({
    where: { id },
    data: { reviewStatus: "PENDING_REVIEW", escalatedToClient: true },
  });
  revalidatePath("/dashboard");
}
