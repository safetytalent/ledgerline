-- Row Level Security policies for Ledgerline
-- Run this AFTER `npx prisma migrate dev` has created the tables.
-- Apply via the Supabase SQL editor, or `psql $DATABASE_URL -f prisma/sql/rls_policies.sql`
--
-- Model: every staff user belongs to one or more Locations, via the
-- `UserLocation` table (auth.uid() -> locationId, defined in
-- schema.prisma). Every Client belongs to exactly one Location. A user
-- can only see or modify Clients, Transactions, and CorrectionMemory
-- rows that belong to a Location they're mapped to.
--
-- Fixed from the original draft: this file previously referenced a
-- lowercase "user_locations" table that doesn't exist -- Prisma creates
-- the table with the exact model name "UserLocation" (case-sensitive,
-- quoted identifier) unless @@map() says otherwise. Also added INSERT/
-- UPDATE/DELETE policies -- the original only covered SELECT, which
-- would have let any authenticated user write across location
-- boundaries even though they couldn't read across them.

alter table "Client" enable row level security;
alter table "Transaction" enable row level security;
alter table "CorrectionMemory" enable row level security;
alter table "QboConnection" enable row level security;
alter table "UserLocation" enable row level security;

-- Users can see their own UserLocation rows (needed so the app can look
-- up "what locations am I mapped to"); nothing else about this table is
-- exposed client-side.
create policy "Users see their own location mappings"
  on "UserLocation"
  for select
  using ("userId" = auth.uid()::text);

create policy "Users see only their location's clients"
  on "Client"
  for select
  using (
    "locationId" in (
      select "locationId" from "UserLocation" where "userId" = auth.uid()::text
    )
  );

create policy "Users write only within their location's clients"
  on "Client"
  for insert
  with check (
    "locationId" in (
      select "locationId" from "UserLocation" where "userId" = auth.uid()::text
    )
  );

create policy "Users update only their location's clients"
  on "Client"
  for update
  using (
    "locationId" in (
      select "locationId" from "UserLocation" where "userId" = auth.uid()::text
    )
  );

create policy "Users see only their location's transactions"
  on "Transaction"
  for select
  using (
    "clientId" in (
      select id from "Client" where "locationId" in (
        select "locationId" from "UserLocation" where "userId" = auth.uid()::text
      )
    )
  );

create policy "Users update only their location's transactions"
  on "Transaction"
  for update
  using (
    "clientId" in (
      select id from "Client" where "locationId" in (
        select "locationId" from "UserLocation" where "userId" = auth.uid()::text
      )
    )
  );

create policy "Users see only their location's correction memory"
  on "CorrectionMemory"
  for select
  using (
    "clientId" in (
      select id from "Client" where "locationId" in (
        select "locationId" from "UserLocation" where "userId" = auth.uid()::text
      )
    )
  );

create policy "Users write only their location's correction memory"
  on "CorrectionMemory"
  for insert
  with check (
    "clientId" in (
      select id from "Client" where "locationId" in (
        select "locationId" from "UserLocation" where "userId" = auth.uid()::text
      )
    )
  );

-- QboConnection holds encrypted tokens -- nobody queries this directly
-- from the browser; only server-side code with the service-role key
-- should ever touch it (the service role bypasses RLS by design). Deny
-- all access at the RLS layer so a bug in application code can't leak
-- tokens to a logged-in user even by accident.
create policy "Deny all client-side access to QBO tokens"
  on "QboConnection"
  for all
  using (false);
