/**
 * Vibe Check (Phase 6 quick game): Guess Who, except no question is
 * about their face. A board of 24 personas — desi, global, or both —
 * and one secret each. Ask personality questions, flip down everyone
 * it can't be, and the last face still standing is your answer.
 *
 * Honest deviation from the reel's version: the board uses fictional
 * personas with initials tiles, not photos of real celebrities — the
 * app has no rights to real photos, and guessing real people is not
 * something a cozy two-person game needs. The deduction game is the
 * same: traits, questions, elimination, one secret each.
 *
 * Traits are assigned deterministically from each name (same hash on
 * both devices), so both players always share the same board.
 */
import { hashSeed, rngFromSeed, shuffle } from '../generators/rng';

export interface VibePersona {
  name: string;
  traits: string[];
}

export interface VibeQuestion {
  id: string;
  text: string;
  trait: string;
}

export const VIBE_QUESTIONS: VibeQuestion[] = [
  { id: 'ai-art', text: 'Would they have AI art in the hallway?', trait: 'ai-art' },
  { id: 'vocal-rest', text: 'Have they ever been on vocal rest?', trait: 'vocal-rest' },
  { id: 'mother', text: 'Would your mother approve?', trait: 'mother' },
  { id: 'chai', text: 'Do they start the day with chai?', trait: 'chai' },
  { id: 'early', text: 'Are they an early riser?', trait: 'early' },
  { id: 'night-owl', text: 'Are they a night owl?', trait: 'night-owl' },
  { id: 'spicy', text: 'Do they love spicy food?', trait: 'spicy' },
  { id: 'sweet', text: 'Do they have a sweet tooth?', trait: 'sweet' },
  { id: 'travel', text: 'Do they dream of travelling far?', trait: 'travel' },
  { id: 'homebody', text: 'Are they a homebody?', trait: 'homebody' },
  { id: 'singer', text: 'Do they sing in the shower?', trait: 'singer' },
  { id: 'reader', text: 'Do they read before bed?', trait: 'reader' },
  { id: 'gamer', text: 'Do they play games to unwind?', trait: 'gamer' },
  { id: 'cook', text: 'Do they cook for fun?', trait: 'cook' },
  { id: 'sports', text: 'Do they follow a sport closely?', trait: 'sports' },
  { id: 'pet', text: 'Would they keep a pet?', trait: 'pet' },
];

const DESI_NAMES = [
  'Asha', 'Rohan', 'Priya', 'Arjun', 'Meera', 'Vikram', 'Kavya', 'Aditya',
  'Sana', 'Nikhil', 'Tara', 'Dev', 'Anaya', 'Kabir', 'Ira', 'Reyansh',
  'Diya', 'Ayaan', 'Navya', 'Krishna', 'Zoya', 'Farhan', 'Misha', 'Arnav',
];

const GLOBAL_NAMES = [
  'Emma', 'Liam', 'Sofia', 'Noah', 'Mia', 'Lucas', 'Ava', 'Ethan',
  'Zoe', 'Max', 'Lily', 'Owen', 'Ruby', 'Finn', 'Nora', 'Hugo',
  'Ivy', 'Leo', 'Maya', 'Eli', 'Cleo', 'Jude', 'Elsa', 'Milo',
];

const TRAIT_KEYS = VIBE_QUESTIONS.map((q) => q.trait);

/** Deterministic traits for a name: 5 of the 16, from the name hash. */
export function traitsForPersona(name: string): string[] {
  const rng = rngFromSeed(`vibe|${name}`);
  return shuffle([...TRAIT_KEYS], rng).slice(0, 5);
}

export type VibeBoardKind = 'desi' | 'global' | 'both';

export function vibeBoardKindForLevel(level: number): VibeBoardKind {
  if (level <= 10) return 'desi';
  if (level <= 30) return 'global';
  return 'both';
}

export interface VibeGame {
  board: VibePersona[];
  kind: VibeBoardKind;
}

export function generateVibe(seed: string, level: number): VibeGame {
  const rng = rngFromSeed(`vibe|${seed}|${level}`);
  const kind = vibeBoardKindForLevel(level);
  let names: string[];
  if (kind === 'desi') names = DESI_NAMES;
  else if (kind === 'global') names = GLOBAL_NAMES;
  else names = [...shuffle(DESI_NAMES, rng).slice(0, 12), ...shuffle(GLOBAL_NAMES, rng).slice(0, 12)];
  const board = shuffle(names, rng).map((name) => ({
    name,
    traits: traitsForPersona(name),
  }));
  return { board, kind };
}

/** Answer a trait question about a persona. */
export function vibeAnswer(persona: VibePersona, trait: string): boolean {
  return persona.traits.includes(trait);
}

/** Eliminate everyone whose answer to `trait` is not `answer`. */
export function vibeEliminate(
  board: VibePersona[],
  eliminated: number[],
  trait: string,
  answer: boolean,
): number[] {
  const next = [...eliminated];
  board.forEach((p, i) => {
    if (next.includes(i)) return;
    if (vibeAnswer(p, trait) !== answer) next.push(i);
  });
  return next;
}

/** Remaining candidates (indexes) after eliminations. */
export function vibeRemaining(eliminated: number[], size: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < size; i++) {
    if (!eliminated.includes(i)) out.push(i);
  }
  return out;
}

/**
 * Bot question: the trait that best splits the remaining candidates
 * (closest to half yes, half no). Returns null when 1 or fewer remain.
 */
export function vibeBotQuestion(
  board: VibePersona[],
  remaining: number[],
): VibeQuestion | null {
  if (remaining.length <= 1) return null;
  let best: VibeQuestion | null = null;
  let bestScore = -1;
  for (const q of VIBE_QUESTIONS) {
    const yes = remaining.filter((i) => vibeAnswer(board[i]!, q.trait)).length;
    const score = Math.min(yes, remaining.length - yes);
    if (score > bestScore) {
      bestScore = score;
      best = q;
    }
  }
  return best;
}

/** Bot guesses when few candidates remain (threshold by level). */
export function vibeBotGuessThreshold(level: number): number {
  if (level <= 10) return 1;
  if (level <= 30) return 2;
  return 3;
}

export function vibeProgress(total: number, eliminated: number): number {
  if (total <= 1) return 1;
  return Math.min(1, eliminated / (total - 1));
}
