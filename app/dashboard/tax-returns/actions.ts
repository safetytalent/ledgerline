"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseServer } from "@/lib/supabase/server";
import { totalVerifiedIncome } from "@/lib/agents/personal-return-agent";

async function currentUserId(): Promise<string> {
  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? "unknown";
}

/**
 * Generates (or regenerates) a draft return's totals for the given
 * tax year. Income comes from two sources, both required for this
 * to be complete: whatever's been approved in QuickBooks, plus
 * whatever income a human has VERIFIED off uploaded documents (a
 * P&L, W-2s, 1099s — this is what makes the draft real for a
 * document-only client with no QuickBooks connection at all).
 * Expenses stay QuickBooks-only for now — classifying an expense
 * correctly from a plain document read is riskier than income, so
 * that stays a preparer's manual entry until there's a safer way to
 * source it. Always lands in DRAFT status — this function can never
 * itself produce a PREPARER_APPROVED row. Regenerating an
 * already-approved draft resets it back to DRAFT, since the numbers
 * changing means the prior sign-off no longer applies to what's now
 * on the page.
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
  const qboIncome = approved
    .filter((t: Txn) => t.txnType === "INCOME")
    .reduce((sum: number, t: Txn) => sum + Number(t.amount), 0);
  const totalExpenses = approved
    .filter((t: Txn) => t.txnType === "EXPENSE")
    .reduce((sum: number, t: Txn) => sum + Number(t.amount), 0);

  const documentIncome = await totalVerifiedIncome(clientId, taxYear);
  const totalIncome = qboIncome + documentIncome;

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
 * Personal Return Draft Agent. Same DRAFT-only guarantee as the
 * business version above — this can never itself produce a
 * PREPARER_APPROVED row, and it only ever sums income a human has
 * already verified off uploaded documents. No deductions, no
 * credits, no filing status — those stay a preparer's call.
 */
export async function generatePersonalReturnDraft(clientId: string, taxYear: string) {
  const totalIncome = await totalVerifiedIncome(clientId, taxYear);

  await prisma.taxReturnDraft.upsert({
    where: { clientId_taxYear: { clientId, taxYear } },
    create: {
      clientId,
      taxYear,
      totalIncome,
      totalExpenses: 0,
      netIncome: totalIncome,
      status: "DRAFT",
    },
    update: {
      totalIncome,
      totalExpenses: 0,
      netIncome: totalIncome,
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
