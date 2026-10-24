/**
 * Jinx (Phase 6 quick game): the same nine letters for both players.
 * Each finds every word hiding in them; then the lists flip, and any
 * word both found is a JINX — it scores for nobody. The match is won
 * on the words only you thought of.
 *
 * No countdown: a round ends when a player presses "Done" (or both
 * have). The brief's "one minute" is a pace, not a pressure timer —
 * timers stay opt-in across v2.
 */
import { rngFromSeed, shuffle } from '../generators/rng';
import { bridgeWordList } from './bridge';

const EXTRA_WORDS: string[] = [
  'APPLE', 'GRAPE', 'LEMON', 'BERRY', 'PEACH', 'MELON', 'PLUMS', 'PEAR',
  'BREAD', 'PASTA', 'PIZZA', 'SOUP', 'SALAD', 'CAKE', 'PIE', 'TART',
  'CHAIR', 'TABLE', 'SOFA', 'LAMP', 'DESK', 'BED', 'DOOR', 'WINDOW',
  'GARDEN', 'FLOWER', 'ROSE', 'TULIP', 'DAISY', 'TREE', 'LEAF', 'STONE',
  'RIVER', 'OCEAN', 'BEACH', 'SAND', 'WAVE', 'CLOUD', 'RAIN', 'SNOW',
  'HAPPY', 'SMILE', 'LAUGH', 'DANCE', 'SING', 'PLAY', 'GAME', 'BALL',
  'TRAIN', 'PLANE', 'BOAT', 'BIKE', 'ROAD', 'BRIDGE', 'TOWN', 'HOUSE',
  'MUSIC', 'SONG', 'PIANO', 'GUITAR', 'DRUM', 'FLUTE', 'VIOLIN', 'HORN',
  'TIGER', 'LION', 'BEAR', 'WOLF', 'FOX', 'DEER', 'HORSE', 'MOUSE',
  'QUICK', 'BROWN', 'BLACK', 'WHITE', 'GREEN', 'BLUE', 'RED', 'PINK',
  'BRAVE', 'CALM', 'KIND', 'WARM', 'COOL', 'SOFT', 'HARD', 'FAST',
  'SLEEP', 'DREAM', 'NIGHT', 'MORNING', 'EVENING', 'TODAY', 'WEEK', 'YEAR',
  'FRIEND', 'FAMILY', 'SISTER', 'BROTHER', 'MOTHER', 'FATHER', 'BABY', 'CHILD',
  'SCHOOL', 'BOOK', 'READ', 'WRITE', 'LEARN', 'STUDY', 'CLASS', 'TEACHER',
  'MONEY', 'GOLD', 'SILVER', 'JEWEL', 'RING', 'CROWN', 'PEARL', 'DIAMOND',
  'OCEAN', 'ISLAND', 'FOREST', 'DESERT', 'MOUNTAIN', 'VALLEY', 'HILL', 'LAKE',
  'WINTER', 'SUMMER', 'SPRING', 'AUTUMN', 'SEASON', 'WEATHER', 'STORM', 'BREEZE',
];

const LEXICON = new Set([...bridgeWordList(), ...EXTRA_WORDS]);

export function jinxLexicon(): string[] {
  return [...LEXICON];
}

/** Can `word` be built from `letters` (with multiplicity)? */
export function canBuild(word: string, letters: string): boolean {
  const counts = new Map<string, number>();
  for (const ch of letters) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  for (const ch of word) {
    const left = counts.get(ch) ?? 0;
    if (left <= 0) return false;
    counts.set(ch, left - 1);
  }
  return true;
}

/** Every lexicon word (3+ letters) constructible from the bag. */
export function findableWords(letters: string): string[] {
  const out: string[] = [];
  for (const w of LEXICON) {
    if (w.length >= 3 && canBuild(w, letters)) out.push(w);
  }
  return out;
}

export interface JinxGame {
  letters: string;
  /** All findable words, for the bot and for validation. */
  findable: string[];
}

export function generateJinx(seed: string, level: number): JinxGame {
  const rng = rngFromSeed(`jinx|${seed}|${level}`);
  const words = [...LEXICON].filter((w) => w.length >= 4 && w.length <= 6);
  for (let attempt = 0; attempt < 200; attempt++) {
    const base = words[Math.floor(rng() * words.length)]!;
    const bag: string[] = base.split('');
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    while (bag.length < 9) {
      bag.push(alphabet[Math.floor(rng() * alphabet.length)]!);
    }
    const letters = shuffle(bag, rng).join('');
    const findable = findableWords(letters);
    if (findable.length >= 12) return { letters, findable };
  }
  // Fallback bag with a known-good word set.
  const letters = 'AEINRSTCD';
  return { letters, findable: findableWords(letters) };
}

/** Score: unique words score (length - 2); shared words (jinx) score 0. */
export function jinxScore(mine: string[], theirs: string[]): number {
  const theirsSet = new Set(theirs.map((w) => w.toUpperCase()));
  let score = 0;
  for (const raw of mine) {
    const w = raw.toUpperCase();
    if (theirsSet.has(w)) continue;
    score += Math.max(1, w.length - 2);
  }
  return score;
}

/** Words both players found — the jinxed ones. */
export function jinxShared(mine: string[], theirs: string[]): string[] {
  const theirsSet = new Set(theirs.map((w) => w.toUpperCase()));
  return mine.map((w) => w.toUpperCase()).filter((w) => theirsSet.has(w));
}

/** Is `word` a legal entry for this bag (in lexicon, buildable, new)? */
export function isValidJinxEntry(
  word: string,
  game: JinxGame,
  existing: string[],
): boolean {
  const w = word.trim().toUpperCase();
  if (w.length < 3) return false;
  if (!LEXICON.has(w)) return false;
  if (!canBuild(w, game.letters)) return false;
  if (existing.map((e) => e.toUpperCase()).includes(w)) return false;
  return true;
}

/** Bot list: a seeded slice of the findable words, sized by level. */
export function jinxBotList(game: JinxGame, level: number, seed: string): string[] {
  const rng = rngFromSeed(`${seed}|jinxbot`);
  const pool = shuffle(game.findable, rng);
  const target = level <= 10 ? 5 : level <= 30 ? 8 : level <= 60 ? 11 : 14;
  return pool.slice(0, Math.min(target, pool.length));
}
