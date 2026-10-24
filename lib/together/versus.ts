/**
 * Versus progress: solved fraction per game, from the player's own
 * marks. No scores, no timers — just "she's 60% done".
 *
 * - Logic Grids: correct yes-marks / total yes cells in the solution.
 * - Cipher Desk: letters of the current answer matching the plaintext
 *   at the same letter position / total letters in the plaintext.
 * - Nonograms: correctly filled cells / total filled cells in the
 *   solution picture.
 */
import type { LogicGridPuzzle } from '../generators/logicGrid';
import type { NonogramPuzzle } from '../generators/nonogram';

export type Mark = 'yes' | 'no';

export function logicGridYesCells(puzzle: LogicGridPuzzle): Set<string> {
  const cells = new Set<string>();
  for (let cat = 1; cat < puzzle.categories.length; cat++) {
    for (let seat = 0; seat < puzzle.size; seat++) {
      cells.add(`${cat}:${puzzle.solution[cat][seat]}`);
    }
  }
  return cells;
}

export function logicGridProgress(
  puzzle: LogicGridPuzzle,
  marks: Record<string, Mark>,
): number {
  const yes = logicGridYesCells(puzzle);
  if (yes.size === 0) return 0;
  let correct = 0;
  for (const [key, mark] of Object.entries(marks)) {
    if (mark === 'yes' && yes.has(key)) correct++;
  }
  return Math.min(1, correct / yes.size);
}

export function cipherProgress(plaintext: string, answer: string): number {
  const plain = plaintext.replace(/[^A-Za-z]/g, '').toUpperCase();
  const ans = answer.replace(/[^A-Za-z]/g, '').toUpperCase();
  if (plain.length === 0) return 0;
  let correct = 0;
  for (let i = 0; i < Math.min(plain.length, ans.length); i++) {
    if (plain[i] === ans[i]) correct++;
  }
  return correct / plain.length;
}

export function nonogramProgress(
  puzzle: NonogramPuzzle,
  marks: Record<string, 'fill' | 'x'>,
): number {
  let total = 0;
  let correct = 0;
  for (let r = 0; r < puzzle.size; r++) {
    for (let c = 0; c < puzzle.size; c++) {
      if (!puzzle.grid[r][c]) continue;
      total++;
      if (marks[`${r},${c}`] === 'fill') correct++;
    }
  }
  if (total === 0) return 0;
  return correct / total;
}

export function progressLabel(pct: number): string {
  return `${Math.round(pct * 100)}% done`;
}
