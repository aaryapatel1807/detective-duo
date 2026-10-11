# Game UI Layout Patterns (survey: Tetris, 2048, Wordle, Minesweeper, Snake + open-source clones)

Layout patterns only — studied, not copied. Each pattern notes WHERE it appears and the layout logic.

## 1. Score / best-score HUD
- **2048:** Top header row — big title left, two small "boxes" right: SCORE (live) and BEST (localStorage). Logic: metric that matters sits top-right, never overlapping the board; the two boxes are visually identical so "best" reads as a peer of "score". Score tinted/flashed on beating best.
- **Tetris:** Single column top strip OR right side panel (~160–240px). Classic arcade = top bar `SCORE | LEVEL | LINES | BEST` in one row above the board; modern builds = right sidebar of stacked glassmorphic cards: Score, Level (with progress bar), Lines, Next-piece preview, High score. Logic: tall boards (10×20) leave horizontal dead space — the panel fills it; square boards (2048) have none, so HUD collapses to a top row.
- **Snake clones:** Top strip, minimal: `Score: N   Best: M` plus mute icon; nothing else. Logic: the board is the whole screen, so HUD must be one thin line.
- **Shared rule:** BEST is always the localStorage-persisted twin of SCORE, displayed adjacently in the same visual weight. "NEW RECORD" micro-celebration (crown icon / glow) is the universal reward affordance.

## 2. Timer / clock placement
- **Minesweeper (the classic):** Three-digit LCD counters in the top bar — mine count left, smiley (reset) center, elapsed seconds right. Logic: timer starts on FIRST click (not on load), caps at 999, freezes on game end; placement at the extreme edge keeps it glanceable without stealing focus.
- **2048 variants:** Timer, when present, goes in a footer row *below* the board with undo and move count. Logic: time is secondary info → bottom strip, small mono digits.
- **Styling convention:** Monospace/tabular digits (`tabular-nums`) so the clock doesn't jitter width; low-contrast color, smaller than the score; never animated except on milestones.

## 3. Turn banners ("Your turn", "Player 2's move")
- **Chess apps / 2P games:** Two proven patterns — (a) a glass `turn-banner` pill naming phase/actor ("Your turn") that gains an accent tint on your turn; (b) player chips (avatar + name + meta) with the whose-turn cue ON the chip (highlight border / side swatch). Logic: never tint-only for identity; never shift layout between turns (reserve footprint).
- **Local pass-and-play:** Full-board scrim overlay ("Black to move — pass the device") dismissed when the handover ends. Logic: hides the board for secrecy AND signals turn in one gesture.
- **Secondary cue:** Changing the tab title to "● Your turn — Game" so background tabs signal. Cheap, worth stealing for Detective Duo.

## 4. Game-over / result screens
- **2048:** Centered overlay ON the board (board dims/scales slightly): headline ("Game over!" / "You win!"), then primary actions: Try again / Keep going (win only). Logic: overlay stays in-place so the final board remains visible behind it — no navigation.
- **Wordle:** Stats modal, not an overlay on the board: top row of 4 stats (Played, Win %, Current streak, Max streak), guess-distribution histogram (1–6 + X bars, current game highlighted), countdown to next daily + Share button emitting emoji grid. Button order: Share/primary first, dismiss last. Logic: the game is 1-round/day, so the end screen is a *record*, not a retry prompt.
- **Minesweeper:** No screen at all — the smiley face changes (dead / sunglasses) and mines reveal in place. Logic: state is fully legible from the board itself; a modal would destroy the readable final state.
- **Shared rule:** end-state = verdict headline + key number + ONE primary action. Keep the final board visible behind or beside it.

## 5. Difficulty selection
- **Minesweeper clones:** 3-card picker (Beginner 9×9/10 mines, Intermediate 16×16/40, Expert 30×16/99) showing grid dimensions + mine count on each card, plus optional Custom (two numeric inputs). Logic: cards communicate difficulty via *board geometry*, not adjectives.
- **Chess (omarchy):** "Three levels, and the easy one genuinely errs" — difficulty selection with per-difficulty records (wins, quickest win) stored locally.
- **Pattern for duo games:** difficulty cards map cleanly to per-round time limits or hint counts.

## 6. Pause / resume affordances
- **Tetris clones:** Pause button (⏸) pinned in the HUD panel near score; keyboard P/Esc; pausing raises an overlay: Resume (primary) / Restart / Quit, board frozen and dimmed behind. Logic: pause is a one-tap icon in the same visual row as the score — it belongs to the HUD, not the board.
- **Mobile:** pause must be reachable without moving the thumb off the play zone (top-corner icon). Browsers: `touch-action: manipulation` to kill double-tap zoom gestures during play.

## 7. Tile / card / cell styling conventions
- **2048:** Rounded squares (6–8px radius), gap grid on a darker tray; value → color ramp (low tiles near-background, high tiles saturated accent, white text after ~8); bold centered numbers; numbers shrink for 4+ digits; spawn = scale-pop, merge = scale-up-then-down.
- **Wordle:** Tiles start as bordered outlines (empty state legible without color); states are solid fills — green correct / amber present / dark gray absent — with a 3D flip reveal left→right; invalid guess = row shake. Keyboard mirrors the same 3 state colors. Logic: shape/border for emptiness, color for state, motion for feedback.
- **Minesweeper:** Raised-bevel cells (unrevealed) → recessed cells (revealed); numbers 1–8 color-coded (blue 1, green 2, red 3…); flags red, exploded mine on red background, wrong flags get a crossed-out marker on loss. Logic: 3D bevel = "clickable", flat = "done".
- **Shared rule:** every cell has exactly 3 visual tiers — interactive / resolved / special — and state changes animate (pop, flip, flash), never swap silently.

## 8. Mobile touch adaptations
- **Swipe over buttons (2048):** swipe ≥ ~30px, dominant axis wins, direction from gesture vector — not four arrow buttons. Logic: a board with no empty chrome has no room for a D-pad.
- **Tap targets ≥ 44px** (Emberisle benchmark); tap-then-confirm on coarse pointers for destructive moves; undo explicitly because "the misplaced tap is the ordinary case on a bus."
- **Thumb-zone anchoring (2048 mobile fork):** board pushed to the *bottom* of portrait layout, scores stuck just above it, header/tips float in the freed upper void. Logic: thumb does the work at the bottom; eyes read HUD at the top — don't center the board and make the thumb travel.
- **Long-press = secondary action** (Minesweeper mobile: long-press to flag). Standard, discoverable via one-line hint.
- **Wordle:** full on-screen keyboard rendered in the layout (3 rows, Enter/⌫) because physical keyboards are unreliable on mobile; keys reuse tile state colors.
- **Snake mobile:** swipe or a floating mini D-pad; grid snap so fat-finger taps still resolve.

## 9. Clever open-source patterns worth stealing (layout logic)
- **Score twin boxes (2048):** `SCORE` and `BEST` as identical twin cards in the header — steals zero board space, makes "beat your best" ambiently visible. Direct fit for duo scoring (YOU / OPPONENT twins).
- **Overlay-on-board endings (2048/wordle clones):** dim + slight scale of the final board behind the result modal. Keeps context, avoids route changes.
- **Emoji-grid share (Wordle):** zero-backend virality — a result encoded as colored squares in the clipboard. Cheap to implement, huge social loop.
- **Per-difficulty local records (chess clone):** best time / quickest win per difficulty in one JSON file, shown inline on the difficulty picker. Makes the picker itself a progression surface.
- **Hint-as-first-class HUD (minesweeper-roguelike):** hints shown as a countable resource card; post-game shop for power-ups. Layout logic: consumables live in the HUD as cards with counts, not buried in menus.
- **No-layout-shift turn cue (boredgames.ai):** whose-turn indicator reserved via visibility/disabled so the board never recenters between turns. Critical for 2P flow.
- **"Genuinely erring" easy AI (chess clone):** difficulty expressed as mistake rate, not think time — layouts showing "Level: Easy" can promise this honestly.

Sources: Wikipedia entries for Tetris/2048/Wordle/Minesweeper/Snake (rules & classic layouts); GitHub repos — cognix-dev/cognix (Tetris spec), esukram/wordle, gamehelix/wordle, gabrielecirulli-style 2048 clones, awxciioa/minesweeper, michaeljabbour/minesweeper, jarrodjohnson-gif/emberisle (mobile-ux-benchmark), sonnysangha/castle-3d-multiplayer (UI_REDESIGN), landoncope/boredgames.ai (GAME_DEV_GUIDE consistency contract).
