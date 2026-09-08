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
 * Generates (or regenerates) a draft return's totals from this
 * client's APPROVED transactions for the given tax year. Always
 * lands in DRAFT status — this function can never itself produce a
 * PREPARER_APPROVED row. Regenerating an already-approved draft
 * resets it back to DRAFT, since the numbers changing means the
 * prior sign-off no longer applies to what's now on the page.
 */
export async function generateReturnDraft(clientId: string, taxYear: string) {
  const yearStart = new Date(`${taxYear}-01-01`);
  const yearEnd = new Date(`${Number(taxYear) + 1}-01-01`);

  const approved = await prisma.transaction.findMany({
    where: {
      clientId,
      reviewStatus: "APPROVED",
      txnDate: { gte: yearStart, lt: yearEnd },
    },
  });

  type Txn = (typeof approved)[number];
  const totalIncome = approved
    .filter((t: Txn) => t.txnType === "INCOME")
    .reduce((sum: number, t: Txn) => sum + Number(t.amount), 0);
  const totalExpenses = approved
    .filter((t: Txn) => t.txnType === "EXPENSE")
    .reduce((sum: number, t: Txn) => sum + Number(t.amount), 0);

  await prisma.taxReturnDraft.upsert({
    where: { clientId_taxYear: { clientId, taxYear } },
    create: {
      clientId,
      taxYear,
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
      status: "DRAFT",
    },
    update: {
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
      status: "DRAFT",
      preparerApprovedBy: null,
      preparerApprovedAt: null,
    },
  });

  revalidatePath("/dashboard/tax-returns");
}

/**
 * Rule 1 hard gate — the ONLY code path in the entire system that can
 * move a draft to PREPARER_APPROVED. There is no other function, no
 * direct Prisma call elsewhere, no admin shortcut that sets this
 * status. A named preparer must call this explicitly; the record of
 * who and when is permanent audit trail, not a UI checkbox.
 */
export async function recordPreparerSignoff(draftId: string) {
  const userId = await currentUserId();
  if (userId === "unknown") {
    throw new Error("Preparer sign-off requires a signed-in user — refusing to record an anonymous approval.");
  }

  await prisma.taxReturnDraft.update({
    where: { id: draftId },
    data: {
      status: "PREPARER_APPROVED",
      preparerApprovedBy: userId,
      preparerApprovedAt: new Date(),
    },
  });

  await prisma.approval.create({
    data: { userId, actionType: "PREPARER_REVIEW", recordId: draftId },
  });

  revalidatePath("/dashboard/tax-returns");
}
