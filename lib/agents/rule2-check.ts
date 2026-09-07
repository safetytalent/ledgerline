/**
 * Rule 2 categories (per the Ledgerline operations guide's Do-Not list):
 * equity, owner draws, loans, payroll liabilities, and tax filings must
 * never auto-post regardless of confidence score — always human review.
 *
 * Today's categorization agent assigns a free-text category label, not
 * a live QuickBooks account reference, so this checks the category text
 * itself. This is a real, working safeguard against the categories
 * we're most likely to see in text form. A stronger version — checking
 * the actual QuickBooks account type on the transaction's GL line —
 * would catch anything worded differently, but requires pulling account
 * references per line item, which the agent doesn't do yet.
 */

const RULE_2_KEYWORDS = [
  "owner draw",
  "owner's draw",
  "member draw",
  "owner contribution",
  "owner's contribution",
  "capital contribution",
  "paid-in capital",
  "distribution",
  "equity",
  "retained earnings",
  "loan payable",
  "notes payable",
  "payroll liabilit",
  "payroll tax payable",
  "estimated tax payment",
  "tax filing",
];

export function touchesRuleTwoCategory(category: string | null | undefined): boolean {
  if (!category) return false;
  const lower = category.toLowerCase();
  return RULE_2_KEYWORDS.some((kw) => lower.includes(kw));
}
