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
