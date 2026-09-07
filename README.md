# Ledgerline

AI-assisted bookkeeping review platform. See `docs/HANDOVER.md` for the
full project brief, architecture, phase plan, and open decisions before
you write another line of code.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in Supabase + QBO sandbox keys
npx prisma migrate dev
npm run prisma:seed          # loads sample firm/clients/transactions
psql $DATABASE_URL -f prisma/sql/rls_policies.sql   # after migrating, not before
npm run dev
```

Dashboard runs at `/dashboard`. Right now it renders with sample data
(see `components/queue/ReviewQueue.tsx` and `AgentActivityPanel.tsx`) —
wiring those to real Prisma queries is the Week 4 deliverable in the
handover doc's sprint plan.

## Where the logic lives

- `lib/agents/categorization-agent.ts` — the actual categorization
  decision logic and the correction-memory lookup that makes the agent
  "learn." Read this file first.
- `prisma/schema.prisma` — data model, including `CorrectionMemory`,
  which is the whole learning mechanism in Phase 1.
