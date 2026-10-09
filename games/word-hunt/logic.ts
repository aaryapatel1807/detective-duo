/* Pure rules for Word Hunt (Boggle-style timed race). No React, no I/O. */

export const WORD_HUNT_SECONDS = 90;
export const WORD_HUNT_MIN_LEN = 4;

/** Classic Boggle scoring. */
export function boggleScore(word: string): number {
  const n = word.length;
  if (n <= 4) return 1;
  if (n === 5) return 2;
  if (n === 6) return 3;
  if (n === 7) return 5;
  return 11;
}

/**
 * Can `word` be traced on a 4x4 board with 8-direction adjacency and no
 * tile reuse? A 'Q' tile covers the pair "QU".
 */
export function canFormWord(board: string[], word: string): boolean {
  const w = word.toUpperCase();
  if (board.length !== 16 || w.length < 2) return false;
  const tiles = board.map((t) => t.toUpperCase());

  // expand the word into tile-steps: 'Q' tile consumes "QU"
  const steps: string[] = [];
  for (let i = 0; i < w.length; i++) {
    if (w[i] === 'Q') {
      if (w[i + 1] !== 'U') return false;
      steps.push('Q');
      i++;
    } else {
      steps.push(w[i]);
    }
  }

  const neighbors = (idx: number): number[] => {
    const r = Math.floor(idx / 4);
    const c = idx % 4;
    const out: number[] = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < 4 && nc >= 0 && nc < 4) out.push(nr * 4 + nc);
      }
    }
    return out;
  };

  const dfs = (pos: number, step: number, used: Set<number>): boolean => {
    if (step === steps.length) return true;
    for (const n of neighbors(pos)) {
      if (used.has(n) || tiles[n] !== steps[step]) continue;
      used.add(n);
      if (dfs(n, step + 1, used)) return true;
      used.delete(n);
    }
    return false;
  };

  for (let i = 0; i < 16; i++) {
    if (tiles[i] !== steps[0]) continue;
    if (dfs(i, 1, new Set([i]))) return true;
  }
  return false;
}

export type WordReject =
  | 'too-short'
  | 'not-in-dictionary'
  | 'not-on-board'
  | 'already-found';

/** Validate a candidate word; null = accepted. */
export function validateWord(
  board: string[],
  bank: string[],
  alreadyFound: string[],
  word: string,
): WordReject | null {
  const w = word.toUpperCase();
  if (w.length < WORD_HUNT_MIN_LEN) return 'too-short';
  if (alreadyFound.map((x) => x.toUpperCase()).includes(w)) return 'already-found';
  if (!bank.map((b) => b.toUpperCase()).includes(w)) return 'not-in-dictionary';
  if (!canFormWord(board, w)) return 'not-on-board';
  return null;
}

/** Total score for a word list (deduped, case-insensitive). */
export function totalScore(words: string[]): number {
  const seen = new Set<string>();
  let total = 0;
  for (const w of words) {
    const u = w.toUpperCase();
    if (seen.has(u)) continue;
    seen.add(u);
    total += boggleScore(u);
  }
  return total;
}

/**
 * Decide the hunt once time is up. Every player's submitted words count;
 * a missing player simply scores what they submitted. Tie = 'draw'.
 * Returns null while the hunt is still running.
 */
export function wordHuntWinner(
  words: Record<string, string[]>,
  done: Record<string, boolean>,
  playerIds: string[],
  endsAt: number,
  now: number,
): string | 'draw' | null {
  const finished = playerIds.every((id) => done[id]) || now > endsAt + 30_000;
  if (!finished) return null;
  let best: string | null = null;
  let bestScore = -1;
  let tied = false;
  for (const pid of playerIds) {
    const s = totalScore(words[pid] ?? []);
    if (s > bestScore) {
      bestScore = s;
      best = pid;
      tied = false;
    } else if (s === bestScore) {
      tied = true;
    }
  }
  return tied ? 'draw' : best;
}
