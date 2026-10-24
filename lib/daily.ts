/**
 * Daily Desk helpers.
 *
 * Date seed: IST (Asia/Kolkata), derived via Intl.DateTimeFormat with
 * timeZone 'Asia/Kolkata', so the day flips at midnight IST wherever the
 * device sits.
 *
 * Daily Case rotation: the case bank is lib/content/cases/*.json (built
 * by the case-files workstream). Rotation is sequential by day number,
 * so no case repeats until the whole bank is exhausted. If the bank were
 * ever empty, getDailyCase returns null and the /daily page shows a
 * graceful "today's case arrives with the bank" state instead of
 * inventing a case.
 *
 * Daily cipher / nonogram reuse the sibling workstreams' generators:
 * encodeCaesar from lib/generators/cipherDesk.ts and generatePuzzle
 * from lib/generators/nonogram.ts, both driven by the date seed. The
 * Daily Desk page only reads DailySet, so any future generator swap is
 * local to this file.
 *
 * Streaks: gentle only. computeStreak counts consecutive completed days
 * ending at the most recent completed day on or before today, so a missed
 * day freezes the shown streak instead of resetting it to zero — missing
 * a day does nothing bad. recordDailyCompletion never decrements anything.
 *
 * Storage: localStorage only (works signed-out). Signed-in sync needs no
 * new table: the existing `progress` table already stores one row per
 * (user, game), so touchDailyProgress reuses game id 'daily-desk'. No
 * migration is required for Daily Desk — deliberately, none is added.
 */
import { hashSeed, mulberry32 } from './generators/logicGrid';
import { encodeCaesar } from './generators/cipherDesk';
import { generatePuzzle as generateNonogramPuzzle } from './generators/nonogram';
import { loadLocalProgress, saveLocalProgress } from './progress';
import easyCases from './content/cases/easy.json';
import mediumACases from './content/cases/medium-a.json';
import mediumBCases from './content/cases/medium-b.json';

export interface DailyCase {
  id: string;
  title: string;
  blurb: string;
}

interface CaseBankEntry {
  id: string;
  title: string;
  setting: string;
}

/** The case bank, in bank order: easy, then medium A, then medium B. */
export const CASE_BANK: DailyCase[] = (
  [...easyCases, ...mediumACases, ...mediumBCases] as CaseBankEntry[]
).map((c) => ({ id: c.id, title: c.title, blurb: c.setting }));

/** IST date string, YYYY-MM-DD. Pass a Date for tests. */
export function getISTDateString(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function daysSinceEpoch(dateStr: string): number {
  return Math.floor(Date.parse(`${dateStr}T00:00:00Z`) / 86_400_000);
}

export function getDailyCase(dateStr: string): DailyCase | null {
  if (!CASE_BANK.length) return null;
  return CASE_BANK[daysSinceEpoch(dateStr) % CASE_BANK.length];
}

// ---------------------------------------------------------------- cipher --

export interface DailyCipher {
  title: string;
  encoded: string;
  plain: string;
  shift: number;
  hint: string;
}

const CIPHER_LINES = [
  'The cat sat by the window all afternoon',
  'Meet me at the old bridge after tea',
  'The key is under the blue flowerpot',
  'Follow the river until the path bends',
  'She left a note inside the recipe book',
  'The lighthouse keeper waves at dawn',
  'Two cups of tea and one warm secret',
  'Look behind the painting in the hall',
];

export function getDailyCipher(dateStr: string): DailyCipher {
  const rng = mulberry32(hashSeed(`daily-cipher|${dateStr}`));
  const plain = CIPHER_LINES[Math.floor(rng() * CIPHER_LINES.length)];
  const shift = 1 + Math.floor(rng() * 25);
  return {
    title: 'Daily Cipher',
    encoded: encodeCaesar(plain, shift),
    plain,
    shift,
    hint: `Every letter is shifted by the same amount. Try shifting the letters back — the first word is a common one.`,
  };
}

// -------------------------------------------------------------- nonogram --

export interface DailyNonogram {
  title: string;
  size: number;
  /** solution[row][col] = filled? */
  solution: boolean[][];
  rowClues: number[][];
  colClues: number[][];
}

export function getDailyNonogram(dateStr: string): DailyNonogram {
  // Level 1 from the nonogram generator: 5x5, unique solution, verified
  // by that generator's own solver. Date-seeded, so it changes daily.
  const puzzle = generateNonogramPuzzle(`daily-nonogram|${dateStr}`, 1);
  return {
    title: 'Daily Nonogram',
    size: puzzle.size,
    solution: puzzle.grid,
    rowClues: puzzle.rowClues,
    colClues: puzzle.colClues,
  };
}

// ------------------------------------------------------------------ set ----

export interface DailySet {
  date: string;
  dailyCase: DailyCase | null;
  cipher: DailyCipher;
  nonogram: DailyNonogram;
}

export function getDailySet(dateStr: string): DailySet {
  return {
    date: dateStr,
    dailyCase: getDailyCase(dateStr),
    cipher: getDailyCipher(dateStr),
    nonogram: getDailyNonogram(dateStr),
  };
}

// --------------------------------------------------------------- streak ----

export interface DailyState {
  /** date -> parts completed that day. */
  completions: Record<string, { cipher?: boolean; nonogram?: boolean; case?: boolean }>;
}

const STORAGE_KEY = 'dd-v2-daily';

export function emptyDailyState(): DailyState {
  return { completions: {} };
}

export function loadDailyState(): DailyState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyDailyState();
    const parsed = JSON.parse(raw) as DailyState;
    return parsed && typeof parsed.completions === 'object'
      ? parsed
      : emptyDailyState();
  } catch {
    return emptyDailyState();
  }
}

export function saveDailyState(state: DailyState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage blocked — play continues */
  }
}

export function isDayComplete(state: DailyState, dateStr: string): boolean {
  const day = state.completions[dateStr];
  return Boolean(day && (day.cipher || day.nonogram || day.case));
}

/** Record one part's completion. Never decrements, never penalises. */
export function recordDailyCompletion(
  state: DailyState,
  dateStr: string,
  part: 'cipher' | 'nonogram' | 'case',
): DailyState {
  const next: DailyState = {
    completions: {
      ...state.completions,
      [dateStr]: { ...state.completions[dateStr], [part]: true },
    },
  };
  saveDailyState(next);
  return next;
}

/**
 * Consecutive completed days ending at the most recent completed day on
 * or before today. A missed day on its own never changes the number:
 * with no new completion the latest completed day is unchanged, so the
 * streak freezes instead of resetting to zero. A new completion after a
 * gap starts a fresh run from that day.
 */
export function computeStreak(state: DailyState, todayStr: string): number {
  const completed = Object.keys(state.completions)
    .filter((d) => isDayComplete(state, d) && d <= todayStr)
    .sort();
  if (!completed.length) return 0;
  let streak = 1;
  let cursor = daysSinceEpoch(completed[completed.length - 1]);
  for (let i = completed.length - 2; i >= 0; i--) {
    if (daysSinceEpoch(completed[i]) === cursor - 1) {
      streak++;
      cursor--;
    } else {
      break;
    }
  }
  return streak;
}

/** Touch the shared progress row for 'daily-desk' (no level, no stars). */
export function touchDailyProgress(): void {
  try {
    const map = loadLocalProgress();
    const prev = map['daily-desk'];
    map['daily-desk'] = {
      currentLevel: prev?.currentLevel ?? 1,
      stars: prev?.stars ?? {},
      hintsUsed: prev?.hintsUsed ?? 0,
      mistakes: prev?.mistakes ?? 0,
      lastPlayedAt: new Date().toISOString(),
    };
    saveLocalProgress(map);
  } catch {
    /* ignore */
  }
}
