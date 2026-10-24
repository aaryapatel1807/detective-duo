/**
 * Together-mode room codes: exactly 4 letters, A-Z only.
 * I and O are excluded so codes are never confused with 1 and 0
 * when read aloud (24 letters -> 331,776 possible codes).
 */

export const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateRoomCode(rng: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += ROOM_ALPHABET[Math.floor(rng() * ROOM_ALPHABET.length)];
  }
  return code;
}

export function isValidRoomCode(code: string): boolean {
  if (typeof code !== 'string' || code.length !== 4) return false;
  for (const ch of code.toUpperCase()) {
    if (!ROOM_ALPHABET.includes(ch)) return false;
  }
  return true;
}

export function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase();
}
