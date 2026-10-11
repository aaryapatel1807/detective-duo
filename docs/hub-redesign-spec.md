# Detective Duo — Hub Chrome Redesign Spec (overnight, 2026-10-12)

## Pattern synthesis (what Aarya likes)
1. **Dark navy noir base**: bg `#0a0f1a`, panels `#0d1424`/`#111a2e`, borders `#1f2a3d`. Gold `#d9a441` is THE accent (CTAs, active states, headings). Green `#3ddc84` = live/online/ready. Red `#b3261e` = strings/sealed/danger.
2. **Typography**: Cinzel (serif display, headings, letterspaced uppercase), Inter (body), JetBrains Mono (micro-labels, badges, eyebrows — uppercase, tracking 0.12–0.3em), Caveat (handwritten notes only).
3. **Frosted glass panels** (NutriAI "Glass Office" adapted to noir): `background: rgba(13,20,36,0.55–0.72)`, `backdrop-filter: blur(26px) saturate(1.6)`, 1px border `rgba(217,164,65,0.14)` or `rgba(255,255,255,0.09)`, inset top highlight `inset 0 1px 0 rgba(255,255,255,0.08)`, deep shadow `0 18px 50px rgba(0,0,0,0.55)`, radius 18–26px.
4. **Detective motifs**: red pushpins, "CASE FILE №" eyebrows, wax seals, stamps, polaroid tilt, typewriter reveals. Use sparingly on hub chrome (pins/seals on cards, not everywhere).
5. **Structure**: collapsible app sidebar (dark glass, gold active link), sticky blurred top bars, pill badges, max-w-6xl content. Mobile-first: no horizontal page scroll, touch targets ≥44px.

## Token contract (implement in app/globals.css)
```css
:root, [data-theme='dark'] {
  --hub-bg: #0a0f1a;
  --hub-panel: rgba(13, 20, 36, 0.66);
  --hub-panel-2: #111a2e;
  --hub-border: #1f2a3d;
  --hub-gold: #d9a441;
  --hub-gold-soft: rgba(217, 164, 65, 0.14);
  --hub-green: #3ddc84;
  --hub-red: #b3261e;
  --hub-ink: #ece7d9;
  --hub-ink-dim: #8b95a8;
  --hub-glass-blur: blur(26px) saturate(1.6);
}
```
Fonts via next/font in app/layout.tsx with CSS vars: `--hub-display` (Cinzel 600/700), `--hub-body` (Inter 400/500/600), `--hub-mono` (JetBrains Mono 400/600), `--hub-hand` (Caveat 500/600). Utility classes: `.hub-display`, `.hub-mono`, `.hub-hand`, `.hub-glass` (the frosted panel), `.hub-eyebrow` (mono micro-label), `.hub-btn` (gold CTA), `.hub-btn-ghost`, `.hub-badge` (pill).
Keep the existing light-theme `[data-theme='light']` block working — adjust values, don't delete.

## File ownership (NO overlap — stay in your lane)
- **AGENT shell**: `app/layout.tsx`, `app/globals.css`, `components/Sidebar.tsx`
- **AGENT home**: `app/page.tsx`, `games/types.ts` (extend GameMeta ONLY with optional fields), `components/Corkboard.tsx`, `components/props.tsx` (ManilaFolder/Polaroid), `components/RedString.tsx`
- **AGENT pages**: `app/room/[code]/page.tsx`, `app/solo/page.tsx`, `app/scoreboard/page.tsx`, `app/settings/page.tsx`, `app/lovenotes/page.tsx`, `components/GlassCard.tsx`, `components/Typewriter.tsx`, `components/Pin.tsx`, `components/WaxSeal.tsx`, `components/RankBar.tsx`

## Mobile-game UI blueprint (Aarya's direction, 2026-10-12)
Borrow these layout patterns "same as it is" — but ALL artwork/text/styling stays original Detective Duo noir (Cinzel/JetBrains Mono, gold on navy). No copying any game's assets.

1. **Bottom tab bar (mobile, <lg)**: floating island — rounded panel inset ~12px, radius ~28px, own shadow, blur. 5 tabs max: Home (/), Solo (/solo), Scoreboard (/scoreboard), Love Notes (/lovenotes), Settings (/settings). Icon + label under icon; active tab = gold-tinted pill behind icon+label (shape, not color alone). 44px targets. Page gets ~112px bottom padding. Desktop keeps the sidebar.
2. **Player profile header** (home hero): avatar circle (initials), detective name, rank title + XP progress bar with "x / y XP" numbers, partner mini-row. Upgrade existing RankBar to this.
3. **Game-select grid**: rich cards — CSS-crafted noir cover header (icon + title typography + category motif), difficulty badge as rarity pill (easy=green, medium=gold, hard=red — reuse ROUTINE/TRICKY stamp language where it exists), player-count badge, "OPEN FILE →" button. Category filter chips above the grid. Featured carousel (horizontal snap-scroll) for the flagship (crime-mystery) + 2 picks.
4. **Daily briefing / missions panel**: list rows with icon, title, progress bar, XP reward; progress derived ONLY from real local state (getXP, store). Never fake numbers — if a stat doesn't exist, show XP-based ones (e.g., "Earn 100 XP", "Open 3 case files" if trackable).
5. **Leaderboard** (scoreboard page): podium for top 3 (gold/silver/bronze), ranked rows, tabs (This Week / All Time) if data supports; sticky "You" row at bottom. Reuse existing score data sources only.
6. **Top resource bar** (mobile): compact XP chip + rank chip + settings gear in the home header.

## Hard constraints (additions)
- 44×44px minimum touch targets; nothing below 11px text; no horizontal page scroll (carousels scroll internally with snap).
- No invented stats: every number shown must come from existing stores/XP/room state.
- DO NOT touch `games/*/Game.tsx`, `games/*/components/*`, `games/crime-mystery/**` (stays exactly as-is). Hub chrome only.
- `games/types.ts`: only ADD optional fields (`difficulty?: 'easy'|'medium'|'hard'`, `cover?: string`, `tagline?: string`). Never rename/remove.
- Shared components (GlassCard/Typewriter/Pin/WaxSeal/RankBar/Corkboard/props): keep props/APIs stable — restyle internals only.
- Home (`app/page.tsx`): redesign as noir agency dashboard — masthead hero (title, rank bars, room panel), then a responsive game GRID (not folders). Each game card: CSS-crafted noir cover (icon + title typography + category texture, NO image generation), player-count + difficulty badges, "OPEN FILE →" affordance. Category filter chips. Kill the `overflow-x-auto` + `min-w-[860px]` (no horizontal page scroll on mobile).
- framer-motion v10 + TS: NEVER `motion(Component)` — animate wrapper divs only.
- Unlayered custom CSS beats Tailwind `@layer utilities`: never rely on Tailwind responsive `hidden` against a custom `display` rule — use explicit `@media` in the CSS file when overriding display.
- Mobile: single column, drawer/sheets where needed, ≥44px targets.
- Keep all behavior: rooms, solo, XP, settings, theme toggle. Restyle only.
- Tests: `npx vitest run` must stay green (278). `npm run build` green.
- Commit as `Aarya Patel <aaryapatel1807@gmail.com>`. DO NOT PUSH.
