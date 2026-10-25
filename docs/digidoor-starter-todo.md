# DigiDoor starter stack — TODO for the Sachi repo

Checked 25 Oct 2026 against this repo (Next.js 14 app: games hub, 4 themes,
albums backend + gallery UI live). Source: the DigiDoor PDF's 10 repos +
gstack as the process layer (the 11th).

The headline first: for an **existing** repo, almost everything here is
agent-side workflow (prompts, checklists, docs), not new dependencies —
which is why it fits this stack: ₹0, no new runtime, nothing to host.
Two of the 11 are products that do **not** belong in this app, and they
are marked skipped with reasons instead of forced in. The skill's own
rule: apply each where it genuinely fits, and say what was skipped.

## What we get, per repo

### 1. REA — APPLY (research workflow, not app code)
- What it is: MCP + CLI (`npx rea-agents`, MIT) that reverse-engineers
  apps and websites with evidence — website analysis via a browser,
  JS/Electron analysis, binary analysis (needs Hopper/Ghidra: skip).
- What Sachi gets: evidence-backed reference analysis before the next
  feature polish — e.g. Google Photos' album UX (for albums v2) and the
  real-version references this app already follows (most-played real
  game as the model). No code ships from REA itself.
- [ ] Install the REA workflow instruction-only (Muse is not Claude
      Code/Codex, so no native MCP setup claims) and record it here.
- [ ] Run REA website analysis on Google Photos albums UX; file the
      findings in `docs/albums-v2-reference.md` before albums v2 work.
- [ ] Use REA before cloning any new reference game's mechanics.

### 2. Ponytail — APPLY (coding standard + audit)
- What it is: one prompt (`skills/ponytail/SKILL.md` or `AGENTS.md`,
  MIT). The ladder: reuse existing code first, then stdlib, platform,
  dependency, one line, and only then the minimum that works — plus a
  small test for logic. Commands: `/ponytail-review`, `/ponytail-audit`,
  `/ponytail-debt` (harvests `shortcut:` comments).
- What Sachi gets: less duplicated code as the repo grows (games +
  themes + albums) and a ranked fix-list instead of a vague cleanup.
- [ ] Copy Ponytail's AGENTS.md rules into this repo's `AGENTS.md`,
      adapted (never force-push default branch is already a rule here).
- [ ] Run a Ponytail-style audit of the whole repo; fix the top
      findings first (likely: duplicated filter/grid logic, dead
      theme code).
- [ ] Adopt the `shortcut:` comment convention for deferred work.

### 3. Hallmark — APPLY as audit + gates (not a redesign)
- What it is: design skill, 48 theme materials, `sloplint` checks
  (static + rendered at 8 widths), `/hallmark redesign` + `/hallmark
  audit`, MIT. Render checks need puppeteer-core + Chrome.
- What Sachi gets: NOT a redesign — this app already has a design
  system, and redesigns here are trial-first by rule. What it gets is
  the audit and the Floor gates: contrast, focus states, reduced
  motion, no invented facts, no broken phone layout.
- [ ] Run a Hallmark-style audit on the dashboard and `/albums`
      (sloplint where installable, else the gates by hand).
- [ ] Apply the Floor gates as acceptance criteria for the 3 pending
      colorful themes (Sunset Glow, Mint Meadow, Bubblegum Pop)
      before any of them ships.

### 4. Humanizer — APPLY (copy pass, zero code risk)
- What it is: 26 AI-writing patterns (from Wikipedia's "Signs of AI
  writing"), `/humanizer`, MIT. File mode changes prose only.
- What Sachi gets: all user-facing copy sounding like a person wrote
  it — game taglines, empty states, albums copy, intro text, error
  strings — in the cozy voice this app already uses for Sachi.
- [ ] Run the 26-pattern pass over `lib/games.ts` taglines and
      `components/` + `app/albums/` copy; keep facts and names intact.
- [ ] Re-check copy on every new screen before ship (part of the
      ship gate below).

### 5. Onyx — SKIP as a product (deliberate)
- What it is: self-hosted AI chat over documents/knowledge (Docker /
  Kubernetes, Community Edition MIT; Lite <1GB but cannot index).
- Why not: Sachi has no document/knowledge base to chat over, no team,
  and no server to host it on — this stack is free Vercel + Supabase
  only. Self-hosting Onyx would break the ₹0 rule and the stack.
- [ ] Do NOT install Onyx. If a future "ask about our photos" feature
      ever appears, a tiny in-app search beats a whole chat platform.

### 6. Impeccable — APPLY (design-system docs + polish engine)
- What it is: skill + engine binary, 24 commands, 62 deterministic
  detector rules, `PRODUCT.md` + `DESIGN.md`, `npx impeccable
  install`. Commands that matter here: `init`, `document`, `extract`,
  `audit`, `polish`, `harden`, `onboard`.
- What Sachi gets: the design system written down at last — `PRODUCT.md`
  (audience: Sachi + Aarya; cozy, no XP, private tally) and `DESIGN.md`
  generated from the existing theme code — plus a real polish pass on
  the newest surface (`/albums`) instead of eyeballing it.
- [ ] Run `init`: write `PRODUCT.md`; run `document` for `DESIGN.md`
      from the current code (themes, cards, chips, buttons).
- [ ] Run `extract`: pull tokens + components into the design-system
      doc so new screens stop reinventing them.
- [ ] Run `audit` + `polish` on `/albums` and the dashboard; fix
      before the next deploy.
- Note the dedup rule: Impeccable is the polish engine, Hallmark is
  the audit/floor gates — one polish pass per surface, not both.

### 7. UI UX Pro Max — APPLY (ship checklist + design-system spec)
- What it is: 192 reasoning rules, 79 UI styles, 192 palettes, 74 font
  pairings, a design-system generator, and a pre-delivery checklist
  (4.5:1 contrast, visible focus, reduced motion respected, text
  reflows without clipping, 375/768/1024/1440px widths).
- What Sachi gets: a written ship checklist every page must clear
  (the app already meets most of it — this makes it explicit), and a
  formal design-system spec built from the existing tokens rather
  than a replacement theme system.
- [ ] Adopt the pre-delivery checklist as `docs/ship-checklist.md`
      and run it on `/albums` before the next deploy.
- [ ] Write the design-system spec from `lib/themes.ts` + globals
      (tokens, spacing, components, states) — document, don't replace.

### 8. Last 30 Days — APPLY as research (keyless first)
- What it is: agent-led search across Reddit, X, YouTube, TikTok, HN,
  GitHub and more, scored by real engagement (upvotes, likes, views)
  rather than editors. Reddit, HN, GitHub work keyless; X/YouTube need
  setup/auth.
- What Sachi gets: a current brief before the next feature — e.g.
  what couples' game apps are doing this month, what people complain
  about in Google Photos albums, cozy-game trends — instead of
  building from stale knowledge.
- [ ] Run a keyless-sources brief before the next feature decision
      (albums v2 vs new games) and file it in `docs/`.
- [ ] Full skill install (setup wizard + keys for X/YouTube) only if
      a brief ever needs those sources — not by default.

### 9. Scrapling — SKIP in-app (research tool only, on demand)
- What it is: Python scraping framework (stealth browsers, spiders,
  MCP + agent skill), robots.txt obey flag.
- Why not in-app: Sachi has no scraping need — all content is
  user-generated or hand-written — and it's Python while this app is
  JavaScript. Embedding it in the repo makes no sense.
- [ ] Do NOT add Scrapling to the app. Keep it available as an
      agent-side research tool for one-off reference gathering
      (e.g. a game's public rules page), always with robots.txt
      obeyed and the target's terms respected.

### 10. Diagram Design — APPLY (docs diagrams)
- What it is: interactive technical diagrams as a single HTML + SVG
  file, WCAG AA contrast auto-checks, token-based style guide,
  templates, import from draw.io / Mermaid / Excalidraw.
- What Sachi gets: two diagrams this repo actually needs — the app
  architecture (Next.js + Supabase + Vercel + ONNX pipeline) and the
  albums pipeline (upload → compress → EXIF → YuNet → MobileNetV2 →
  albums) — as self-contained files, not screenshots.
- [ ] Create `docs/architecture.html` (app architecture diagram).
- [ ] Create `docs/albums-pipeline.html` (albums pipeline diagram).
- [ ] Style both from the app's tokens; keep text contrast ≥4.5:1.

### 11. gstack — APPLY (process layer for the next feature)
- What it is: the sprint — Think → Plan → Build → Review → Test →
  Ship → Reflect (office-hours, spec/autoplan, design-review,
  investigate, review, qa, document-release, ship/land-and-deploy/
  canary, retro). Instruction-only for Muse; paid parts skipped.
- What Sachi gets: the next feature run as a real sprint instead of
  ad-hoc, with the ship gate (review, qa, document-release) before
  any deploy and a retro note after.
- [ ] Copy the gstack digest reference into this repo's `AGENTS.md`.
- [ ] Run the full sprint on the next feature (albums v2 or the
      colorful themes), including the ship gate and a retro note.

## Order (highest value first)
1. Ponytail audit + AGENTS.md rules (cleans the growing codebase).
2. Impeccable `init` + `DESIGN.md` + polish on `/albums`.
3. Humanizer copy pass (cheap, visible to Sachi immediately).
4. UI UX Pro Max ship checklist adopted + run on `/albums`.
5. Hallmark audit + Floor gates on the 3 pending themes.
6. Diagram Design: architecture + albums-pipeline diagrams.
7. gstack sprint on the next feature.
8. REA reference analysis before albums v2.
9. Last 30 Days brief before the next feature decision.
10. Onyx, Scrapling: skipped as products (see above) — revisit only
    if a real need appears.

## Standing rules this TODO respects
- ₹0 only; no new runtime dependency, no new hosting.
- Mockup-first for UI, trial-first for redesigns — none of the above
  redesigns anything.
- Check the remote before pushing to a shared repo; never force-push
  main.
- No invented facts anywhere (Hallmark Floor + Humanizer both
  enforce this).
