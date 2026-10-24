-- Phase 6 guest restore (WRITE ONLY — DO NOT APPLY without Aarya's decision).
--
-- Problem: a signed-out guest plays a room fine over broadcast, but the
-- game_sessions row is unreadable/unwritable with the anon key (reads
-- require the `authenticated` role; writes require auth.uid() in the
-- players list). So a guest who refreshes loses the room, and a guest
-- who starts a game cannot persist it — a signed-in member's client
-- saves it for them instead.
--
-- This migration would let the anon role read and write game_sessions
-- rows. That restores guest refresh-restore, but it also means ANYONE
-- with a room code can read and write that room's row — the 4-letter
-- code becomes the only secret. That is the trade-off Aarya must accept
-- before anyone runs this.
--
-- To apply (only on his word): paste into the Supabase dashboard SQL
-- editor and run. To roll back: drop the two guest policies.
-- Never weaken the email-login flow for hosts/accounts; this changes
-- only the game_sessions table policies.

-- Guests (anon role) may read any session row, so a refresh restores.
CREATE POLICY "guest read sessions"
  ON public.game_sessions FOR SELECT
  TO anon
  USING (true);

-- Guests may insert/update session rows, so a guest-started game saves.
CREATE POLICY "guest write sessions"
  ON public.game_sessions FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
