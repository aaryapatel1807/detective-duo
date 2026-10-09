/* Word lists for Hangman Duel, Word Duel, Ghost, Word Hunt (Boggle).
 * Common nouns, no proper nouns, no plurals ending in S where avoidable.
 */

export const WORDS_4: string[] = [
  'CASE', 'CLUE', 'FILE', 'DARK', 'MOON', 'RAIN', 'LOCK', 'KEYS', 'SAFE', 'BANK',
  'TRAIN', 'NIGHT', 'FOG', 'LAMP', 'DESK', 'NOTE', 'CODE', 'GLOVE', 'MASK',
  'DOOR', 'ALLEY', 'MIST', 'CROW', 'WOLF',
];

export const WORDS_5: string[] = [
  'CRIME', 'SLEUTH', 'VAULT', 'ALARM', 'GHOST', 'MOTIVE', 'CHASE', 'BLUFF',
  'DIARY', 'MAPLE', 'ROBIN', 'TIGER', 'PIANO', 'TOWER', 'SMOKE', 'THIEF',
  'PRINT', 'BADGE', 'WHARF', 'GRAVE',
];

export const WORDS_6: string[] = [
  'DETECT', 'MURDER', 'POISON', 'SECRET', 'SHADOW', 'GUNMAN', 'BUTLER',
  'LETTER', 'CIPHER', 'RANSOM', 'COBALT', 'PLANET', 'ORANGE', 'BRIDGE',
  'MARKET', 'CASTLE', 'DAGGER', 'LEDGER', 'INFORM', 'HEISTS',
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
