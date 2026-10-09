/* Cipher Breaker content bank — game-local (do NOT touch lib/content/ciphers.ts).
 *
 * Imports the 5 shared ciphers read-only and adds 3 harder ones authored here.
 * Every cipher carries a `keyword`: the decoded keyword granted as a hint
 * token to the Crime Mystery when the cipher is solved.
 */

import {
  CIPHERS,
  type Cipher,
} from '../../lib/content/ciphers';

export interface BreakerCipher extends Cipher {
  /** Decoded keyword granted as a hint token on solve. */
  keyword: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

/** Keywords for the 5 shared bank ciphers (decoded from their solutions). */
const BANK_KEYWORDS: Record<string, { keyword: string; difficulty: BreakerCipher['difficulty'] }> = {
  'c-1': { keyword: 'BRIDGE', difficulty: 'easy' },
  'c-2': { keyword: 'TWELVE', difficulty: 'easy' },
  'c-3': { keyword: 'DECOY', difficulty: 'medium' },
  'c-4': { keyword: 'SAFE', difficulty: 'medium' },
  'c-5': { keyword: 'PAPER', difficulty: 'medium' },
};

/**
 * The shared bank has typos in three messages (they don't decode to their
 * solutions). Override them locally so every cipher in THIS game is solvable
 * — the bank file itself stays untouched (read-only).
 */
const MESSAGE_FIXES: Record<string, string> = {
  'c-2': 'QIIX XLI FERO, LEPJ TEWX XAIPZI', // shift 4 of "MEET THE BANK, HALF PAST TWELVE"
  'c-3': 'GSV YIRVU RH Z WVXLB', // atbash of "THE BRIEF IS A DECOY"
  'c-4': 'YMJ SZRGJW YMJ XFKJ MNIJX', // shift 5 of "THE NUMBER THE SAFE HIDES"
};

const EXTRA_CIPHERS: BreakerCipher[] = [
  {
    id: 'c-6',
    type: 'caesar',
    title: 'The Platform Cipher',
    message: 'AOL TPKUPNOA AYHPU SLHCLZ WSHAMVYT UPUL',
    hint: 'Caesar shift 7 — a full week of secrets.',
    solution: 'THE MIDNIGHT TRAIN LEAVES PLATFORM NINE',
    keyword: 'PLATFORM NINE',
    difficulty: 'hard',
  },
  {
    id: 'c-7',
    type: 'substitution',
    title: 'The Riverbed Letter',
    message: 'GSV PVB RH YFIRVW DSVIV GSV IREVI YVMWH',
    hint: 'Atbash mirror — the alphabet folded in half.',
    solution: 'THE KEY IS BURIED WHERE THE RIVER BENDS',
    keyword: 'RIVER BENDS',
    difficulty: 'hard',
  },
  {
    id: 'c-8',
    type: 'caesar',
    title: 'Dawn Meeting',
    message: 'YQQF MF PMIZ NQTUZP FTQ AXP YUXX',
    hint: 'Caesar shift 12 — half the alphabet away.',
    solution: 'MEET AT DAWN BEHIND THE OLD MILL',
    keyword: 'OLD MILL',
    difficulty: 'medium',
  },
];

export const BREAKER_CIPHERS: BreakerCipher[] = [
  ...CIPHERS.map((c) => ({
    ...c,
    message: MESSAGE_FIXES[c.id] ?? c.message,
    keyword: BANK_KEYWORDS[c.id]?.keyword ?? 'UNKNOWN',
    difficulty: BANK_KEYWORDS[c.id]?.difficulty ?? ('medium' as const),
  })),
  ...EXTRA_CIPHERS,
];

export function getBreakerCipher(id: string): BreakerCipher | undefined {
  return BREAKER_CIPHERS.find((c) => c.id === id);
}
