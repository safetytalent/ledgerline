# Ledgerline — Instructions for Claude Code

Read `docs/HANDOVER.md` in full before making architectural changes. It has
the tech stack rationale, data model, phase plan, and open decisions —
don't re-derive these from scratch each session.

## Non-negotiables (don't change without flagging to Adrian first)

- No LLM calls in the categorization path yet — Phase 1 is rules +
  `CorrectionMemory` lookup only. Adding an LLM here is Phase 3 scope.
- Auto-post threshold is `AUTO_POST_CONFIDENCE_THRESHOLD` in `.env` —
  never hardcode a different number in code.
- Every transaction that auto-posts must retain `reasoning` — no silent
  auto-posts, ever, even in test/seed data.
- Design tokens live in `tailwind.config.ts` — don't introduce new colors
  or fonts outside that palette without checking `docs/HANDOVER.md` §6.
- Client data isolation is via Supabase Row Level Security, not
  application-level filtering — any new table needs RLS policies before
  it ships, not after.

## Current phase

Phase 1 (see HANDOVER.md §7 for the week-by-week plan). Do not build
document extraction, reconciliation automation, the client communication
agent, or franchise royalty rollup yet — those are Phase 2–4. If a task
seems to need them, stop and ask rather than expanding scope.

## Where things stand right now

- Dashboard UI is built and matches the approved design (`components/`),
  currently rendering sample data.
- `lib/agents/categorization-agent.ts` has real decision logic and is
  wired into the webhook route.
- **Fixed (this session):** the three items previously listed here as
  blockers are done:
  - Webhook now verifies Intuit's `intuit-signature` header (HMAC-SHA256
    against `QBO_WEBHOOK_VERIFIER_TOKEN`) before trusting any payload —
    see `app/api/qbo/webhook/route.ts`.
  - QBO OAuth tokens are encrypted (AES-256-GCM) before they touch the
    database — see `lib/crypto.ts`, used in `app/api/qbo/callback/route.ts`.
    Requires `ENCRYPTION_KEY` in the environment (see `.env.example`).
  - The OAuth `state` param is now HMAC-signed (`lib/qbo/state.ts`) so a
    guessed/forged client id can't hijack the callback.
  - `prisma/sql/rls_policies.sql` was fixed to reference the actual
    `UserLocation` table (the original draft pointed at a nonexistent
    `user_locations` table — it would have failed to apply, or worse,
    silently protected nothing) and now covers INSERT/UPDATE, not just
    SELECT.
- **Still TODO before onboarding a real paying client:** none of this has
  been run against a live Supabase project or a real QBO sandbox
  connection yet. Test the full OAuth → webhook → categorization →
  dashboard flow end-to-end in sandbox before flipping `QBO_ENVIRONMENT`
  to production for any client. Also do a fresh `npm audit` and dependency
  bump before launch — this scaffold's dependency versions haven't been
  revisited since the original handover.
- `prisma/seed.ts` gives you one firm, one location, two clients, and
  two sample transactions matching the dashboard's story — run
  `npm run prisma:seed` after migrating.

## Commands

```bash
npm run dev              # local dev server
npx prisma migrate dev   # after any schema.prisma change
npx prisma studio        # inspect the DB visually
```

## When you finish a working session

Update the "Where things stand right now" section above before ending,
so the next session (or Adrian) doesn't have to reconstruct it from git
history.
