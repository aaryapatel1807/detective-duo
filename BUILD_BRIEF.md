# Detective Duo — Build Brief

Two-player private games hub. Noir detective theme. Built for Aarya + his partner (two players only).

## 0. Design language (mockup-first — this is law)

Reference image: `docs/ui-reference/noir-hub-reference.webp` — match it.
Fusion of two styles:
- **NutriAI "Glass Office"**: frosted-glass cards (`--glass-bg`, `backdrop-filter: blur(26px) saturate(1.6)`), 26px radius, collapsible sidebar (slides left, persisted), ambient scenic backdrop, dual light/dark theme.
- **Noir detective**: corkboard lobby, manila case folders, polaroid photos, red strings, brass pins, typewriter serif headings, warm amber desk-lamp glow on deep charcoal, detective ranks + XP bars, Love Notes card with wax seal.

Type: typewriter serif for headings (e.g. "Special Elite" / "Courier Prime" style), clean sans for body. Framer Motion for card pins, string draws, page transitions. Dark-first; light "case-file paper" theme via toggle.

## 1. Stack

Next.js 14 (App Router) + TypeScript + Tailwind + Framer Motion. No paid services, ever.
- Realtime: `lib/realtime/` abstraction. **Default provider = Socket.io** via a small Node server in `server/` (works on localhost immediately, no accounts). **Supabase provider** implemented behind env vars (`NEXT_PUBLIC_REALTIME_PROVIDER=supabase`, URL + anon key) for later — code it, don't require it.
- Profiles: display names in localStorage. Rooms: 6-char codes, host/guest. No login/auth — private two-player hub, zero friction.
- AI content: **offline-first**. Hand-authored banks (cases, Black Stories, trivia, dares, logic grids, cipher messages). Optional Gemini enhancement via `GEMINI_API_KEY` env — graceful fallback to banks when unset.
- Personalization: Settings page — both names, accent colors, photo uploads (stored locally), custom trivia questions. Noir defaults. No code changes needed by the user.

## 2. Architecture

- `app/` — routes: `/` (corkboard hub lobby), `/room/[code]` (lobby), `/play/[game]` (game shell), `/solo`, `/lovenotes`, `/settings`, `/scoreboard`.
- `games/<slug>/` — one folder per game: `Game.tsx` (client component), `logic.ts` (pure rules, unit-testable), `types.ts`.
- `lib/realtime/` — `provider.ts` (interface), `socketio.ts`, `supabase.ts`, `useRoom.ts` hook (join/create room, synced state, send actions).
- `lib/content/` — offline banks: `cases.ts`, `blackStories.ts`, `trivia.ts`, `dares.ts`, `logicGrids.ts`, `ciphers.ts`, `words.ts`.
- `lib/xp.ts` — XP awards, rank ladder: Rookie → Observer → Sleuth → Investigator → Detective → Chief Inspector.
- Game module contract: each game exports `meta { slug, title, players: 'duo'|'coop'|'solo', icon, blurb }` and a component that works with `useRoom`. Register in `games/registry.ts`.

## 3. Game roster (build ALL of these — every one playable end-to-end)

**Word & code duels:** Hangman Duel (shared word, alternate letter guesses, fewest strikes over 3 rounds wins), Word Duel (Wordle-style: guess the opponent's secret word in 6 tries, fewer tries wins), Cipher Duel (Bulls & Cows, 4-digit codes), Ghost (build a word letter by letter, don't complete one), Word Hunt (shared Boggle-style grid, timed race), Cipher Breaker (decode Caesar/substitution messages; solved ciphers grant hint tokens for the crime mystery), Codenames Duet (co-op word association, simplified duet rules).

**Yes/No & deduction:** Black Stories (offline bank ~15 lateral puzzles; one player hosts with the full story, other asks yes/no questions), Guess Who suspect edition (12 suspects, attribute elimination via yes/no), 20 Questions Duel, Spot the Liar (3 statements, one lie; cross-examine then call it), Alibi (invent an alibi for a fictional crime; partner cross-examines, then judges), Logic Grid puzzles (offline bank, race or co-op).

**Co-op (talk required):** Bomb Defusal (asymmetric: one sees the bomb + timer, other holds the manual; in-app chat), Heist Planner (one has the vault map, other has guard patrols; plan then execute), Escape Room (hidden objects + lock codes, shared room), Mind Meld (both type a word at once; match to advance, themed rounds).

**Chase & bluff:** Fugitive Hunt (hider picks a node on a stylized city grid; seeker gets a distance/direction clue per turn, limited turns), Liar's Dice (standard rules).

**Quick games:** Tic-tac-toe, Connect 4, Battleship, Draw & Guess (canvas + timer), Trivia Battle (offline bank + custom "about each other" questions from Settings), Truth or Dare, Would You Rather (offline decks).

**Flagship — Co-op Crime Mystery:** same case file, asymmetric clue dealing (each player sees different clues, must talk). Evidence board with draggable pins + red strings, suspect interrogation (scripted suspect chat), both vote on the culprit. Offline bank of 8+ cases with escalating difficulty and clue-split logic; optional Gemini to generate new cases. Cipher Breaker solves feed hint tokens here.

**Solo (for when she's bored):** 2048, Wordle-style, Minesweeper, Snake, Memory Match, Daily Puzzle (date-seeded, resets midnight local), Jigsaw (simple, can use uploaded photos), Coloring (simple SVG pages).

## 4. Personal touches

- Shared scoreboard + detective ranks with XP (persisted localStorage, synced in room).
- Love Notes corner: write sealed notes, unlock surprises after co-op wins (wax-seal UI).
- Settings-driven names/photos/colors. Unlockable surprises after wins.
- Sound effects: subtle typewriter clicks, paper shuffles (WebAudio, mutable, off by default until first interaction).

## 5. Gates & rules (non-negotiable)

- Git identity for ALL commits: `Aarya Patel <aaryapatel1807@gmail.com>`. Never commit as Muse.
- **NEVER push.** Push gate holds — local commits only. He approves every push personally.
- `npm run build` must pass. TypeScript strict. Add unit tests for game logic (`logic.ts`) where cheap; run them.
- No secrets in the repo. `.env.example` with placeholders only.
- framer-motion v10 + TS: do NOT call `motion(Component)` in a file (breaks motion.div typings) — animate wrapper divs instead. Pin `@types/react` to the installed React major.
- Commit often with clear messages as features land.

## 6. Verify before reporting

`npm run build` green, tests pass, `npm run dev` + socket server boot, create room + join from two tabs works, at least one game from each category playable end-to-end in two tabs, mystery case solvable with asymmetric clues.

## 7. Report format

Run instructions (dev), what shipped per category, what is local-only (unpushed commits), what needs him (repo name + push approval, optional Supabase/Gemini keys, names/colors via Settings UI). Keep it tight.
