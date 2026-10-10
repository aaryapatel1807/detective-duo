# Detective Duo 🕵️

A two-player noir-detective games hub. Corkboard lobby, manila case folders,
red strings, brass pins, wax-sealed love notes — built for two detectives,
zero witnesses.

## Run it

```bash
npm install

# terminal 1 — realtime uplink (socket.io, :4001)
npm run socket

# terminal 2 — the app
npm run dev
```

Open http://localhost:3000 in **two tabs** (or two devices on the same network —
point `NEXT_PUBLIC_SOCKET_URL` at your machine's LAN IP). Create a room in one
tab, join with the code in the other, pick a case from the lobby.

No login, no accounts. Display names live in localStorage.

## Scripts

| script | what |
|---|---|
| `npm run dev` | Next.js dev server (:3000) |
| `npm run socket` | standalone socket.io server (:4001, `SOCKET_PORT` to change) |
| `npm run build` | production build (must pass) |
| `npm start` | serve the production build |
| `npm test` | vitest suite |
| `npm run lint` | next lint |

## Env (`.env.local`, see `.env.example`)

- `NEXT_PUBLIC_REALTIME_PROVIDER` — `socketio` (default) or `supabase`
- `NEXT_PUBLIC_SOCKET_URL` — default `http://localhost:4001`
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — only for the supabase provider
- `GEMINI_API_KEY` — optional AI content enhancement; banks are the fallback

## Project map

```
app/            routes: / (corkboard hub), /room/[code], /play/[game],
                /solo, /lovenotes, /settings, /scoreboard
components/     GlassCard, Corkboard, Pin, RedString, WaxSeal, Typewriter,
                Sidebar, RankBar, SoundToggle, ThemeToggle, ManilaFolder, Polaroid
games/          registry.ts + one folder per game (meta.ts, Game.tsx, logic.ts)
lib/realtime/   provider.ts, socketio.ts, supabase.ts, useRoom.ts, merge.ts
lib/content/    cases, blackStories, trivia, dares, logicGrids, ciphers, words
lib/            xp.ts, sound.ts, profile.ts, store.ts, cn.ts
server/         socket-server.ts (tsx)
CONTRACT.md     the rules game agents follow — read before building a game
```

## Game agents

Read `CONTRACT.md` first. TL;DR: export `meta` + default `Game` component from
`games/<slug>/`, register it in `games/registry.ts`, keep state in
`room.shared.games[slug]`, award XP via `lib/xp.ts`. The sample game
`games/sample-tap/` proves the contract end-to-end.

## Stack

Next.js 14 App Router · TypeScript strict · Tailwind v3 (hand-written config) ·
framer-motion 10 · socket.io 4.7 · Supabase (optional provider) · vitest.
