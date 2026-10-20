/* Light-mode contrast guard (regression: 2026-10-14).
 *
 * The play page (/play/*) renders games inside an ALWAYS-DARK
 * evidence-board panel (bg #161316 in both app themes). So text inside
 * game components must never use the theme-following hub tokens
 * --ink / --ink-dim / --ink-faint / --hub-ink: in the light "case file"
 * theme those resolve to dark colors, rendering dark-on-dark text.
 * Use the pinned light-on-dark kit tokens instead: --gk-ink,
 * --gk-ink-dim, --gk-ink-faint.
 * crime-mystery is excluded — it owns its own noir system. */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const GAMES_DIR = join(dirname(fileURLToPath(import.meta.url)));
const FORBIDDEN = /var\(--(?:ink|ink-dim|ink-faint|hub-ink)\)/g;
const EXCLUDE_DIRS = new Set(['crime-mystery']);

function tsxFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (EXCLUDE_DIRS.has(entry)) continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) tsxFiles(p, out);
    else if (p.endsWith('.tsx')) out.push(p);
  }
  return out;
}

describe('light-mode text contrast guard', () => {
  it('no theme-following hub ink tokens inside game components', () => {
    const offenders: string[] = [];
    for (const file of tsxFiles(GAMES_DIR)) {
      const src = readFileSync(file, 'utf8');
      const hits = src.match(FORBIDDEN) ?? [];
      if (hits.length > 0) {
        offenders.push(`${file.replace(GAMES_DIR + '/', '')}: ${[...new Set(hits)].join(', ')}`);
      }
    }
    expect(offenders, 'use --gk-ink* kit tokens (pinned light-on-dark) instead').toEqual([]);
  });
});

/* Duo Blue guard (third theme, CRYPDINO-style bright blue).
 * Duo Blue restyles hub chrome only. The play panel must stay
 * exactly as pinned: the theme must never redefine the --gk-*
 * kit tokens, and its own ink colors must keep readable contrast
 * on white cards, on the blue backdrop, and on navy pills. */
const ROOT = join(GAMES_DIR, '..');
const globalsCss = readFileSync(join(ROOT, 'app', 'globals.css'), 'utf8');
const duoBlock = globalsCss.match(/\[data-theme='duo-blue'\]\s*\{[^}]*\}/)?.[0] ?? '';

function duoToken(name: string): string {
  const m = duoBlock.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`token ${name} missing from [data-theme='duo-blue'] block`);
  return m[1];
}

function relLum(hex: string): number {
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = [0, 2, 4].map((i) => f(parseInt(hex.slice(1 + i, 3 + i), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [relLum(a), relLum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('duo-blue theme guard', () => {
  it('theme is wired end-to-end (provider, toggle cycle, pre-paint init)', () => {
    expect(duoBlock, 'globals.css needs a [data-theme=\'duo-blue\'] token block').not.toBe('');
    const themeTsx = readFileSync(join(ROOT, 'components', 'theme.tsx'), 'utf8');
    expect(themeTsx).toContain("'duo-blue'");
    expect(themeTsx).toContain("['dark', 'light', 'duo-blue']");
    const layout = readFileSync(join(ROOT, 'app', 'layout.tsx'), 'utf8');
    expect(layout).toContain("t==='duo-blue'");
  });

  it('duo-blue never redefines the pinned --gk-* play-panel tokens', () => {
    expect(duoBlock).not.toMatch(/--gk-[a-z-]+\s*:/);
    const hubCss = readFileSync(join(ROOT, 'components', 'hub-noir.css'), 'utf8');
    const hubDuo = hubCss.match(/\[data-theme='duo-blue'\]\s*\{[^}]*\}/)?.[0] ?? '';
    expect(hubDuo).not.toMatch(/--gk-[a-z-]+\s*:/);
  });

  it('duo-blue ink keeps readable contrast on its surfaces', () => {
    const ink = duoToken('--hub-ink');
    const dim = duoToken('--hub-ink-dim');
    const card = duoToken('--hub-panel');
    const navy = duoToken('--hub-panel-2');
    const backdrop = duoToken('--hub-bg');
    expect(contrast(ink, card), 'ink on white cards').toBeGreaterThanOrEqual(4.5);
    expect(contrast(ink, backdrop), 'ink on the blue backdrop').toBeGreaterThanOrEqual(4.5);
    expect(contrast('#ffffff', navy), 'white text on navy pills').toBeGreaterThanOrEqual(4.5);
    expect(contrast(dim, backdrop), 'dim ink on the blue backdrop').toBeGreaterThanOrEqual(3.0);
    expect(contrast(dim, card), 'dim ink on white cards').toBeGreaterThanOrEqual(4.5);
  });
});
