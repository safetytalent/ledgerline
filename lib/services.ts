/**
 * The firm's full service catalog, straight from
 * Texas_Bookkeeping_Accounting_Tax_Agency_Operations_Guide.docx.
 *
 * This is a reference list for tagging which services a client is
 * signed up for — it is NOT a claim that all 50 are software-
 * automated. Today, only "Monthly Bookkeeping" has real automation
 * behind it (the transaction review queue). Everything else is
 * tracked here as a checklist so staff have one place to see a
 * client's full engagement, and each item can get its own dedicated
 * workflow built out over time.
 *
 * Grouped to match the document's own structure: bookkeeping/
 * accounting services, then business tax, then personal tax.
 */

export const SERVICE_CATEGORIES = [
  {
    category: "Bookkeeping & Accounting",
    services: [
      "New Client Bookkeeping Setup",
      "Monthly Bookkeeping",
      "Bank Reconciliation",
      "Credit Card Reconciliation",
      "Accounts Payable & Vendor Management",
      "Accounts Receivable, Billing & Collections",
      "Payroll Bookkeeping & Administration",
      "Contractor / 1099 Management",
      "Monthly Financial Close",
      "Monthly Financial Statements",
      "Management Reporting / KPI Dashboard",
      "Job Costing",
      "Staffing Company Bookkeeping",
      "Construction Bookkeeping",
      "Oil & Gas / Industrial Contractor Bookkeeping",
      "Bookkeeping Cleanup / Catch-Up",
      "Tax-Ready Bookkeeping",
      "Sales Tax Bookkeeping",
      "Fixed Asset Accounting",
      "Loan & Debt Accounting",
      "Cash-Flow Management",
      "Budgeting & Forecasting",
      "Fractional Controller Services",
      "Fractional CFO Services",
      "Fraud/Error Detection & Internal Controls",
      "CPA / Tax Professional Coordination",
      "Business Owner Monthly Financial Review",
      "Document Management",
    ],
  },
  {
    category: "Business Tax",
    services: [
      "Business Tax Preparation — New / One-Time Clients",
      "Business Tax Return Preparation",
      "Schedule C / Self-Employed Tax Preparation",
      "Tax-Return-Only Bookkeeping Cleanup",
      "Prior-Year / Delinquent Business Tax Returns",
      "Business Tax Extension Services",
      "Estimated Tax Planning",
    ],
  },
  {
    category: "Personal Tax",
    services: [
      "Personal / Individual Tax Preparation",
      "Family Tax Returns",
      "High-Income Individual Returns",
      "Independent Contractor / Gig Worker Returns",
      "Rental Property Tax Preparation",
      "Investment Tax Preparation",
      "Personal Tax Return Amendment / Cleanup",
      "Prior-Year Individual Tax Returns",
      "Tax Notice Support",
      "Personal Tax Planning",
    ],
  },
] as const;

export const ALL_SERVICES: string[] = SERVICE_CATEGORIES.flatMap((c) => [...c.services]);

// The one service with real software automation today.
export const AUTOMATED_SERVICES = new Set(["Monthly Bookkeeping"]);
