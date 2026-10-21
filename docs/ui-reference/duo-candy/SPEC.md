# Duo Candy — token spec (from approved references)

Fourth theme: Night Desk (noir) → Case File (light) → Duo Blue → **Duo Candy**.
Everything is gated on `[data-theme='duo-candy']`; the other three themes
render byte-for-byte as before. Play surfaces keep their pinned `--gk-*`
kit tokens; crime-mystery is untouched.

References (this folder): `hub.webp` (primary spec), `scoreboard.webp`,
`lovenotes.webp`, `gamesgrid.webp`.

## Palette

| Token | Value | Use |
|---|---|---|
| Cream bg | `#FFF6E9` | page base, input fill, podium card |
| Ink | `#2E2A38` | headings/body on light surfaces |
| Ink dim (solid) | `#57506B` | secondary text (≥4.5:1 on cream + white) |
| Coral | `#F96D7B` (bright `#FF6B81`) | primary actions, Case Hub accent, featured frame 1, XP fill, rank-1. Button fills use `#F26071` — one step deeper so white Baloo text clears 3:1 (2.80 → 3.14) |
| Coral deep (text) | `#C24352` | coral text on white/cream (≥4.5:1) |
| Coral tint | `#FDE3E1` / panel `#F8A5A5` | channel panel, note card 1 |
| Teal | `#0B6E63` (bright `#0E7C7B`) | masthead panel, Solo Files accent, featured frame 2, rank-2 |
| Teal tint | `#BFE8DF` | partner card (mint-teal wash) |
| Mustard | `#FFB703` (bright `#FFC93C`) | profile/XP card, Scoreboard accent, open-slot row |
| Mustard deep (text) | `#8A5E00` | mustard text on light surfaces |
| Lavender | `#A78BFA` (soft `#B8A9E8`) | Love Notes accent, JOIN buttons, featured frame 3 |
| Lavender deep (text) | `#5B3EB8` | lavender text on white/cream |
| Lavender tint | `#E4DEF9` | sync card, note card 3 |
| Mint | `#5EC8B4` | Settings accent, success |
| Mint deep (text) | `#0E6B57` | mint text on light surfaces |
| Plum panel-2 | `#2E2A38` | dark pills (difficulty/mode, active filter chip) |

## Shape & depth

- Card radius **28px**; masthead **32px**; buttons/badges/chips fully round pills.
- Card shadow: `0 10px 24px rgba(46,42,56,.12)`.
- Masthead: teal panel with a layered offset blob behind it (mustard shape
  peeking top-right, lavender bottom-left) — CSS pseudo-elements only.
- Page background: cream + soft pastel blob washes in the corners
  (radial-gradients, fixed). Scoreboard page base goes teal (its reference)
  via `:has(.hub-podium)`.
- Inputs: cream fill `#FFF6E9`, radius 16–20px, plum border on focus coral.
- Sidebar: peach-tinted panel (`#FDE9DC`→`#FBD9C8` wash) with blob washes;
  logo chip mustard; every nav item a chunky pill — inactive = white/cream
  pill with a section-colored icon chip (the emoji sits in a colored
  circle), active = filled with its section color, white bold text.
  Status card teal-tint, sync card lavender-tint, sound pill mustard-tint,
  theme toggle deep-teal pill with lavender tag chip.

## Section color map (sidebar order)

1. Case Hub `/` — coral
2. Solo Files `/solo` — teal
3. Love Notes `/lovenotes` — lavender
4. Scoreboard `/scoreboard` — mustard
5. Settings `/settings` — mint

## Typography

- **Baloo 2** (Google Fonts via `next/font/google`, `--font-candy`,
  weights 600/700/800): headings, logo, page titles, buttons, badges,
  big numbers, nav labels. Extra-bold, tight, friendly. **No Cinzel/serif
  and no JetBrains Mono leak in this theme.**
- **Nunito** (`--font-duo`, already loaded for Duo Blue): body text.
- Mono slots (room code, dates, XP numerals) fall back to Baloo 2 in this
  theme — the references use rounded type everywhere.

## Per-surface notes

- **Hub**: teal masthead (DETECTIVE cream / DUO mustard), profile row on a
  mustard card (plum avatar circle, coral XP fill on cream track),
  partner row mint-teal, channel panel light coral with cream inputs,
  coral CREATE ROOM, lavender JOIN + tip pill. Featured cards framed
  coral / teal / lavender in order; cover art kept (real images win).
- **Scoreboard**: teal page base + blobs; cream podium card; plinth 1 coral
  (gold avatar ring, mustard XP chip), plinth 2 cream (teal avatar/XP),
  vacant plinth mustard dashed. Standings: row 1 coral fill + mustard XP
  pill, row 2 white + teal XP pill, "you" row coral ring. Ladder rows are
  chunky pills alternating mustard / mint / cream (nth-child), the current
  rank gets a coral ring + coral CURRENT-style tag treatment.
- **Love Notes**: cream base; form card white with the existing red
  push-pin; coral SEAL IT; sealed cards color-cycled pink / teal /
  lavender tints with mustard "ready" treatment on the open button.
- **Solo Files**: cream base; filter chips are chunky outlined pills,
  active = plum fill + white text; game cards white with color-cycled
  cover wells (coral, teal, mustard, lavender, mint) behind the real
  emoji/icon + title; difficulty/mode as dark plum pills (solo reference).
  Home game grid keeps real cover images; cards get the same white chunky
  treatment and plum mode pill.
