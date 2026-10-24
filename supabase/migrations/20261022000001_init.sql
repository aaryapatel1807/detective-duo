-- Detective Duo v2 — Phase 1 schema.
-- Auth is Supabase Auth (email + password). All app data is per-user and
-- locked down with row level security: a user only ever sees their own rows.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  theme text not null default 'noir' check (theme in ('noir', 'candy', 'midnight', 'sunny')),
  created_at timestamptz not null default now()
);

create table if not exists public.progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  game text not null,
  current_level int not null default 1,
  stars jsonb not null default '{}'::jsonb,
  hints_used int not null default 0,
  mistakes int not null default 0,
  last_played_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, game)
);

-- Generic session store for together mode (Phase 3). Created now so the
-- realtime layer can be built on it without a later migration scramble.
create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique,
  game text not null,
  seed text not null,
  state jsonb not null default '{}'::jsonb,
  players jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.progress enable row level security;
alter table public.game_sessions enable row level security;

-- profiles: own row only.
create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles: insert own" on public.profiles
  for insert with check (auth.uid() = id);

-- progress: own rows only.
create policy "progress: read own" on public.progress
  for select using (auth.uid() = user_id);
create policy "progress: insert own" on public.progress
  for insert with check (auth.uid() = user_id);
create policy "progress: update own" on public.progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "progress: delete own" on public.progress
  for delete using (auth.uid() = user_id);

-- game_sessions: Phase 3 will scope this by room membership. For now any
-- signed-in user can read/write sessions (rooms are shared by 4-letter code,
-- and together mode is a two-person private feature). Tighten in Phase 3.
create policy "sessions: signed-in read" on public.game_sessions
  for select using (auth.role() = 'authenticated');
create policy "sessions: signed-in insert" on public.game_sessions
  for insert with check (auth.role() = 'authenticated');
create policy "sessions: signed-in update" on public.game_sessions
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Create a profile row automatically when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
