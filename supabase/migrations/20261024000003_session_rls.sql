-- Detective Duo v2 — Phase 3: tighten game_sessions RLS.
-- The Phase 1 policy let any signed-in user read/write any session.
-- This keeps reads open (a guest must read a lobby row by code to join
-- it) but restricts writes:
--   insert: the row must already list the caller as a player
--   update: the old row must be a lobby OR list the caller, and the new
--           row must list the caller (so a guest joining a lobby can
--           add themselves, but nobody can rewrite a live game they
--           are not playing in).
-- Honest caveat, documented: room codes are the only secret here, and
-- 4-letter codes are guessable — this is a cozy two-person app, not a
-- vault. The code is never shown publicly by the app.
-- Apply in the Supabase SQL editor (like the Phase 1 migration).

drop policy if exists "sessions: signed-in insert" on public.game_sessions;
drop policy if exists "sessions: signed-in update" on public.game_sessions;

create policy "sessions: member insert" on public.game_sessions
  for insert with check (
    players @> jsonb_build_array(jsonb_build_object('uid', auth.uid()::text))
  );

create policy "sessions: member update" on public.game_sessions
  for update
  using (
    (state ->> 'status' = 'lobby')
    or (players @> jsonb_build_array(jsonb_build_object('uid', auth.uid()::text)))
  )
  with check (
    players @> jsonb_build_array(jsonb_build_object('uid', auth.uid()::text))
  );
