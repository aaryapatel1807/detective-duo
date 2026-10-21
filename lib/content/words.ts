/* Word lists for Hangman Duel, Word Duel, Ghost, Word Hunt (Boggle), Wordle.
 * The original hand-picked words (common nouns) come first in each list.
 * The rest are REAL game data extracted with REA from the "Hangman" game on
 * CrazyGames (https://www.crazygames.com/game/hangman-cfc): its embedded
 * 319-entry categorized bank (Animals, Countries, Foods, Mythology, Sports,
 * Verbs, ...) — single-token A-Z answers only, grouped by length.
 * Raw source + parsed bank: docs/data-extraction/hangman-cfc/.
 */

export const WORDS_4: string[] = [
  'CASE', 'CLUE', 'FILE', 'DARK', 'MOON', 'RAIN', 'LOCK', 'KEYS',
  'SAFE', 'BANK', 'TRAIN', 'NIGHT', 'FOG', 'LAMP', 'DESK', 'NOTE',
  'CODE', 'GLOVE', 'MASK', 'DOOR', 'ALLEY', 'MIST', 'CROW', 'WOLF',
  'ARES', 'BEAN', 'BEAR', 'BOAR', 'BOOK', 'BOWL', 'CAKE', 'CHEF',
  'COME', 'CORN', 'CRAB', 'DEER', 'DOVE', 'DUCK', 'FOOT', 'FORK',
  'FROG', 'GIVE', 'GOAT', 'GOLF', 'GROW', 'HAND', 'HEAD', 'HERA',
  'HIDE', 'LIME', 'LION', 'MAKE', 'MEAN', 'MOVE', 'NEED', 'NOSE',
  'OVEN', 'PLAY', 'SEAL', 'SHOE', 'SHOW', 'SOCK', 'SOFA', 'SWAN',
  'TACO', 'TAKE', 'TUNA', 'VASE', 'WANT', 'WASP', 'WORK', 'ZEUS',
];

export const WORDS_5: string[] = [
  'CRIME', 'SLEUTH', 'VAULT', 'ALARM', 'GHOST', 'MOTIVE', 'CHASE', 'BLUFF',
  'DIARY', 'MAPLE', 'ROBIN', 'TIGER', 'PIANO', 'TOWER', 'SMOKE', 'THIEF',
  'PRINT', 'BADGE', 'WHARF', 'GRAVE', 'ADAPT', 'AGREE', 'ALLOW', 'APPLE',
  'BEGIN', 'BISON', 'BRAIN', 'BREAD', 'CAMEL', 'CHAIR', 'CHALK', 'CHILI',
  'CHINA', 'CLOCK', 'COACH', 'EAGLE', 'EGYPT', 'FIGHT', 'GOOSE', 'GRAPE',
  'HADES', 'HEART', 'HORSE', 'HYENA', 'INDIA', 'ITALY', 'JAPAN', 'KNIFE',
  'KOREA', 'LADLE', 'LAUGH', 'LIVER', 'LLAMA', 'MANGO', 'MELON', 'MIXER',
  'MOUTH', 'ONION', 'PANDA', 'PANTS', 'PILOT', 'PIZZA', 'PLATE', 'RUGBY',
  'RULER', 'SALAD', 'SCOUT', 'SHARK', 'SHIRT', 'SLOTH', 'SNAIL', 'SPAIN',
  'SPOON', 'START', 'STEAK', 'TABLE', 'WHALE', 'WHISK', 'ZEBRA',
];

export const WORDS_6: string[] = [
  'DETECT', 'MURDER', 'POISON', 'SECRET', 'SHADOW', 'GUNMAN', 'BUTLER', 'LETTER',
  'CIPHER', 'RANSOM', 'COBALT', 'PLANET', 'ORANGE', 'BRIDGE', 'MARKET', 'CASTLE',
  'DAGGER', 'LEDGER', 'INFORM', 'HEISTS', 'ABSURD', 'ADMIRE', 'APOLLO', 'ARTIST',
  'ATHENA', 'BANANA', 'BEAVER', 'BECOME', 'BEETLE', 'BOXING', 'BRAZIL', 'CARROT',
  'COOKIE', 'COYOTE', 'CRAYON', 'DIVING', 'DOCTOR', 'DONKEY', 'DRIVER', 'DURIAN',
  'EXTEND', 'FALCON', 'FINISH', 'FRANCE', 'GARLIC', 'GRATER', 'GREECE', 'HERMES',
  'HOCKEY', 'JACKET', 'KARATE', 'KEEPER', 'KIDNEY', 'KUWAIT', 'LAWYER', 'LISTEN',
  'LYCHEE', 'MARKER', 'MASHER', 'MEXICO', 'MONACO', 'MONKEY', 'MUFFIN', 'PAPAYA',
  'PEELER', 'PENCIL', 'POLAND', 'POLICE', 'POTATO', 'RABBIT', 'RUSSIA', 'SALMON',
  'SHORTS', 'SOCCER', 'SPIDER', 'SPRINT', 'TAILOR', 'TENNIS', 'TOMATO', 'TONGUE',
  'TURKEY',
];

/** Classic Boggle dice (16), as letter strings. Q is Qu. */
export const BOGGLE_DICE: string[] = [
  'AAEEGN', 'ABBJOO', 'ACHOPS', 'AFFKPS',
  'AOOTTW', 'CIMOTU', 'DEILRX', 'DELRVY',
  'DISTTY', 'EEGHNW', 'EEINSU', 'EHRTVW',
  'EIOSST', 'ELRTTY', 'HIMNUQ', 'HLNNRZ',
];

export function randomWord(length: 4 | 5 | 6): string {
  const pool = length === 4 ? WORDS_4 : length === 5 ? WORDS_5 : WORDS_6;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Roll a 4x4 Boggle board. Returns 16 letters (Q = Qu). */
export function rollBoggle(): string[] {
  const dice = [...BOGGLE_DICE];
  const board: string[] = [];
  while (dice.length) {
    const i = Math.floor(Math.random() * dice.length);
    const die = dice.splice(i, 1)[0];
    board.push(die[Math.floor(Math.random() * 6)]);
  }
  return board;
}
