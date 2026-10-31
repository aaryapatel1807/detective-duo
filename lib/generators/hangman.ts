/**
 * Hangman — classic word-guessing, Duo Corner.
 *
 * Studied from the classic rules: a hidden word is shown as blanks,
 * the guesser picks one letter at a time, a correct letter fills every
 * matching position, a wrong letter costs one of 6 lives, and the round
 * ends when the word is completed (win) or the lives run out (lose).
 * A free hint reveals one unrevealed letter and never costs a life.
 *
 * Pure logic, no React: the page drives guesses turn by turn and tests
 * can replay exact games. The word bank is original — common everyday
 * words grouped by category, written for this game. Words get longer
 * with the level, following the shared ladder (Easy 1-10, Medium 11-30,
 * Hard 31-60, Expert 61+).
 */
import { pick, rngFromSeed } from './rng';

export const MAX_LIVES = 6;
export const MIN_WORD_LENGTH = 3;
export const MAX_WORD_LENGTH = 12;

export interface HangmanWord {
  word: string;
  category: string;
}

const EASY: HangmanWord[] = [
  { word: 'dog', category: 'Animals' },
  { word: 'fox', category: 'Animals' },
  { word: 'owl', category: 'Animals' },
  { word: 'bear', category: 'Animals' },
  { word: 'goat', category: 'Animals' },
  { word: 'lion', category: 'Animals' },
  { word: 'wolf', category: 'Animals' },
  { word: 'frog', category: 'Animals' },
  { word: 'duck', category: 'Animals' },
  { word: 'mouse', category: 'Animals' },
  { word: 'rice', category: 'Food' },
  { word: 'plum', category: 'Food' },
  { word: 'pear', category: 'Food' },
  { word: 'apple', category: 'Food' },
  { word: 'bread', category: 'Food' },
  { word: 'mango', category: 'Food' },
  { word: 'lemon', category: 'Food' },
  { word: 'pasta', category: 'Food' },
  { word: 'melon', category: 'Food' },
  { word: 'grape', category: 'Food' },
  { word: 'park', category: 'Places' },
  { word: 'town', category: 'Places' },
  { word: 'shop', category: 'Places' },
  { word: 'hill', category: 'Places' },
  { word: 'lake', category: 'Places' },
  { word: 'farm', category: 'Places' },
  { word: 'road', category: 'Places' },
  { word: 'port', category: 'Places' },
  { word: 'camp', category: 'Places' },
  { word: 'river', category: 'Places' },
  { word: 'comb', category: 'Things' },
  { word: 'sock', category: 'Things' },
  { word: 'belt', category: 'Things' },
  { word: 'rope', category: 'Things' },
  { word: 'kite', category: 'Things' },
  { word: 'shoe', category: 'Things' },
  { word: 'chair', category: 'Things' },
  { word: 'clock', category: 'Things' },
  { word: 'spoon', category: 'Things' },
  { word: 'shirt', category: 'Things' },
];

const MEDIUM: HangmanWord[] = [
  { word: 'monkey', category: 'Animals' },
  { word: 'donkey', category: 'Animals' },
  { word: 'badger', category: 'Animals' },
  { word: 'falcon', category: 'Animals' },
  { word: 'beaver', category: 'Animals' },
  { word: 'turtle', category: 'Animals' },
  { word: 'jaguar', category: 'Animals' },
  { word: 'coyote', category: 'Animals' },
  { word: 'gorilla', category: 'Animals' },
  { word: 'cheetah', category: 'Animals' },
  { word: 'banana', category: 'Food' },
  { word: 'carrot', category: 'Food' },
  { word: 'cheese', category: 'Food' },
  { word: 'butter', category: 'Food' },
  { word: 'ginger', category: 'Food' },
  { word: 'potato', category: 'Food' },
  { word: 'walnut', category: 'Food' },
  { word: 'almond', category: 'Food' },
  { word: 'pickle', category: 'Food' },
  { word: 'tomato', category: 'Food' },
  { word: 'pumpkin', category: 'Food' },
  { word: 'spinach', category: 'Food' },
  { word: 'apricot', category: 'Food' },
  { word: 'coconut', category: 'Food' },
  { word: 'valley', category: 'Places' },
  { word: 'island', category: 'Places' },
  { word: 'meadow', category: 'Places' },
  { word: 'village', category: 'Places' },
  { word: 'castle', category: 'Places' },
  { word: 'desert', category: 'Places' },
  { word: 'jungle', category: 'Places' },
  { word: 'stream', category: 'Places' },
  { word: 'tunnel', category: 'Places' },
  { word: 'cottage', category: 'Places' },
  { word: 'orchard', category: 'Places' },
  { word: 'school', category: 'Places' },
  { word: 'temple', category: 'Places' },
  { word: 'jacket', category: 'Things' },
  { word: 'ladder', category: 'Things' },
  { word: 'mirror', category: 'Things' },
  { word: 'basket', category: 'Things' },
  { word: 'button', category: 'Things' },
  { word: 'pocket', category: 'Things' },
  { word: 'hammer', category: 'Things' },
  { word: 'saddle', category: 'Things' },
  { word: 'guitar', category: 'Things' },
  { word: 'rocket', category: 'Things' },
  { word: 'compass', category: 'Things' },
  { word: 'helmet', category: 'Things' },
  { word: 'umbrella', category: 'Things' },
];

const HARD: HangmanWord[] = [
  { word: 'elephant', category: 'Animals' },
  { word: 'kangaroo', category: 'Animals' },
  { word: 'flamingo', category: 'Animals' },
  { word: 'porcupine', category: 'Animals' },
  { word: 'crocodile', category: 'Animals' },
  { word: 'squirrel', category: 'Animals' },
  { word: 'antelope', category: 'Animals' },
  { word: 'reindeer', category: 'Animals' },
  { word: 'broccoli', category: 'Food' },
  { word: 'zucchini', category: 'Food' },
  { word: 'eggplant', category: 'Food' },
  { word: 'hazelnut', category: 'Food' },
  { word: 'pineapple', category: 'Food' },
  { word: 'blueberry', category: 'Food' },
  { word: 'asparagus', category: 'Food' },
  { word: 'artichoke', category: 'Food' },
  { word: 'spaghetti', category: 'Food' },
  { word: 'vineyard', category: 'Places' },
  { word: 'windmill', category: 'Places' },
  { word: 'fortress', category: 'Places' },
  { word: 'cemetery', category: 'Places' },
  { word: 'peninsula', category: 'Places' },
  { word: 'waterfall', category: 'Places' },
  { word: 'coastline', category: 'Places' },
  { word: 'boulevard', category: 'Places' },
  { word: 'backpack', category: 'Things' },
  { word: 'suitcase', category: 'Things' },
  { word: 'wardrobe', category: 'Things' },
  { word: 'keyboard', category: 'Things' },
  { word: 'airplane', category: 'Things' },
  { word: 'tricycle', category: 'Things' },
  { word: 'harmonica', category: 'Things' },
  { word: 'bookshelf', category: 'Things' },
];

const EXPERT: HangmanWord[] = [
  { word: 'hippopotamus', category: 'Animals' },
  { word: 'chimpanzee', category: 'Animals' },
  { word: 'caterpillar', category: 'Animals' },
  { word: 'grasshopper', category: 'Animals' },
  { word: 'nightingale', category: 'Animals' },
  { word: 'rattlesnake', category: 'Animals' },
  { word: 'hummingbird', category: 'Animals' },
  { word: 'salamander', category: 'Animals' },
  { word: 'watermelon', category: 'Food' },
  { word: 'blackberry', category: 'Food' },
  { word: 'pomegranate', category: 'Food' },
  { word: 'cauliflower', category: 'Food' },
  { word: 'elderberry', category: 'Food' },
  { word: 'marshmallow', category: 'Food' },
  { word: 'observatory', category: 'Places' },
  { word: 'university', category: 'Places' },
  { word: 'marketplace', category: 'Places' },
  { word: 'playground', category: 'Places' },
  { word: 'campground', category: 'Places' },
  { word: 'crossroads', category: 'Places' },
  { word: 'waterfront', category: 'Places' },
  { word: 'skyscraper', category: 'Places' },
  { word: 'toothbrush', category: 'Things' },
  { word: 'typewriter', category: 'Things' },
  { word: 'microphone', category: 'Things' },
  { word: 'flashlight', category: 'Things' },
  { word: 'skateboard', category: 'Things' },
  { word: 'snowmobile', category: 'Things' },
  { word: 'binoculars', category: 'Things' },
  { word: 'kaleidoscope', category: 'Things' },
];

/** The word pool for a level — words get longer as the level climbs. */
export function wordsForLevel(level: number): HangmanWord[] {
  if (level <= 10) return EASY;
  if (level <= 30) return MEDIUM;
  if (level <= 60) return HARD;
  return EXPERT;
}

/** Every banked word, for the two-player seeded mode (any difficulty). */
export function allWords(): HangmanWord[] {
  return [...EASY, ...MEDIUM, ...HARD, ...EXPERT];
}

/** Seeded word for a solo level: same seed + level always picks the same word. */
export function generateHangman(seed: string, level: number): HangmanWord {
  const rng = rngFromSeed(`hangman|${seed}|${level}`);
  return pick(wordsForLevel(level), rng);
}

/** Seeded word from the whole bank (two-player seeded mode). */
export function generateAnyHangman(seed: string): HangmanWord {
  return pick(allWords(), rngFromSeed(`hangman|any|${seed}`));
}

export type HangmanStatus = 'playing' | 'won' | 'lost';

export interface HangmanState {
  word: string;
  category: string;
  /** Letters guessed so far, in guess order (correct, wrong, and hinted). */
  guessed: string[];
  /** Free hints used (never costs a life). */
  hintsUsed: number;
  lives: number;
  status: HangmanStatus;
}

export function createHangmanWord(entry: HangmanWord): HangmanState {
  return {
    word: entry.word.toLowerCase(),
    category: entry.category,
    guessed: [],
    hintsUsed: 0,
    lives: MAX_LIVES,
    status: 'playing',
  };
}

export function createHangmanGame(seed: string, level: number): HangmanState {
  return createHangmanWord(generateHangman(seed, level));
}

/**
 * Validate a pass-and-play custom word. Letters only, 3–12 letters;
 * surrounding spaces and upper case are normalised away. Returns the
 * normalised word, or null when the input is not a playable word.
 */
export function parseCustomWord(raw: string): string | null {
  const word = raw.trim().toLowerCase();
  if (word.length < MIN_WORD_LENGTH || word.length > MAX_WORD_LENGTH) return null;
  if (!/^[a-z]+$/.test(word)) return null;
  return word;
}

/** A custom-word game for pass-and-play; null when the word is invalid. */
export function createCustomHangmanGame(raw: string): HangmanState | null {
  const word = parseCustomWord(raw);
  if (word === null) return null;
  return createHangmanWord({ word, category: 'Set by your partner' });
}

/** The word as revealed so far: known letters, '_' for hidden ones. */
export function maskedWord(state: HangmanState): string[] {
  return state.word
    .split('')
    .map((ch) => (state.guessed.includes(ch) ? ch : '_'));
}

export function wrongGuesses(state: HangmanState): string[] {
  return state.guessed.filter((ch) => !state.word.includes(ch));
}

function withGuess(state: HangmanState, letter: string): HangmanState {
  const guessed = [...state.guessed, letter];
  const correct = state.word.includes(letter);
  const lives = correct ? state.lives : state.lives - 1;
  const won = state.word.split('').every((ch) => guessed.includes(ch));
  const status: HangmanStatus = won ? 'won' : lives <= 0 ? 'lost' : 'playing';
  return { ...state, guessed, lives: Math.max(0, lives), status };
}

/**
 * Guess one letter. Invalid guesses (not a single a–z letter, already
 * guessed, or a finished game) are no-ops and return the same state.
 * A correct guess reveals every matching position; a wrong guess
 * costs exactly one life.
 */
export function guessLetter(state: HangmanState, raw: string): HangmanState {
  if (state.status !== 'playing') return state;
  const letter = raw.toLowerCase();
  if (!/^[a-z]$/.test(letter)) return state;
  if (state.guessed.includes(letter)) return state;
  return withGuess(state, letter);
}

/**
 * Free hint: reveals the first still-hidden letter (in word order),
 * filling every matching position. No life is lost. A no-op when the
 * game is finished or nothing is left to reveal.
 */
export function revealHint(state: HangmanState): HangmanState {
  if (state.status !== 'playing') return state;
  const next = state.word.split('').find((ch) => !state.guessed.includes(ch));
  if (next === undefined) return state;
  const revealed = withGuess(state, next);
  return { ...revealed, hintsUsed: state.hintsUsed + 1 };
}
