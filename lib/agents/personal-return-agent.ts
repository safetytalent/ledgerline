import { prisma } from "@/lib/db";
import type { ExtractedField } from "@/lib/agents/intake-agent";

/**
 * Personal Return Draft Agent — per the ops spec: drafts a personal
 * return from intake data, always pending a preparer's review before
 * e-file (the same Rule 1 gate the business Workpaper Agent uses;
 * recordPreparerSignoff in tax-returns/actions.ts is the ONE path to
 * PREPARER_APPROVED regardless of which agent generated the draft).
 *
 * This only sums what the Intake Agent has already read and a human
 * has VERIFIED off uploaded documents (W-2s, 1099s, etc.) — it never
 * invents a number, and it never touches deductions, credits, or
 * filing status, which the ops spec explicitly reserves for a
 * credentialed preparer's judgment.
 */

const INCOME_LABEL_KEYWORDS = ["wages", "income", "compensation", "tips", "salary", "nonemployee"];

function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[^0-9.\-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function isIncomeField(label: string): boolean {
  const lower = label.toLowerCase();
  return INCOME_LABEL_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Sums every income-labeled field from this client's VERIFIED
 * documents uploaded during the given tax year. Returns 0 if
 * nothing's been verified yet — never a guess.
 */
export async function totalVerifiedIncome(clientId: string, taxYear: string): Promise<number> {
  const yearStart = new Date(`${taxYear}-01-01`);
  const yearEnd = new Date(`${Number(taxYear) + 1}-01-01`);

  const docs = await prisma.document.findMany({
    where: {
      clientId,
      extractionStatus: "VERIFIED",
      uploadedAt: { gte: yearStart, lt: yearEnd },
    },
  });

  let total = 0;
  for (const doc of docs) {
    const fields = (doc.extractedFields as unknown as ExtractedField[] | null) ?? [];
    for (const f of fields) {
      if (isIncomeField(f.label)) total += parseAmount(f.value);
    }
  }
  return total;
}
