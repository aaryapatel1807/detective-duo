/**
 * Word Search generator.
 *
 * Pure functions: a seed string goes in, a puzzle comes out. The same
 * seed always produces the same puzzle (FNV-1a + mulberry32, same
 * pattern as lib/generators/logicGrid.ts).
 *
 * Words come from hand-written themed banks (no generated filler
 * words). Placement tries longest words first and only overlaps on
 * matching letters, so every listed word is present in the grid.
 * Directions widen with the ladder: Easy reads right/down, Medium
 * adds left/up, Hard adds the downward diagonals, Expert uses all 8.
 */
export function hashSeed(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seedNum: number): () => number {
  let a = seedNum >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// --------------------------------------------------------------- banks ----

export interface WordTheme {
  theme: string;
  words: string[];
}

export const WORD_THEMES: WordTheme[] = [
  {
    theme: 'Café',
    words: ['TEAPOT', 'CHAI', 'SCONE', 'MUFFIN', 'LATTE', 'BISCUIT', 'HONEY', 'SAUCER', 'BARISTA', 'CINNAMON', 'CROISSANT', 'ESPRESSO', 'MACARON', 'WAFFLE', 'COCOA', 'KETTLE', 'PASTRY', 'VANILLA'],
  },
  {
    theme: 'Garden',
    words: ['ROSE', 'TULIP', 'DAISY', 'LAVENDER', 'SUNFLOWER', 'SEED', 'WATERING', 'PETAL', 'GARDENER', 'BUTTERFLY', 'DAFFODIL', 'JASMINE', 'HERB', 'PRUNING', 'COMPOST', 'BLOSSOM', 'THYME', 'MINT'],
  },
  {
    theme: 'Library',
    words: ['BOOK', 'NOVEL', 'READER', 'SHELF', 'CHAPTER', 'MYSTERY', 'AUTHOR', 'POETRY', 'ATLAS', 'BOOKMARK', 'LIBRARIAN', 'PAPERBACK', 'STORY', 'LETTER', 'ARCHIVE', 'BINDING', 'VOLUME', 'QUILL'],
  },
  {
    theme: 'Seaside',
    words: ['SHELL', 'TIDE', 'HARBOUR', 'LIGHTHOUSE', 'SAILOR', 'ANCHOR', 'SEAGULL', 'PEBBLE', 'BUOY', 'DOLPHIN', 'CORAL', 'WAVE', 'SANDCASTLE', 'STARFISH', 'FERRY', 'SEAWEED', 'CAPTAIN', 'BREEZE'],
  },
  {
    theme: 'Train journey',
    words: ['TICKET', 'STATION', 'CARRIAGE', 'PLATFORM', 'CONDUCTOR', 'LUGGAGE', 'JOURNEY', 'WHISTLE', 'TRACK', 'PASSENGER', 'TIMETABLE', 'SLEEPER', 'SIGNAL', 'ENGINE', 'COACH', 'RAILWAY', 'DESTINATION', 'PORTER'],
  },
  {
    theme: 'Bakery',
    words: ['BREAD', 'FLOUR', 'OVEN', 'DOUGH', 'TART', 'CAKE', 'YEAST', 'BUTTER', 'CUPCAKE', 'GINGERBREAD', 'PRETZEL', 'BAGUETTE', 'FROSTING', 'SHORTBREAD', 'CRUST', 'ROLL', 'SUGAR', 'BAKER'],
  },
  {
    theme: 'Rainy day',
    words: ['UMBRELLA', 'PUDDLE', 'THUNDER', 'RAINCOAT', 'DRIZZLE', 'STORM', 'LIGHTNING', 'RAINBOW', 'GALOSHES', 'MIST', 'CLOUD', 'DOWNPOUR', 'SPLASH', 'WET', 'SOUP', 'FIREPLACE', 'BLANKET', 'COCOA'],
  },
  {
    theme: 'Detective kit',
    words: ['MAGNIFIER', 'FINGERPRINT', 'CLUE', 'NOTEBOOK', 'SUSPECT', 'ALIBI', 'EVIDENCE', 'WITNESS', 'CASEFILE', 'DETECTIVE', 'DISGUISE', 'FOOTPRINT', 'KEY', 'LOCK', 'LANTERN', 'TELESCOPE', 'ENVELOPE', 'MYSTERY'],
  },
  {
    theme: 'Forest walk',
    words: ['PINE', 'ACORN', 'MUSHROOM', 'FERN', 'STREAM', 'TRAIL', 'OWL', 'DEER', 'CABIN', 'MAPLE', 'MOSS', 'BERRY', 'LANTERN', 'BRIDGE', 'CLEARING', 'WOODPECKER', 'THICKET', 'HIKER'],
  },
  {
    theme: 'Winter evening',
    words: ['SNOWFLAKE', 'MITTEN', 'SCARF', 'FIREPLACE', 'COCOA', 'ICICLE', 'SLED', 'SKATES', 'BLIZZARD', 'FROST', 'QUILT', 'CANDLE', 'GINGER', 'CHIMNEY', 'SNOWMAN', 'WARMTH', 'EVENING', 'STARLIGHT'],
  },
];

// --------------------------------------------------------------- tiers ----

export type WordSearchTier = 'Easy' | 'Medium' | 'Hard' | 'Expert';

export function tierName(level: number): WordSearchTier {
  if (level <= 10) return 'Easy';
  if (level <= 30) return 'Medium';
  if (level <= 60) return 'Hard';
  return 'Expert';
}

export interface WordSearchParams {
  tier: WordSearchTier;
  size: number;
  wordCount: number;
  /** Directions allowed, as [dr, dc] pairs. */
  directions: [number, number][];
}

export function tierForLevel(level: number): WordSearchParams {
  if (level <= 10) {
    return {
      tier: 'Easy',
      size: 8 + Math.floor((level - 1) / 5),
      wordCount: 6,
      directions: [[0, 1], [1, 0]],
    };
  }
  if (level <= 30) {
    return {
      tier: 'Medium',
      size: 10 + Math.floor((level - 11) / 10),
      wordCount: 8 + Math.floor((level - 11) / 10),
      directions: [[0, 1], [1, 0], [0, -1], [-1, 0]],
    };
  }
  if (level <= 60) {
    return {
      tier: 'Hard',
      size: 12 + Math.floor((level - 31) / 15),
      wordCount: 10 + Math.floor((level - 31) / 10),
      directions: [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [1, -1]],
    };
  }
  const band = Math.floor((level - 61) / 10);
  return {
    tier: 'Expert',
    size: 14 + Math.min(2, band),
    wordCount: 13 + Math.min(4, band),
    directions: [
      [0, 1], [1, 0], [0, -1], [-1, 0],
      [1, 1], [1, -1], [-1, 1], [-1, -1],
    ],
  };
}

// -------------------------------------------------------------- puzzle ----

export interface PlacedWord {
  word: string;
  startRow: number;
  startCol: number;
  dr: number;
  dc: number;
  cells: [number, number][];
}

export interface WordSearchPuzzle {
  seed: string;
  level: number;
  tier: WordSearchTier;
  theme: string;
  size: number;
  grid: string[][];
  words: PlacedWord[];
}

export function levelSeed(level: number, salt: string): string {
  return `ws|${salt}|${level}`;
}

function canPlace(
  grid: (string | null)[][],
  word: string,
  r: number,
  c: number,
  dr: number,
  dc: number,
  size: number,
): boolean {
  for (let i = 0; i < word.length; i++) {
    const rr = r + dr * i;
    const cc = c + dc * i;
    if (rr < 0 || rr >= size || cc < 0 || cc >= size) return false;
    const existing = grid[rr][cc];
    if (existing !== null && existing !== word[i]) return false;
  }
  return true;
}

export function generatePuzzle(seed: string, level: number): WordSearchPuzzle {
  const rng = mulberry32(hashSeed(seed));
  for (let i = 0; i < 8; i++) rng();
  const params = tierForLevel(level);
  const { size } = params;
  const theme = WORD_THEMES[Math.floor(rng() * WORD_THEMES.length)];
  const candidates = shuffle(
    theme.words.filter((w) => w.length <= size),
    rng,
  ).sort((a, b) => b.length - a.length);
  const chosen = candidates.slice(0, params.wordCount);

  const grid: (string | null)[][] = Array.from({ length: size }, () =>
    new Array(size).fill(null),
  );
  const placed: PlacedWord[] = [];

  for (const word of chosen) {
    let done = false;
    const dirs = shuffle(params.directions, rng);
    for (let attempt = 0; attempt < 400 && !done; attempt++) {
      const [dr, dc] = dirs[attempt % dirs.length];
      const r = Math.floor(rng() * size);
      const c = Math.floor(rng() * size);
      if (!canPlace(grid, word, r, c, dr, dc, size)) continue;
      const cells: [number, number][] = [];
      for (let i = 0; i < word.length; i++) {
        const rr = r + dr * i;
        const cc = c + dc * i;
        grid[rr][cc] = word[i];
        cells.push([rr, cc]);
      }
      placed.push({ word, startRow: r, startCol: c, dr, dc, cells });
      done = true;
    }
    if (!done) {
      throw new Error(`word search failed to place ${word} for seed ${seed}`);
    }
  }

  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const full: string[][] = grid.map((row) =>
    row.map((cell) => cell ?? alpha[Math.floor(rng() * 26)]),
  );
  return {
    seed,
    level,
    tier: params.tier,
    theme: theme.theme,
    size,
    grid: full,
    words: placed,
  };
}

export function generateLevelPuzzle(level: number, salt: string): WordSearchPuzzle {
  return generatePuzzle(levelSeed(level, salt), level);
}

/** Find `word` in a grid, searching all 8 directions. Null when absent. */
export function findWord(grid: string[][], word: string): PlacedWord | null {
  const size = grid.length;
  const dirs: [number, number][] = [
    [0, 1], [1, 0], [0, -1], [-1, 0],
    [1, 1], [1, -1], [-1, 1], [-1, -1],
  ];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      for (const [dr, dc] of dirs) {
        let ok = true;
        const cells: [number, number][] = [];
        for (let i = 0; i < word.length; i++) {
          const rr = r + dr * i;
          const cc = c + dc * i;
          if (rr < 0 || rr >= size || cc < 0 || cc >= size || grid[rr][cc] !== word[i]) {
            ok = false;
            break;
          }
          cells.push([rr, cc]);
        }
        if (ok) return { word, startRow: r, startCol: c, dr, dc, cells };
      }
    }
  }
  return null;
}
