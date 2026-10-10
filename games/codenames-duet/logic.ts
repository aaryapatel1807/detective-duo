/* Pure rules for Codenames Duet (simplified co-op). No React, no I/O. */

export type CardKind = 'agent' | 'assassin' | 'bystander';

export const DUET_BOARD_SIZE = 25;
export const DUET_AGENTS = 9;
export const DUET_ASSASSINS = 3;
export const DUET_MAX_TURNS = 9;

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface DuetBoard {
  words: string[];
  key: CardKind[];
}

/**
 * Build a 5x5 board: 25 unique words, 9 agents, 3 assassins, rest bystanders.
 * (Shuffling is random by nature; callers seed the pool.)
 */
export function buildBoard(pool: string[]): DuetBoard {
  const words = shuffle([...new Set(pool.map((w) => w.toUpperCase()))]).slice(
    0,
    DUET_BOARD_SIZE,
  );
  const key: CardKind[] = shuffle([
    ...Array<string>(DUET_AGENTS).fill('agent'),
    ...Array<string>(DUET_ASSASSINS).fill('assassin'),
    ...Array<string>(DUET_BOARD_SIZE - DUET_AGENTS - DUET_ASSASSINS).fill('bystander'),
  ]) as CardKind[];
  return { words, key };
}

export function agentsFound(key: CardKind[], revealed: boolean[]): number {
  return key.filter((k, i) => k === 'agent' && revealed[i]).length;
}

export function allAgentsFound(key: CardKind[], revealed: boolean[]): boolean {
  return agentsFound(key, revealed) >= DUET_AGENTS;
}

export type GuessOutcome = 'agent' | 'bystander' | 'assassin';

/** Reveal one card immutably; returns the new revealed array + what it was. */
export function revealCard(
  revealed: boolean[],
  key: CardKind[],
  index: number,
): { revealed: boolean[]; outcome: GuessOutcome } {
  const next = [...revealed];
  next[index] = true;
  return { revealed: next, outcome: key[index] };
}

/** A clue word is illegal if it matches (or contains) an unrevealed board word. */
export function isLegalClue(clueWord: string, words: string[], revealed: boolean[]): boolean {
  const c = clueWord.trim().toUpperCase();
  if (!/^[A-Z]+$/.test(c)) return false;
  return !words.some((w, i) => !revealed[i] && (w.toUpperCase() === c || c.includes(w.toUpperCase())));
}

/** True when the turn counter has run out. */
export function outOfTurns(turn: number, maxTurns = DUET_MAX_TURNS): boolean {
  return turn > maxTurns;
}
