/**
 * Sketch the Clue word banks + toy classifier (Duo Corner).
 *
 * Words are grouped by theme: detective, cozy, food, and places we have
 * been. Levels favour shorter, simpler words early and longer ones later.
 *
 * The solo "guesser" is deliberately simple and playful: it looks only
 * at the shape of the strokes (round, tall, wide, many strokes, one
 * line) and guesses a word that fits that shape. It is not real image
 * recognition, it is often wrong, and the UI says so.
 */

import { rngFromSeed } from './rng';

export type SketchTheme = 'detective' | 'cozy' | 'food' | 'places';
export const SKETCH_THEMES: { id: SketchTheme; label: string }[] = [
  { id: 'detective', label: 'Detective' },
  { id: 'cozy', label: 'Cozy' },
  { id: 'food', label: 'Food' },
  { id: 'places', label: 'Places we have been' },
];

export interface SketchWord {
  word: string;
  hint: string;
}

export const SKETCH_WORDS: Record<SketchTheme, SketchWord[]> = {
  detective: [
    { word: 'key', hint: 'Small, opens something bigger.' },
    { word: 'lamp', hint: 'It keeps the desk lit at night.' },
    { word: 'map', hint: 'Folded, and full of secrets.' },
    { word: 'clue', hint: 'A small thing that changes everything.' },
    { word: 'mask', hint: 'Worn to hide a face.' },
    { word: 'magnifier', hint: 'Makes tiny things big.' },
    { word: 'footprint', hint: 'Left behind in the mud.' },
    { word: 'notebook', hint: 'Where the detective writes it all down.' },
    { word: 'fingerprint', hint: 'No two are the same.' },
    { word: 'lantern', hint: 'Carried into the dark.' },
    { word: 'telescope', hint: 'For watching from far away.' },
    { word: 'disguise', hint: 'A different face for the evening.' },
  ],
  cozy: [
    { word: 'mug', hint: 'Warm drink, favourite chair.' },
    { word: 'cat', hint: 'Asleep in the sunny spot.' },
    { word: 'book', hint: 'One more chapter, then sleep.' },
    { word: 'blanket', hint: 'For cold evenings and long films.' },
    { word: 'candle', hint: 'A small flame against the rain.' },
    { word: 'pillow', hint: 'Soft, and hogged by someone.' },
    { word: 'teapot', hint: 'Pours comfort, one cup at a time.' },
    { word: 'fireplace', hint: 'Crackling in the corner.' },
    { word: 'slippers', hint: 'Worn the moment you get home.' },
    { word: 'rain', hint: 'On the window, all evening.' },
    { word: 'sweater', hint: 'Knitted, slightly too big.' },
    { word: 'window', hint: 'Where you watch the weather.' },
  ],
  food: [
    { word: 'cake', hint: 'For birthdays, or Tuesdays.' },
    { word: 'soup', hint: 'Best when it is cold outside.' },
    { word: 'pizza', hint: 'Shared, never quite even slices.' },
    { word: 'donut', hint: 'Round, sweet, gone too fast.' },
    { word: 'noodles', hint: 'Twirled, slurped, loved.' },
    { word: 'pancake', hint: 'A stack, with something sweet on top.' },
    { word: 'popcorn', hint: 'For films, half of it on the floor.' },
    { word: 'sandwich', hint: 'Two slices and whatever is in the fridge.' },
    { word: 'ice cream', hint: 'Melts faster than you can eat it.' },
    { word: 'chocolate', hint: 'One square becomes the whole bar.' },
    { word: 'coffee', hint: 'The morning starts here.' },
    { word: 'strawberry', hint: 'Red, sweet, summer in a bite.' },
  ],
  places: [
    { word: 'beach', hint: 'Sand, sea, and nowhere to be.' },
    { word: 'market', hint: 'Loud, colourful, full of smells.' },
    { word: 'bridge', hint: 'Over the river, into town.' },
    { word: 'garden', hint: 'Quiet, green, and someone else did the work.' },
    { word: 'station', hint: 'Trains, announcements, goodbyes.' },
    { word: 'library', hint: 'Quiet, tall shelves, endless stories.' },
    { word: 'cafe', hint: 'Small tables, big conversations.' },
    { word: 'mountain', hint: 'Tall, cold, worth the climb.' },
    { word: 'harbour', hint: 'Boats bobbing, gulls overhead.' },
    { word: 'forest', hint: 'Trees, paths, and getting happily lost.' },
    { word: 'bakery', hint: 'Warm bread smell from the street.' },
    { word: 'cinema', hint: 'Dark room, bright screen, shared gasps.' },
  ],
};

/** Max word length per tier, so early levels stay drawable. */
function maxLenForLevel(level: number): number {
  if (level <= 10) return 5;
  if (level <= 30) return 7;
  if (level <= 60) return 9;
  return 99;
}

export function pickWord(seed: string, level: number, theme: SketchTheme): SketchWord {
  const rng = rngFromSeed(seed);
  const bank = SKETCH_WORDS[theme];
  const maxLen = maxLenForLevel(level);
  const fitting = bank.filter((w) => w.word.replace(/ /g, '').length <= maxLen);
  const pool = fitting.length ? fitting : bank;
  return pool[Math.floor(rng() * pool.length)];
}

/** Pick a theme at random (seeded) for a round. */
export function pickTheme(seed: string): SketchTheme {
  const rng = rngFromSeed(seed);
  return SKETCH_THEMES[Math.floor(rng() * SKETCH_THEMES.length)].id;
}

export interface Stroke {
  points: [number, number][];
}

export interface ToyGuess {
  archetype: string;
  guess: string;
  note: string;
}

export const CLASSIFIER_NOTE =
  'This guesser only sees shapes, not art. It is often wrong, and that is the joke.';

const SHAPE_GUESSES: Record<string, string[]> = {
  round: ['moon', 'donut', 'balloon', 'cookie', 'orange'],
  tall: ['lamp', 'tree', 'bottle', 'candle', 'tower'],
  wide: ['car', 'cat', 'book', 'bridge', 'snake'],
  many: ['house', 'bicycle', 'flower', 'spider', 'cat'],
  line: ['snake', 'river', 'rope', 'road', 'candle'],
};

function shapeOf(strokes: Stroke[]): string {
  if (!strokes.length) return 'line';
  if (strokes.length >= 4) return 'many';
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let ink = 0;
  for (const s of strokes) {
    for (let i = 0; i < s.points.length; i++) {
      const [x, y] = s.points[i];
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      if (i > 0) {
        const [px, py] = s.points[i - 1];
        ink += Math.hypot(x - px, y - py);
      }
    }
  }
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  // Closed loop? The longest stroke ends near where it started.
  let closed = false;
  for (const s of strokes) {
    if (s.points.length < 8) continue;
    const [fx, fy] = s.points[0];
    const [lx, ly] = s.points[s.points.length - 1];
    const size = Math.max(w, h);
    if (Math.hypot(lx - fx, ly - fy) < size * 0.35) closed = true;
  }
  if (closed && w / h > 0.6 && w / h < 1.6) return 'round';
  if (h > w * 1.5) return 'tall';
  if (w > h * 1.5) return 'wide';
  if (strokes.length === 1 && ink > 0) {
    const s = strokes[0];
    const [fx, fy] = s.points[0];
    const [lx, ly] = s.points[s.points.length - 1];
    if (Math.hypot(lx - fx, ly - fy) / ink > 0.8) return 'line';
  }
  return 'many';
}

/** Toy classification: shape vibe -> a word that fits that shape. */
export function classifyDrawing(strokes: Stroke[], seed: string): ToyGuess {
  const rng = rngFromSeed(seed);
  const shape = shapeOf(strokes);
  const pool = SHAPE_GUESSES[shape] ?? SHAPE_GUESSES.line;
  const guess = pool[Math.floor(rng() * pool.length)];
  return {
    archetype: shape,
    guess,
    note:
      shape === 'round'
        ? 'I see a round shape, so I am guessing something round.'
        : shape === 'tall'
          ? 'I see something tall, so I am guessing something tall.'
          : shape === 'wide'
            ? 'I see something wide, so I am guessing something wide.'
            : shape === 'many'
              ? 'I see lots of little strokes, so I am guessing something fiddly.'
              : 'I see one long line, so I am guessing something long.',
  };
}

export function normaliseGuess(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z ]/g, '');
}
