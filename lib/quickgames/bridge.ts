/**
 * The Bridge (Phase 6 quick game): two unrelated words face each other
 * across a chasm, and both players race to plank a bridge between them
 * — every plank a real word one letter off the last.
 *
 * The word list is small on purpose (common 3- and 4-letter words), so
 * ladders always exist and the solver can prove a shortest path.
 * Level sets word length and shortest-path distance.
 */
import { rngFromSeed, shuffle } from '../generators/rng';

export const BRIDGE_WORDS: string[] = [
  // 3 letters
  'CAT', 'COT', 'DOT', 'DOG', 'LOG', 'FOG', 'FIG', 'FIN', 'FUN', 'SUN', 'RUN',
  'RAN', 'MAN', 'MAP', 'CAP', 'CUP', 'CUT', 'BUT', 'BAT', 'RAT', 'MAT', 'HAT',
  'HOT', 'HIT', 'SIT', 'SAT', 'SET', 'SEE', 'SEA', 'TEA', 'TEN', 'TAN', 'CAN',
  'CAR', 'BAR', 'FAR', 'FAN', 'PEN', 'HEN', 'DEN', 'NET', 'PET', 'POT', 'TOP',
  'MOP', 'HOP', 'POP', 'PIP', 'LIP', 'TIP', 'TAP', 'SAP', 'SIP', 'SOP', 'SOW',
  'COW', 'HOW', 'NOW', 'BOW', 'ROW', 'LOW', 'TOW', 'TOE', 'DOE', 'FOE', 'FOB',
  'RIB', 'ROB', 'ROD', 'SOD', 'SOB', 'JOB', 'JOG', 'JAM', 'JAR', 'JAW', 'PAW',
  'SAW', 'LAW', 'RAW', 'BAG', 'RAG', 'TAG', 'LAG', 'LEG', 'PEG', 'BEG', 'BIG',
  'PIG', 'DIG', 'WIG', 'WIN', 'WIT', 'KIT', 'KID', 'BID', 'BIT', 'FIT', 'FAD',
  'MAD', 'SAD', 'PAD', 'BAD', 'BED', 'RED', 'LED', 'LID', 'RID', 'RIM', 'DIM',
  'DIP', 'HIP', 'HIS', 'HIT', 'ITS', 'NIT', 'NUT', 'CUT', 'GUT', 'GUN', 'GUM',
  'SUM', 'SUP', 'CUB', 'TUB', 'RUB', 'RUG', 'BUG', 'BUN', 'BUS', 'FUS', 'FUR',
  'CUR', 'CUE', 'DUE', 'SUE', 'SUB', 'HUB', 'HUM', 'MUM', 'MUG', 'JUG', 'JUT',
  // 4 letters
  'COLD', 'CORD', 'WORD', 'WORM', 'WARM', 'BOLD', 'HOLD', 'GOLD', 'SOLD', 'SOLE',
  'SALE', 'TALE', 'TALK', 'WALK', 'WALL', 'BALL', 'CALL', 'FALL', 'FILL', 'FISH',
  'DISH', 'WISH', 'WISE', 'RISE', 'RICE', 'MICE', 'MINE', 'MIND', 'KIND', 'KING',
  'SING', 'SONG', 'LONG', 'LOOK', 'BOOK', 'COOK', 'COOL', 'POOL', 'POOR', 'DOOR',
  'MOOR', 'MOON', 'SOON', 'SOOT', 'FOOT', 'FOOD', 'GOOD', 'WOOD', 'WORK', 'FARM',
  'HARM', 'HARP', 'CARP', 'CARD', 'CARE', 'DARE', 'DARK', 'PARK', 'PART', 'PORT',
  'SORT', 'SOUL', 'SOUP', 'SOUR', 'HOUR', 'FOUR', 'TOUR', 'TOUT', 'BARN', 'DARN',
  'YARN', 'YARD', 'HARD', 'HARE', 'BARE', 'BARK', 'MARK', 'MARS', 'MART', 'MART',
  'CART', 'CARE', 'CORE', 'CORK', 'COCK', 'COOK', 'HOOK', 'TOOK', 'TOOT', 'BOOT',
  'BOON', 'MOON', 'NOON', 'NOOK', 'ROOK', 'ROOM', 'ROOT', 'FOOT', 'FORT', 'FORM',
  'FORK', 'FORE', 'MORE', 'MORN', 'BORN', 'BORE', 'BONE', 'BONE', 'DONE', 'DOME',
  'HOME', 'HOLE', 'HALE', 'HATE', 'MATE', 'MATH', 'PATH', 'PATE', 'RATE', 'RATS',
  'CATS', 'BATS', 'HATS', 'MATS', 'MATE', 'LATE', 'LAKE', 'LIKE', 'LIME', 'TIME',
  'TIDE', 'TILE', 'FILE', 'FINE', 'FIRE', 'FIRM', 'FARM', 'FARM', 'WARM', 'WARN',
  'WORN', 'WORT', 'WORT', 'WART', 'WART', 'PART', 'PAST', 'FAST', 'LAST', 'LASS',
  'MASS', 'MESS', 'MISS', 'KISS', 'KIND', 'KING', 'RING', 'RUNG', 'RANG', 'BANG',
  'HANG', 'SANG', 'SING', 'SINK', 'SINK', 'PINK', 'PINT', 'MINT', 'MINE', 'MINE',
  'WINE', 'WIND', 'WAND', 'WANT', 'WENT', 'WEEP', 'WEEK', 'WEAK', 'BEAK', 'BEAM',
  'BEAN', 'MEAN', 'MEAT', 'MEET', 'MELT', 'FELT', 'FELL', 'FULL', 'PULL', 'PULL',
  'BULL', 'BALL', 'BELL', 'BELL', 'TELL', 'TALL', 'TOLL', 'ROLL', 'ROLE', 'RODE',
  'RODE', 'CODE', 'CADE', 'CAGE', 'RAGE', 'RAGE', 'PAGE', 'PACE', 'FACE', 'FACT',
  'PACT', 'PACK', 'PICK', 'KICK', 'KICK', 'SICK', 'SOCK', 'ROCK', 'RACK', 'RACK',
  'LACK', 'LUCK', 'DUCK', 'DOCK', 'LOCK', 'LOOK', 'LOON', 'LOOM', 'BOOM', 'BOON',
  'MOON', 'COON', 'COOP', 'COOL', 'POOL', 'WOOL', 'WOLF', 'GOLF', 'GULF', 'GULL',
  'BULL', 'BULB', 'BURB', 'CURB', 'CURD', 'CARD', 'CORD', 'CORD', 'WORD', 'WORK',
];

const WORD_SET = new Set(BRIDGE_WORDS);

export function oneLetterOff(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) diff++;
  }
  return diff === 1;
}

/** All real words one letter off `word`. */
export function bridgeNeighbors(word: string): string[] {
  return [...WORD_SET].filter((w) => oneLetterOff(word, w));
}

/** Shortest ladder from start to end (BFS), or null when unreachable. */
export function shortestLadder(start: string, end: string): string[] | null {
  if (start === end) return [start];
  const prev = new Map<string, string>();
  const seen = new Set<string>([start]);
  const queue = [start];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const next of bridgeNeighbors(cur)) {
      if (seen.has(next)) continue;
      seen.add(next);
      prev.set(next, cur);
      if (next === end) {
        const path = [end];
        let node = end;
        while (prev.has(node)) {
          node = prev.get(node)!;
          path.unshift(node);
        }
        return path;
      }
      queue.push(next);
    }
  }
  return null;
}

export interface BridgeGame {
  start: string;
  end: string;
  /** Shortest possible ladder length in steps (edges). */
  shortest: number;
  /** One shortest ladder, for the bot to follow. */
  botPath: string[];
}

export function bridgeParamsForLevel(level: number): { len: number; minSteps: number; maxSteps: number } {
  if (level <= 10) return { len: 3, minSteps: 2, maxSteps: 3 };
  if (level <= 30) return { len: 3, minSteps: 3, maxSteps: 5 };
  if (level <= 60) return { len: 4, minSteps: 3, maxSteps: 5 };
  return { len: 4, minSteps: 5, maxSteps: 7 };
}

export function generateBridge(seed: string, level: number): BridgeGame {
  const rng = rngFromSeed(`bridge|${seed}|${level}`);
  const { len, minSteps, maxSteps } = bridgeParamsForLevel(level);
  const words = BRIDGE_WORDS.filter((w) => w.length === len);
  for (let attempt = 0; attempt < 500; attempt++) {
    const start = words[Math.floor(rng() * words.length)]!;
    const end = words[Math.floor(rng() * words.length)]!;
    if (start === end) continue;
    const path = shortestLadder(start, end);
    if (!path) continue;
    const steps = path.length - 1;
    if (steps >= minSteps && steps <= maxSteps) {
      return { start, end, shortest: steps, botPath: path };
    }
  }
  // Fallback: a known short ladder, so generation never fails.
  if (len === 3) return { start: 'CAT', end: 'DOG', shortest: 3, botPath: ['CAT', 'COT', 'DOT', 'DOG'] };
  return { start: 'COLD', end: 'WARM', shortest: 4, botPath: ['COLD', 'CORD', 'WORD', 'WORM', 'WARM'] };
}

/** Is `next` a legal next plank after `prev`? */
export function isValidPlank(prev: string, next: string): boolean {
  return WORD_SET.has(next) && oneLetterOff(prev, next);
}

export function bridgeProgress(game: BridgeGame, planks: string[]): number {
  if (game.shortest <= 0) return 1;
  return Math.min(1, planks.length / game.shortest);
}

export function bridgeFinished(game: BridgeGame, planks: string[]): boolean {
  return planks.length > 0 && planks[planks.length - 1] === game.end;
}

/** Bot plank delay (ms): slower early, brisk at Expert. */
export function bridgeBotDelayMs(level: number): number {
  if (level <= 10) return 6000;
  if (level <= 30) return 4500;
  if (level <= 60) return 3200;
  return 2400;
}

/** The word list (deduped) for reuse by other games. */
export function bridgeWordList(): string[] {
  return [...WORD_SET];
}
