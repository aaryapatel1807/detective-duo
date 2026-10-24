/**
 * Roll a date night (Phase 6): four lists, one dice roll.
 *
 * Lists ship with sensible defaults and are editable per account.
 * Storage is localStorage keyed by account id when signed in (and by
 * "guest" otherwise), so lists never leak between accounts on a shared
 * device. Cross-device sync would need a table — flagged in the Phase 6
 * report, not built here.
 */
import { rngFromSeed, shuffle } from './generators/rng';

export type DateListId = 'dinner' | 'activity' | 'treat' | 'entertainment';

export interface DateLists {
  dinner: string[];
  activity: string[];
  treat: string[];
  entertainment: string[];
}

export const DATE_LIST_META: { id: DateListId; name: string; hint: string }[] = [
  { id: 'dinner', name: 'Dinner', hint: 'Something to cook, or somewhere to walk to.' },
  { id: 'activity', name: 'Activity', hint: 'The main thing you will actually do.' },
  { id: 'treat', name: 'Treat', hint: 'Something sweet at the end.' },
  { id: 'entertainment', name: 'Entertainment', hint: 'What to watch, listen to, or play.' },
];

export const DEFAULT_DATE_LISTS: DateLists = {
  dinner: [
    'Pasta night',
    'Homemade pizza',
    'Street food crawl',
    'Soup and fresh bread',
    'Breakfast for dinner',
    'Noodles and a film',
    'A new recipe neither of you has tried',
    'Picnic sandwiches',
  ],
  activity: [
    'A slow walk with no destination',
    'A puzzle together',
    'A board game',
    'Stargazing from the balcony',
    'A photo walk',
    'Cooking a dish from another country',
    'A long call with tea',
    'A blanket fort and a book',
  ],
  treat: [
    'Ice cream',
    'Chocolate cake',
    'Fresh fruit and cream',
    'Cookies from the bakery',
    'Hot chocolate',
    'Mango lassi',
    'A pastry each',
    'Roasted nuts and chai',
  ],
  entertainment: [
    'A cozy film',
    'An episode of something gentle',
    'A playlist swap',
    'A game night on Sachi',
    'A documentary',
    'A comedy special',
    'An old favourite, again',
    'A radio play',
  ],
};

export interface DateRoll {
  dinner: string;
  activity: string;
  treat: string;
  entertainment: string;
  at: string;
}

/** Clean a list: trim, drop empties, dedupe (case-insensitive), cap at 40. */
export function cleanList(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const item = raw.trim();
    if (!item) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out.slice(0, 40);
}

export function cleanLists(lists: Partial<DateLists>): DateLists {
  return {
    dinner: cleanList(lists.dinner ?? DEFAULT_DATE_LISTS.dinner),
    activity: cleanList(lists.activity ?? DEFAULT_DATE_LISTS.activity),
    treat: cleanList(lists.treat ?? DEFAULT_DATE_LISTS.treat),
    entertainment: cleanList(lists.entertainment ?? DEFAULT_DATE_LISTS.entertainment),
  };
}

/** One roll: a random pick from each list (uses Math.random for solo rolls). */
export function rollDateNight(lists: DateLists): DateRoll {
  const pick = (arr: string[]): string =>
    arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)]! : 'Anything you like';
  return {
    dinner: pick(lists.dinner),
    activity: pick(lists.activity),
    treat: pick(lists.treat),
    entertainment: pick(lists.entertainment),
    at: new Date().toISOString(),
  };
}

/**
 * Seeded roll: both players in a room see the same plan when the roll
 * is keyed by the room code + roll counter. Deterministic and tested.
 */
export function rollDateNightSeeded(lists: DateLists, seed: string): DateRoll {
  const rng = rngFromSeed(seed);
  const pick = (arr: string[]): string => {
    if (arr.length === 0) return 'Anything you like';
    return shuffle(arr, rng)[0]!;
  };
  return {
    dinner: pick(lists.dinner),
    activity: pick(lists.activity),
    treat: pick(lists.treat),
    entertainment: pick(lists.entertainment),
    at: new Date().toISOString(),
  };
}

const KEY_PREFIX = 'dd-v2-datenight-';

export function dateListsKey(uid: string | null): string {
  return `${KEY_PREFIX}${uid ?? 'guest'}`;
}

export function loadDateLists(uid: string | null): DateLists {
  try {
    const raw = localStorage.getItem(dateListsKey(uid));
    if (!raw) return { ...DEFAULT_DATE_LISTS };
    const parsed = JSON.parse(raw) as Partial<DateLists>;
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_DATE_LISTS };
    return cleanLists(parsed);
  } catch {
    return { ...DEFAULT_DATE_LISTS };
  }
}

export function saveDateLists(uid: string | null, lists: DateLists): void {
  try {
    localStorage.setItem(dateListsKey(uid), JSON.stringify(cleanLists(lists)));
  } catch {
    /* ignore */
  }
}
