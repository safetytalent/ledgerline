"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

/**
 * Server Actions backing the Review Queue buttons. Each one updates the
 * real Transaction row and (for confirm/recode) teaches the correction
 * memory table, so the same vendor is categorized with higher confidence
 * next time — the actual "learning" behind the Agent Activity feed.
 */

export async function confirmTransaction(id: string) {
  const txn = await prisma.transaction.findUnique({ where: { id } });
  if (!txn) return;

  await prisma.transaction.update({
    where: { id },
    data: {
      status: "CONFIRMED",
      finalCategory: txn.suggestedCategory,
    },
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

  await prisma.transaction.update({
    where: { id },
    data: {
      status: "RECODED",
      finalCategory: newCategory.trim(),
    },
  });

  await prisma.correctionMemory.upsert({
    where: { clientId_vendorName: { clientId: txn.clientId, vendorName: txn.vendorName } },
    create: {
      clientId: txn.clientId,
      vendorName: txn.vendorName,
      correctCategory: newCategory.trim(),
      timesConfirmed: 1,
    },
    update: {
      correctCategory: newCategory.trim(),
      timesConfirmed: { increment: 1 },
      lastUsedAt: new Date(),
    },
  });

  revalidatePath("/dashboard");
}

// Stub for Phase 2 — will actually email/message the client. For now it
// just marks the transaction as escalated so it's visibly out of the
// normal queue instead of silently sitting at PENDING.
export async function askClient(id: string) {
  await prisma.transaction.update({
    where: { id },
    data: { status: "ESCALATED" },
  });
  revalidatePath("/dashboard");
}
