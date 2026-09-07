/**
 * Required tax documents per entity type. This is the checklist logic
 * that keeps every filing type correctly categorized — an S-corp
 * needs K-1s and officer comp records, a sole prop needs neither.
 *
 * This is NOT a substitute for a preparer's judgment — it's the
 * "make sure nothing is missing before a human starts the return"
 * layer. Every item here still gets reviewed by whoever holds the
 * PTIN before anything is filed.
 */

export type EntityType = "S_CORP" | "C_CORP" | "PARTNERSHIP" | "SOLE_PROP" | "INDIVIDUAL";

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  S_CORP: "S-Corp",
  C_CORP: "C-Corp",
  PARTNERSHIP: "Partnership / Multi-Member LLC",
  SOLE_PROP: "Sole Proprietor / Single-Member LLC",
  INDIVIDUAL: "Individual / Personal Tax",
};

// Whether this entity type issues K-1s at all.
export const ISSUES_K1: Record<EntityType, boolean> = {
  S_CORP: true,
  C_CORP: false,
  PARTNERSHIP: true,
  SOLE_PROP: false,
  INDIVIDUAL: false,
};

const COMMON_DOCS = [
  "Profit & Loss Statement",
  "Balance Sheet",
  "Prior-Year Tax Return",
  "Bank & Credit Card Statements (12 months)",
];

const PAYROLL_DOCS = [
  "Form 940 (Annual FUTA)",
  "Form 941 (Quarterly, all 4 quarters)",
  "W-2s (all employees)",
  "1099-NEC (all contractors)",
];

const REQUIRED_DOCS: Record<EntityType, string[]> = {
  S_CORP: [
    ...COMMON_DOCS,
    ...PAYROLL_DOCS,
    "Officer Compensation Records",
    "Shareholder Distribution Records",
    "Depreciation Schedule / Fixed Asset List",
    "Shareholder Basis Worksheet (prior year)",
  ],
  PARTNERSHIP: [
    ...COMMON_DOCS,
    ...PAYROLL_DOCS,
    "Partnership / Operating Agreement",
    "Partner Capital Account Statements",
    "Guaranteed Payments Records",
    "Depreciation Schedule / Fixed Asset List",
  ],
  C_CORP: [
    ...COMMON_DOCS,
    ...PAYROLL_DOCS,
    "Officer Compensation Records",
    "Dividend Distribution Records",
    "Depreciation Schedule / Fixed Asset List",
  ],
  SOLE_PROP: [
    "Profit & Loss Statement",
    "1099-NEC / 1099-K Received",
    "Mileage Log (if claiming vehicle expense)",
    "Home Office Details (if applicable)",
    "Prior-Year Tax Return",
  ],
  INDIVIDUAL: [
    "Prior-Year Tax Return",
    "W-2s (all employers)",
    "1099-NEC / 1099-MISC / 1099-K (if self-employed or gig work)",
    "1099-INT / 1099-DIV (interest & dividends)",
    "1099-B (investment sales, if applicable)",
    "K-1s Received (from any partnership/S-corp ownership)",
    "Mortgage Interest Statement (Form 1098)",
    "Property Tax Records",
    "Childcare / Dependent Care Records",
    "Student Loan Interest Statement (Form 1098-E)",
    "Health Insurance Marketplace Statement (Form 1095-A, if applicable)",
    "Charitable Donation Receipts",
    "Estimated Tax Payments Made (if any)",
  ],
};

export function getRequiredDocs(entityType: EntityType): string[] {
  return REQUIRED_DOCS[entityType];
}
