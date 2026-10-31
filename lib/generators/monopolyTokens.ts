/**
 * Monopoly player tokens ("cookies" in the user's words): cosmetic
 * shapes a player picks before a game. Pure helpers only — a token
 * never affects rules, prices, or recorded wins.
 */

export interface MonopolyToken {
  id: string;
  glyph: string;
  label: string;
}

export const MONOPOLY_TOKENS: MonopolyToken[] = [
  { id: 'heart', glyph: '❤️', label: 'Heart' },
  { id: 'car', glyph: '🚗', label: 'Car' },
  { id: 'star', glyph: '⭐', label: 'Star' },
  { id: 'rocket', glyph: '🚀', label: 'Rocket' },
  { id: 'crown', glyph: '👑', label: 'Crown' },
  { id: 'dog', glyph: '🐶', label: 'Dog' },
  { id: 'cat', glyph: '🐱', label: 'Cat' },
  { id: 'flower', glyph: '🌸', label: 'Flower' },
];

export function tokenGlyph(id: string): string {
  return MONOPOLY_TOKENS.find((t) => t.id === id)?.glyph ?? '●';
}

export function isValidToken(id: string): boolean {
  return MONOPOLY_TOKENS.some((t) => t.id === id);
}

/** The bot's token: the first shape that is not the player's. Never the player's. */
export function botTokenFor(playerToken: string): string {
  return MONOPOLY_TOKENS.find((t) => t.id !== playerToken)?.id ?? 'star';
}

/** A second player's token: the first shape neither player has taken. */
export function secondTokenFor(firstToken: string): string {
  return botTokenFor(firstToken);
}
