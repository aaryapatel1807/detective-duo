-- Detective Duo v2 — Phase 3: "Leave her a case" inbox.
-- One player picks a case from the bank + an optional note; it appears
-- in the OTHER account's home "Left for you" slot. No names are stored:
-- the app shows the generic label "from your partner".
-- Apply in the Supabase SQL editor (like the Phase 1 migration).

create table if not exists public.left_cases (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users (id) on delete cascade,
  case_id text not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  seen_at timestamptz
);

alter table public.left_cases enable row level security;

-- Inbox: a user reads everyone else's cases, never their own.
create policy "left_cases: read others" on public.left_cases
  for select using (from_user <> auth.uid());
-- Sending: you can only send as yourself.
create policy "left_cases: insert own" on public.left_cases
  for insert with check (from_user = auth.uid());
-- Opening: the recipient marks their inbox items seen.
create policy "left_cases: update others" on public.left_cases
  for update using (from_user <> auth.uid()) with check (from_user <> auth.uid());
