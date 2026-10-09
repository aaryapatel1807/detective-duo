/* Cipher Breaker bank.
 * Decoded ciphers grant hint tokens for the Crime Mystery (see CONTRACT.md).
 *
 * Schema: Cipher { id, type: 'caesar' | 'substitution', title, message, hint, solution }
 *  - message:  the encoded text shown to players
 *  - hint:     nudge shown after a wrong attempt / on request
 *  - solution: the decoded plaintext (uppercase, spaces kept)
 */

export type CipherType = 'caesar' | 'substitution';

export interface Cipher {
  id: string;
  type: CipherType;
  title: string;
  message: string;
  hint: string;
  solution: string;
}

export const CIPHERS: Cipher[] = [
  {
    id: 'c-1',
    type: 'caesar',
    title: 'The Informant\'s Note',
    message: 'WKH GHDG GURS LV XQGHU WKH EULGJH',
    hint: 'Caesar shift 3 — Julius would approve.',
    solution: 'THE DEAD DROP IS UNDER THE BRIDGE',
  },
  {
    id: 'c-2',
    type: 'caesar',
    title: 'Midnight Call',
    message: 'RIIQ XLI EIEA, QEXX UYI QEGXW',
    hint: 'Caesar shift 4 — count forward from A.',
    solution: 'MEET THE BANK, HALF PAST TWELVE',
  },
  {
    id: 'c-3',
    type: 'substitution',
    title: 'Burn After Reading',
    message: 'GSV YILXP RM Z YVVO',
    hint: 'Atbash: A↔Z, B↔Y, C↔X… the alphabet folded in half.',
    solution: 'THE BRIEF IS A DECOY',
  },
  {
    id: 'c-4',
    type: 'caesar',
    title: 'The Vault Combination',
    message: 'YMJ SZRGBJ YMJ XFKJ MNIJX',
    hint: 'Caesar shift 5 — the key is in the title count.',
    solution: 'THE NUMBER THE SAFE HIDES',
  },
  {
    id: 'c-5',
    type: 'substitution',
    title: 'Last Words',
    message: 'SVOOL DLIOW, GSV RILMB LU GSV KZKVI',
    hint: 'Atbash again — mirror the alphabet.',
    solution: 'HELLO WORLD, THE IRONY OF THE PAPER',
  },
];

export function getCipher(id: string): Cipher | undefined {
  return CIPHERS.find((c) => c.id === id);
}

/** Decode a Caesar-shifted message (for checking / generating). */
export function caesarDecode(message: string, shift: number): string {
  return message.replace(/[A-Z]/g, (ch) => {
    const code = ch.charCodeAt(0) - 65;
    return String.fromCharCode(65 + (((code - shift) % 26) + 26) % 26);
  });
}

/** Decode an Atbash message. */
export function atbashDecode(message: string): string {
  return message.replace(/[A-Z]/g, (ch) =>
    String.fromCharCode(65 + (25 - (ch.charCodeAt(0) - 65))),
  );
}
