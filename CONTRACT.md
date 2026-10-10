# Detective Duo — CONTRACT

The rules every game agent follows. Read this before building a game.

## 1. Realtime API (`lib/realtime/`)

`useRoom()` (from `lib/realtime/useRoom.ts`) is the single entry point.
One singleton per browser tab; all pages share it.

```ts
const room = useRoom();
// room.roomCode: string | null
// room.me: { id: string; name: string }        // id persists in localStorage 'dd-player-id'
// room.peer: { id: string; name: string } | null
// room.members: Peer[]                        // everyone currently in the room
// room.connected: boolean
// room.busy: boolean; room.error: string | null
// room.shared: Record<string, any>            // room-wide state, deep-merged
// room.setName(name)
// room.createRoom(name?): Promise<string>     // 6-char code
// room.joinRoom(code, name?): Promise<void>
// room.leaveRoom()
// room.setShared(patch)                       // deep-merge + broadcast
// room.send(type, payload)                    // one-off action message
// room.onAction(type, handler): () => void     // handler(payload, fromId); returns unsub
```

Conventions:

- **Games live under `shared.games[slug]`**, e.g. `shared.games['tap-duel'] = { taps: {...} }`.
- **XP sync lives under `shared.xp[playerId] = { name, xp }`** — use `syncXpToRoom()` from `lib/xp.ts`.
- `setShared` is **optimistic**: it merges locally first, then broadcasts. Deep merge:
  plain objects merge recursively; arrays and primitives **replace**.
- `send`/`onAction` are **ephemeral** (not persisted): use for "your turn" pings,
  chat messages, rematch offers. Prefer `shared` for anything that must survive a rejoin.
- Room code persists in localStorage `'dd-room'`; display name in `'dd-name'`.
- Default provider is socket.io (`NEXT_PUBLIC_SOCKET_URL`, default `http://localhost:4001`).
  Set `NEXT_PUBLIC_REALTIME_PROVIDER=supabase` (+ URL/anon key) to switch providers —
  the `useRoom` API is identical.

### Socket server protocol (`server/socket-server.ts`)

Events (see `EVENTS` in `lib/realtime/provider.ts`):

| direction | event | payload |
|---|---|---|
| client → server | `room:create` | `{ playerId, name }` → ack `{ code }` / `{ error }` |
| client → server | `room:join` | `{ code, playerId, name }` → ack `{ ok, members, shared }` / `{ error }` |
| client → server | `room:leave` | `{ code, playerId }` |
| client → server | `room:patch` | `{ code, playerId, patch }` → server merges, emits `room:state` to others |
| client → server | `room:action` | `{ code, playerId, type, payload }` → rebroadcast to whole room |
| server → room | `room:presence` | `[{ id, name }]` |
| server → others | `room:state` | `patch` (the sender already applied it locally) |
| server → room | `room:action` | `{ type, payload, from }` |

Rooms are in-memory; disconnecting removes presence but keeps shared state for rejoin.

## 2. Game module contract

```
games/<slug>/
  meta.ts   — exports `meta: GameMeta`
  Game.tsx  — default export: React component receiving { room: RoomApi }
  logic.ts  — pure rules, unit-testable (REQUIRED where cheap)
  types.ts  — shared types (optional)
```

```ts
interface GameMeta {
  slug: string;                 // == folder name
  title: string;
  players: 'duo' | 'coop' | 'solo';  // duo = versus, coop = cooperative
  category: string;             // hub corkboard folder, e.g. 'Word & Code Duels'
  icon: string;                 // emoji
  blurb: string;                // one line for the hub card
}
```

Register in `games/registry.ts`:

```ts
import { meta as myGameMeta } from './my-game/meta';
register(myGameMeta, () => import('./my-game/Game'));
```

The `/play/[game]` shell looks the game up with `getGame(slug)` and renders it
inside a case-folder frame on a dark evidence-board panel. **Never call
`motion(Component)`** (framer-motion v10 + TS breaks `motion.div` typings in the
same file) — animate wrapper divs only. `@types/react` is pinned to React 18.

Game checklist:

- Read state from `room.shared.games[slug]`; write with `room.setShared({ games: { [slug]: patch } })`.
- Handle `room.peer === null` (solo practice / waiting) gracefully.
- Award XP with `awardXP(XP_AWARDS.…)` from `lib/xp.ts`, then `syncXpToRoom(room.setShared, room.me.id, room.me.name)`.
- Co-op wins: call `recordCoopWin()` (from `lib/lovenotes.ts`) — unlocks love notes.
- Sound: `sounds.*` from `lib/sound.ts` (typewriterClick, paperShuffle, pinTap, stampThud, xpTick).

## 3. Crime Mystery case schema (`lib/content/cases.ts`)

```ts
interface Clue    { id: string; text: string; split: 'a' | 'b' | 'both'; }
interface Suspect { name: string; motive: string; alibi: string; secret: string; }
interface CaseFile {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  intro: string;          // read to both players
  clues: Clue[];          // split: 'a' = player A only, 'b' = player B only
  suspects: Suspect[];
  culprit: string;        // must equal one suspect's name
  solution: string;        // revealed after the vote
}
```

Rules:

- The culprit must be **uniquely deducible from the union** of all clues + suspects.
- Every case needs ≥1 `a`-only and ≥1 `b`-only clue (asymmetric dealing forces talking).
- Validate with `validateCaseFile(c)` — must return `[]`. Covered by tests.
- `cluesFor(case, 'a' | 'b')` returns the clues one side may see.

## 4. Content bank schemas (`lib/content/`)

| file | schema | count |
|---|---|---|
| `cases.ts` | `CaseFile` (above) | 2 starter |
| `blackStories.ts` | `{ id, title, riddle, solution }` | 5 |
| `trivia.ts` | `{ id, category, question, options: [4], answer: 0..3 }`; custom: `{ question, answer }` in localStorage `'dd-custom-trivia'` | 10 |
| `dares.ts` | `TRUTHS[]`, `DARES[]`, `WOULD_YOU_RATHER: [a, b][]` | 10/10/10 |
| `logicGrids.ts` | `{ id, title, setup, rows, cols, clues, solution[] }` | 2 |
| `ciphers.ts` | `{ id, type: 'caesar' \| 'substitution', title, message, hint, solution }` + `caesarDecode`/`atbashDecode` helpers | 5 |
| `words.ts` | `WORDS_4/5/6`, `BOGGLE_DICE[16]`, `randomWord(n)`, `rollBoggle()` | 24/20/20 |

Cipher solves grant **hint tokens** for the Crime Mystery (game agents: +1 token
per solved cipher, stored in `shared.games['crime-mystery'].hintTokens`).

## 5. XP (`lib/xp.ts`)

Ranks: Rookie (0) → Observer (100) → Sleuth (250) → Investigator (500) →
Detective (1000) → Chief Inspector (2000).

`awardXP(n)` persists to localStorage `'dd-xp'` (never below 0) and returns the
new total. Standard amounts in `XP_AWARDS` (duoWin 100, coopWin 150,
mysterySolved 200, clueSolved 30, …). `rankFor(xp)`, `progressToNext(xp)`.

## 6. Theme & components

- Dark-first; light "case-file paper" via `data-theme` on `<html>`, persisted `'dd-theme'`.
- CSS vars in `app/globals.css`: `--glass-bg`, `--glass-border`, `--ink`, `--amber-glow`,
  `--blood`, `--brass`, `--manila`, `--cork`, `--font-type` (Courier Prime), etc.
- Primitives: `.glass-card`, `.corkboard`, `.manila-folder`, `.polaroid`,
  `.brass-pin`, `.wax-seal`, `.paper-strip`, `.xp-track/.xp-fill`, `.noir-input`, `.noir-btn`.
- Components in `components/`: `GlassCard`, `Corkboard`, `Pin`, `RedString`/`RedStringLayer`
  (framer-motion SVG path draw), `WaxSeal`, `Typewriter`, `Sidebar` (collapsible, slides
  left, persisted `'dd-sidebar-collapsed'`), `RankBar`, `SoundToggle`, `ThemeToggle`,
  `ManilaFolder`, `Polaroid`.
- Sounds (`lib/sound.ts`): WebAudio, muted until first interaction; toggle in sidebar.

## 7. Local storage keys

| key | value |
|---|---|
| `dd-room` | room code |
| `dd-player-id` | stable player id |
| `dd-name` / `dd-partner-name` | display names |
| `dd-xp` | local XP total |
| `dd-coop-wins` | co-op win count (unlocks love notes) |
| `dd-lovenotes` | sealed notes |
| `dd-custom-trivia` | custom trivia questions |
| `dd-accent-me` / `dd-accent-partner` | accent colors |
| `dd-photo-me` / `dd-photo-partner` | photo dataURLs |
| `dd-theme` | dark/light |
| `dd-sidebar-collapsed` | sidebar state |
| `dd-sound-muted` | sound toggle |
