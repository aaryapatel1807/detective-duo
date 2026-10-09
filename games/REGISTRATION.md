# Game registration (READ THIS — overrides the "register in registry.ts" line)

Six workstream agents work in this repo in parallel. To avoid merge conflicts,
each workstream owns ONE registration fragment file and nothing else shared:

- `games/register-word.ts` — word & code duels agent
- `games/register-deduction.ts` — deduction games agent
- `games/register-coop.ts` — co-op games agent
- `games/register-quick.ts` — chase & quick games agent
- `games/register-mystery.ts` — crime mystery agent
- `games/register-solo.ts` — solo games agent

**Rules:**
1. Put your `register(meta, () => import('./<slug>/Game'))` calls ONLY in your own
   fragment. Never touch another workstream's fragment, `games/all.ts`,
   `games/registry.ts`, `app/page.tsx` (SEALED_CASES is unsealed by the
   coordinator at the end), or any `lib/content/*` bank file.
2. Game-specific content banks live in YOUR game folder
   (e.g. `games/black-stories/content.ts`), not in `lib/content/`.
   You may IMPORT from `lib/content/*` (read-only).
3. `git add` ONLY your own paths (`games/<your slugs>/`, your fragment,
   your tests). NEVER `git add -A`, `git commit -a`, or `git checkout -- <shared>`.
   Other agents commit in parallel — keep your commits scoped.
4. Your fragment is imported by `games/all.ts` (side-effect import), which is what
   the app pages import. The lazy `() => import(...)` loader keeps bundles split.
5. `register()` throws on duplicate slugs — keep slugs unique and URL-safe.
