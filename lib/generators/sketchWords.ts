/**
 * Sketch the Clue word banks + toy classifier (Duo Corner).
 *
 * Words are grouped by theme: mystery, cozy, food, and places we have
 * been. Levels favour shorter, simpler words early and longer ones later.
 *
 * The solo "guesser" is deliberately simple and playful, but it is
 * precise about what it measures: stroke count, bounding-box aspect
 * ratio, whether a long stroke closes into a loop, ink length, and
 * left/right + top/bottom ink symmetry. Each word in the bank has a
 * hand-written shape profile (expected aspect, closure, stroke count,
 * symmetry, ink ratio), and candidates are SCORED against the measured
 * features — no random pick from a shape bucket. It is still not real
 * image recognition, it is often wrong, and the UI says so.
 */

import { rngFromSeed } from './rng';

export type SketchTheme = 'mystery' | 'cozy' | 'food' | 'places';
export const SKETCH_THEMES: { id: SketchTheme; label: string }[] = [
  { id: 'mystery', label: 'Mystery' },
  { id: 'cozy', label: 'Cozy' },
  { id: 'food', label: 'Food' },
  { id: 'places', label: 'Places we have been' },
];

export interface SketchWord {
  word: string;
  hint: string;
}

export const SKETCH_WORDS: Record<SketchTheme, SketchWord[]> = {
  mystery: [
    { word: 'key', hint: 'Small, opens something bigger.' },
    { word: 'lamp', hint: 'It keeps the desk lit at night.' },
    { word: 'map', hint: 'Folded, and full of secrets.' },
    { word: 'clue', hint: 'A small thing that changes everything.' },
    { word: 'mask', hint: 'Worn to hide a face.' },
    { word: 'magnifier', hint: 'Makes tiny things big.' },
    { word: 'footprint', hint: 'Left behind in the mud.' },
    { word: 'notebook', hint: 'Where Sachi writes it all down.' },
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

/** Everything the toy guesser actually measures from the strokes. */
export interface DrawingFeatures {
  strokeCount: number;
  width: number;
  height: number;
  /** Bounding-box width / height (1 when degenerate, so it is always finite). */
  aspectRatio: number;
  /** Total ink length in canvas pixels. */
  inkLength: number;
  /** Ink length relative to bounding-box size: ~1 for a straight line, ~1.6 for a circle, higher for scribbles. */
  inkRatio: number;
  /** True when a long stroke ends near where it started (a loop). */
  closed: boolean;
  /** 0-1: how evenly ink is split left/right and top/bottom (1 = perfectly symmetric). */
  symmetry: number;
}

/**
 * Hand-written shape profile for one bank word:
 * expected aspect ratio, closure (0 = open, 1 = loop), stroke count,
 * symmetry, and ink ratio. These are rough drawing intuitions, not
 * measurements of real art — the guesser is a toy, and says so.
 */
interface ShapeProfile {
  aspect: number;
  closed: number;
  strokes: number;
  symmetry: number;
  ink: number;
}

const SHAPE_PROFILES: Record<string, ShapeProfile> = {
  // mystery
  key: { aspect: 0.8, closed: 0, strokes: 3, symmetry: 0.3, ink: 1.4 },
  lamp: { aspect: 0.6, closed: 0, strokes: 3, symmetry: 0.8, ink: 1.3 },
  map: { aspect: 1.2, closed: 0, strokes: 3, symmetry: 0.4, ink: 1.6 },
  clue: { aspect: 0.7, closed: 0, strokes: 2, symmetry: 0.2, ink: 1.2 },
  mask: { aspect: 1.3, closed: 0, strokes: 3, symmetry: 0.9, ink: 1.4 },
  magnifier: { aspect: 1.0, closed: 1, strokes: 2, symmetry: 0.5, ink: 1.5 },
  footprint: { aspect: 0.7, closed: 0, strokes: 2, symmetry: 0.2, ink: 1.2 },
  notebook: { aspect: 0.8, closed: 0, strokes: 3, symmetry: 0.6, ink: 1.4 },
  fingerprint: { aspect: 1.0, closed: 1, strokes: 4, symmetry: 0.4, ink: 2.2 },
  lantern: { aspect: 0.8, closed: 0, strokes: 3, symmetry: 0.9, ink: 1.4 },
  telescope: { aspect: 1.8, closed: 0, strokes: 3, symmetry: 0.3, ink: 1.3 },
  disguise: { aspect: 1.3, closed: 0, strokes: 3, symmetry: 0.8, ink: 1.4 },
  // cozy
  mug: { aspect: 0.9, closed: 1, strokes: 2, symmetry: 0.5, ink: 1.5 },
  cat: { aspect: 1.2, closed: 0, strokes: 4, symmetry: 0.6, ink: 1.8 },
  book: { aspect: 0.8, closed: 0, strokes: 3, symmetry: 0.6, ink: 1.4 },
  blanket: { aspect: 1.5, closed: 0, strokes: 2, symmetry: 0.4, ink: 1.3 },
  candle: { aspect: 0.5, closed: 0, strokes: 3, symmetry: 0.9, ink: 1.2 },
  pillow: { aspect: 1.5, closed: 1, strokes: 1, symmetry: 0.7, ink: 1.4 },
  teapot: { aspect: 1.2, closed: 1, strokes: 3, symmetry: 0.4, ink: 1.6 },
  fireplace: { aspect: 1.0, closed: 0, strokes: 4, symmetry: 0.8, ink: 1.8 },
  slippers: { aspect: 1.6, closed: 0, strokes: 2, symmetry: 0.2, ink: 1.3 },
  rain: { aspect: 1.4, closed: 0, strokes: 5, symmetry: 0.3, ink: 1.5 },
  sweater: { aspect: 1.1, closed: 0, strokes: 4, symmetry: 0.8, ink: 1.8 },
  window: { aspect: 0.9, closed: 1, strokes: 4, symmetry: 0.9, ink: 1.6 },
  // food
  cake: { aspect: 1.2, closed: 0, strokes: 3, symmetry: 0.9, ink: 1.4 },
  soup: { aspect: 1.1, closed: 1, strokes: 2, symmetry: 0.6, ink: 1.4 },
  pizza: { aspect: 1.0, closed: 1, strokes: 3, symmetry: 0.7, ink: 1.8 },
  donut: { aspect: 1.0, closed: 1, strokes: 2, symmetry: 1.0, ink: 1.5 },
  noodles: { aspect: 1.2, closed: 0, strokes: 5, symmetry: 0.3, ink: 2.4 },
  pancake: { aspect: 1.3, closed: 1, strokes: 2, symmetry: 0.8, ink: 1.4 },
  popcorn: { aspect: 1.0, closed: 0, strokes: 4, symmetry: 0.5, ink: 1.9 },
  sandwich: { aspect: 1.4, closed: 0, strokes: 3, symmetry: 0.6, ink: 1.4 },
  'ice cream': { aspect: 0.8, closed: 0, strokes: 3, symmetry: 0.8, ink: 1.5 },
  chocolate: { aspect: 1.2, closed: 0, strokes: 4, symmetry: 0.7, ink: 1.8 },
  coffee: { aspect: 0.9, closed: 1, strokes: 2, symmetry: 0.5, ink: 1.4 },
  strawberry: { aspect: 0.9, closed: 0, strokes: 3, symmetry: 0.8, ink: 1.5 },
  // places
  beach: { aspect: 1.8, closed: 0, strokes: 4, symmetry: 0.3, ink: 1.6 },
  market: { aspect: 1.4, closed: 0, strokes: 5, symmetry: 0.3, ink: 2.0 },
  bridge: { aspect: 2.0, closed: 0, strokes: 3, symmetry: 0.9, ink: 1.4 },
  garden: { aspect: 1.3, closed: 0, strokes: 5, symmetry: 0.4, ink: 2.0 },
  station: { aspect: 1.2, closed: 0, strokes: 4, symmetry: 0.5, ink: 1.6 },
  library: { aspect: 0.7, closed: 0, strokes: 4, symmetry: 0.8, ink: 1.6 },
  cafe: { aspect: 1.1, closed: 0, strokes: 3, symmetry: 0.5, ink: 1.5 },
  mountain: { aspect: 1.2, closed: 0, strokes: 2, symmetry: 0.9, ink: 1.2 },
  harbour: { aspect: 1.6, closed: 0, strokes: 4, symmetry: 0.4, ink: 1.7 },
  forest: { aspect: 1.2, closed: 0, strokes: 5, symmetry: 0.3, ink: 2.0 },
  bakery: { aspect: 1.1, closed: 0, strokes: 3, symmetry: 0.5, ink: 1.5 },
  cinema: { aspect: 1.5, closed: 0, strokes: 3, symmetry: 0.6, ink: 1.4 },
};

const DEFAULT_PROFILE: ShapeProfile = { aspect: 1.0, closed: 0, strokes: 3, symmetry: 0.5, ink: 1.5 };

/** Measure stroke features. Pure, deterministic, no drawing interpretation. */
export function measureDrawing(strokes: Stroke[]): DrawingFeatures {
  if (!strokes.length) {
    return {
      strokeCount: 0,
      width: 0,
      height: 0,
      aspectRatio: 1,
      inkLength: 0,
      inkRatio: 0,
      closed: false,
      symmetry: 0.5,
    };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let ink = 0;
  let leftInk = 0;
  let rightInk = 0;
  let topInk = 0;
  let bottomInk = 0;
  // First pass for the bounding box, so symmetry can use its centre.
  for (const s of strokes) {
    for (const [x, y] of s.points) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  const width = maxX - minX;
  const height = maxY - minY;
  const centreX = (minX + maxX) / 2;
  const centreY = (minY + maxY) / 2;
  for (const s of strokes) {
    for (let i = 1; i < s.points.length; i++) {
      const [px, py] = s.points[i - 1];
      const [x, y] = s.points[i];
      const len = Math.hypot(x - px, y - py);
      ink += len;
      const mx = (px + x) / 2;
      const my = (py + y) / 2;
      if (mx < centreX) leftInk += len;
      else if (mx > centreX) rightInk += len;
      if (my < centreY) topInk += len;
      else if (my > centreY) bottomInk += len;
    }
  }
  const size = Math.max(width, height);
  let closed = false;
  for (const s of strokes) {
    if (s.points.length < 8) continue;
    const [fx, fy] = s.points[0];
    const [lx, ly] = s.points[s.points.length - 1];
    if (Math.hypot(lx - fx, ly - fy) < size * 0.35) closed = true;
  }
  const symX = leftInk + rightInk > 0 ? 1 - Math.abs(leftInk - rightInk) / (leftInk + rightInk) : 0.5;
  const symY = topInk + bottomInk > 0 ? 1 - Math.abs(topInk - bottomInk) / (topInk + bottomInk) : 0.5;
  return {
    strokeCount: strokes.length,
    width,
    height,
    aspectRatio: width === 0 && height === 0 ? 1 : (width || 1) / (height || 1),
    inkLength: Math.round(ink),
    inkRatio: size > 0 ? ink / (width + height || 1) : 0,
    closed,
    symmetry: (symX + symY) / 2,
  };
}

function archetypeOf(f: DrawingFeatures, strokes: Stroke[]): string {
  if (!strokes.length) return 'line';
  if (f.closed && f.aspectRatio > 0.6 && f.aspectRatio < 1.6) return 'round';
  if (f.aspectRatio < 0.66) return 'tall';
  if (f.aspectRatio > 1.5) return 'wide';
  if (f.strokeCount >= 4) return 'many';
  if (f.strokeCount === 1 && f.inkLength > 0) {
    const s = strokes[0];
    const [fx, fy] = s.points[0];
    const [lx, ly] = s.points[s.points.length - 1];
    if (Math.hypot(lx - fx, ly - fy) / f.inkLength > 0.8) return 'line';
  }
  return 'many';
}

function profileScore(f: DrawingFeatures, p: ShapeProfile): number {
  const aspect = 1 - Math.min(1, Math.abs(f.aspectRatio - p.aspect) / 2);
  const closed = f.closed ? p.closed : 1 - p.closed;
  const strokes = 1 - Math.min(1, Math.abs(Math.min(f.strokeCount, 6) - p.strokes) / 5);
  const symmetry = 1 - Math.abs(f.symmetry - p.symmetry);
  const ink = 1 - Math.min(1, Math.abs(f.inkRatio - p.ink) / 2);
  return aspect * 0.3 + closed * 0.25 + strokes * 0.2 + symmetry * 0.15 + ink * 0.1;
}

export interface ToyGuess {
  archetype: string;
  guess: string;
  note: string;
  /** Second-best scoring candidate in the same theme. A hint only — it never counts as a win. */
  secondGuess?: string;
  features: DrawingFeatures;
}

export const CLASSIFIER_NOTE =
  'This guesser only measures stroke shapes — stroke count, aspect ratio, closure, ink length and symmetry — and scores words in the current theme by how well their hand-written shape profile fits. No image recognition, no ML, and it is often wrong, and that is the joke.';

/**
 * Toy classification, scored not random: measure the drawing, score
 * every word in the theme bank against its shape profile, and return
 * the best (plus the runner-up). Deterministic — the seed is accepted
 * for call-site compatibility and does not affect the ranking.
 */
export function classifyDrawing(strokes: Stroke[], _seed: string, theme: SketchTheme = 'cozy'): ToyGuess {
  const features = measureDrawing(strokes);
  const ranked = SKETCH_WORDS[theme]
    .map((w) => ({ word: w.word, score: profileScore(features, SHAPE_PROFILES[w.word] ?? DEFAULT_PROFILE) }))
    .sort((a, b) => b.score - a.score);
  const [best, second] = ranked as [{ word: string; score: number }, { word: string; score: number } | undefined];
  const archetype = archetypeOf(features, strokes);
  const note =
    `I measured ${features.strokeCount} ${features.strokeCount === 1 ? 'stroke' : 'strokes'}, ` +
    `${features.closed ? 'a closed loop' : 'no closed loop'}, ` +
    `aspect ${features.aspectRatio.toFixed(1)} (${features.width}×${features.height}), ` +
    `ink ${features.inkLength}px, symmetry ${features.symmetry.toFixed(2)} — ` +
    `so ${best.word} fits best${second ? `, then ${second.word}` : ''}.`;
  return {
    archetype,
    guess: best.word,
    note,
    secondGuess: second?.word,
    features,
  };
}

/** Edit distance (Levenshtein) between two normalised strings. */
function editDistance(a: string, b: string): number {
  const rows = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = rows[0];
    rows[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = rows[j];
      rows[j] = Math.min(rows[j] + 1, rows[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
  }
  return rows[b.length];
}

export type GuessCloseness = 'exact' | 'close' | 'far';

export interface GuessClosenessResult {
  closeness: GuessCloseness;
  /** Why this label, in plain words. Empty for exact. */
  reason: string;
  distance: number;
}

/**
 * Closeness of a together-mode guess to the target word.
 * Exact = normalised equality (this is the only win). Close = ANY of:
 * edit distance 1-2, same letter count (spaces ignored), or the same
 * first letter. Otherwise far. Defined here, in one place, so the UI
 * and the tests agree.
 */
export function guessCloseness(guess: string, target: string): GuessClosenessResult {
  const g = normaliseGuess(guess);
  const t = normaliseGuess(target);
  if (g === t) return { closeness: 'exact', reason: '', distance: 0 };
  const distance = editDistance(g, t);
  if (distance >= 1 && distance <= 2) {
    return { closeness: 'close', reason: `${distance} ${distance === 1 ? 'letter' : 'letters'} off`, distance };
  }
  const gLen = g.replace(/ /g, '').length;
  const tLen = t.replace(/ /g, '').length;
  if (gLen > 0 && gLen === tLen) {
    return { closeness: 'close', reason: 'same length', distance };
  }
  if (g.length > 0 && g[0] === t[0]) {
    return { closeness: 'close', reason: 'same first letter', distance };
  }
  return { closeness: 'far', reason: '', distance };
}

/** Blanks for the guesser: letters hidden, spaces kept. 'ice cream' -> '___ _____'. */
export function sketchBlanks(word: string): string {
  return word.replace(/[a-z]/gi, '_');
}

/** First-letter hint, revealed only after at least 3 wrong guesses. */
export function sketchFirstLetterHint(word: string, wrongCount: number): string | null {
  if (wrongCount < 3) return null;
  const first = word.trim().charAt(0);
  return first ? first : null;
}

export function normaliseGuess(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z ]/g, '');
}
