# Detective Duo v2

A cozy, solo-first puzzle and mystery app. Open it when bored, clear a
level, earn stars. No points races, no leaderboards — just levels and
stars, and hints that are always free.

**Status: Phase 1 (branch `v2`).** Foundation + one complete game.
Production still runs v1 from `main`; v2 swaps in at a later checkpoint.

## What's here

- **Logic Grids** — the complete first game. Endless generated ladder
  (Easy 1–10, Medium 11–30, Hard 31–60, Expert 61+), every puzzle
  solver-verified to have exactly one solution. Free hints, gentle
  checking, 1–3 stars per level.
- **Theme system** — every colour, font, radius and shadow is a token.
  Two complete themes ship: **Noir** (warm dark, amber, Fraunces) and
  **Candy** (cream, pastel, Baloo 2). Switch instantly in Settings,
  with a live preview before you confirm. Adding a theme = one new
  entry in `lib/themes.ts`.
- **Accounts** — Supabase email + password, persistent sessions.
  Progress (levels, stars) syncs per account; a local cache keeps the
  app playable offline after load.
- **Home shell** — Continue, Surprise me, six game tiles, honest
  "arriving in Phase 2/3" placeholders for the Daily Desk, together
  mode and the "Left for you" inbox.

## Run it

```bash
npm install
cp .env.local.example .env.local   # fill in Supabase URL + anon key
npm run dev
```

Without `.env.local` the app still runs in local-only mode (no sign-in,
progress on this device only).

Database: apply `supabase/migrations/` to the Supabase project (SQL
editor or `supabase db push`).

## Tests

```bash
npm test        # includes the 500-puzzle uniqueness proof (~50s)
npm run build
```

## Layout

- `app/` — routes: `/`, `/login`, `/signup`, `/settings`, `/play/logic-grids`
- `lib/generators/logicGrid.ts` — pure seeded generator + solver
- `lib/themes.ts` — the theme token source of truth
- `lib/progress.ts` — progress store (Supabase + localStorage cache)
- `lib/supabase/client.ts` — browser client
- `supabase/migrations/` — schema + row level security
