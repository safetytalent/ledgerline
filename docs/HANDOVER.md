# Ledgerline — Project Handover

**Owner:** Adrian Sierra
**Purpose:** AI-assisted bookkeeping platform for a Texas bookkeeping/accounting/tax agency, built for eventual franchise expansion.
**Status:** Pre-build. This handover gets a dev (human or Claude Code) from zero to a running Phase 1 slice.

---

## 1. What we're building (and what we're not, yet)

Building now (Phase 1): a review-queue dashboard where a rules-based agent
categorizes bank/credit-card transactions from QuickBooks Online, learns
from human corrections (per client), and surfaces low-confidence items for
a bookkeeper to approve. No LLM in the loop yet — that's Phase 3.

Not building yet: document extraction, reconciliation automation, client
communication agent, franchise royalty rollup. These are real Phase 2–4
scope — don't let Phase 1 scope creep toward them.

## 2. Tech stack and why

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript | Server components for data-heavy dashboard, matches Adrian's existing Next.js/Prisma/Supabase stack |
| Styling | Tailwind CSS | Fast to match the design tokens below; avoid a component kit (Shadcn/MUI) that pulls the UI back toward generic SaaS look |
| Database | PostgreSQL via Supabase | Matches existing stack; Row Level Security for multi-tenant client data |
| ORM | Prisma | Type-safe schema, easy migrations across franchise locations later |
| Auth | Supabase Auth | Multi-tenant: firm → location → staff → client roles |
| Accounting data | QuickBooks Online API (Xero later) | Start with one integration; QBO has better sandbox docs |
| Bank data | Comes through QBO's own bank feed — do NOT build a separate Plaid integration for Phase 1 | Avoids duplicating what QBO already syncs; revisit only if Xero-only clients need it |
| Background jobs | Supabase Edge Functions or a small worker (BullMQ + Redis) | Categorization runs async on new transaction webhooks |
| Hosting | Vercel (frontend) + Supabase (DB/auth) | Matches existing tooling, zero new ops overhead for Phase 1 |

## 3. Architecture (Phase 1 scope)

```
QuickBooks Online
      │  (webhook: new transaction)
      ▼
Ingestion function ──► Postgres: raw_transactions
      │
      ▼
Categorization Agent (rules + correction-memory lookup)
      │
      ├─ confidence ≥ threshold ──► auto-post to categorized_transactions, mark auto=true
      │
      └─ confidence < threshold ──► review_queue table
                                          │
                                          ▼
                                  Dashboard (bookkeeper reviews)
                                          │
                                          ▼
                              Correction saved ──► correction_memory table
                              (per client, per vendor)
```

**The "learning" mechanism, concretely:** every correction a human makes writes
a row to `correction_memory` (client_id, vendor_name, corrected_category,
confidence_boost). Next time that vendor appears for that client, the agent
checks this table before falling back to generic rules. This is a lookup
table, not a retrained model — cheap, explainable, auditable. LLM-based
disambiguation for genuinely novel vendors is Phase 3, gated behind a
confidence threshold so it never silently auto-posts.

## 4. Data model (see `prisma/schema.prisma`)

Core entities: `Firm` → `Location` → `Client` → `Transaction` →
`ReviewQueueItem` → `CorrectionMemory`. Franchise-specific tables
(`RoyaltyReport`, `LocationScorecard`) are stubbed but not built out —
that's Phase 4.

## 5. Repo structure

```
ledgerline/
├── app/
│   ├── dashboard/page.tsx       ← main review queue screen
│   ├── layout.tsx
│   └── globals.css              ← design tokens as CSS variables
├── components/
│   ├── nav/SideNav.tsx
│   ├── kpi/KpiStrip.tsx
│   ├── queue/ReviewQueue.tsx
│   ├── queue/TransactionCard.tsx
│   └── agent/AgentActivityPanel.tsx
├── lib/
│   ├── db.ts                    ← Prisma client singleton
│   └── agents/
│       ├── types.ts
│       └── categorization-agent.ts   ← core logic, currently stubbed with sample data
├── prisma/schema.prisma
├── .env.example
└── package.json
```

## 6. Design tokens (from the approved prototype — do not deviate without design review)

```
--ink:        #14213D   (nav/chrome background)
--paper:      #F6F4EF   (main content background)
--brass:      #B8862F   (needs-review accent)
--teal:       #1B4B43   (confirmed/high-confidence accent)
--rust:       #9B3A26   (flagged/anomaly accent)
Fonts: Fraunces (headings), IBM Plex Sans (body/UI), IBM Plex Mono (numbers, confidence %, timestamps)
```

Rationale: dense-ledger, financial-institution feel — deliberately not
another rounded-card SaaS look. Confidence is always shown as a bar +
percentage, never a red/yellow/green pill (too coarse, and it's the first
thing every competitor does).

## 7. Phase 1 sprint breakdown (4–6 weeks)

| Week | Deliverable |
|---|---|
| 1 | Repo setup, Supabase project, Prisma schema migrated, QBO sandbox app registered |
| 2 | QBO OAuth + webhook ingestion → `raw_transactions` table |
| 3 | Categorization agent (rules engine + correction-memory lookup), review queue population |
| 4 | Dashboard UI wired to real data (replace the static prototype's sample transactions) |
| 5 | Correction flow: bookkeeper edits a category → writes to `correction_memory` → confirms it's picked up on next matching transaction |
| 6 | Internal pilot on 2–3 real client files, measure auto-categorization rate and correction rate |

**Exit criteria for Phase 1:** ≥70% of transactions auto-categorized correctly
on the pilot clients without a human touch, every miss explainable (agent
shows its reasoning), zero silent wrong postings above the confidence
threshold.

## 8. Environment setup

```bash
git clone <repo>
cd ledgerline
npm install
cp .env.example .env.local   # fill in Supabase + QBO sandbox keys
npx prisma migrate dev
npm run dev
```

## 9. Open decisions before Phase 2 (need Adrian's sign-off, not engineering calls)

- Franchise attorney review of the FDD before any territory work touches the codebase (royalty tables can be built, but don't wire real billing until legal is final)
- Xero support: build now or wait for first Xero-only client to justify it?
- Confidence threshold for auto-post: start conservative (e.g., 85%) and tune down only after pilot data supports it
- Who has admin access to correction_memory across locations — corporate only, or can a franchisee's controller edit their own?

## 10. Security/compliance non-negotiables

- Every client's data isolated via Supabase Row Level Security — no cross-client queries possible even by bug
- QBO tokens encrypted at rest, refreshed server-side only, never exposed to the client browser
- No PTIN, SSN, or bank account numbers ever logged in plaintext (application logs or error tracking)
- Every auto-posted transaction retains an audit trail: what the agent saw, why it decided, and the confidence score — pull-able for 7 years per IRS recordkeeping norms
