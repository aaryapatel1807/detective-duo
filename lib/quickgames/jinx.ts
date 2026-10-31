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
// Word list formerly shared from The Bridge (game removed); kept here
// so Jinx's lexicon is unchanged.
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

/** The word list (deduped) for Jinx's lexicon. */
function bridgeWordList(): string[] {
  return [...new Set(BRIDGE_WORDS)];
}

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
