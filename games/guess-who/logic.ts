/* Guess Who — pure rules. */

import { ATTRIBUTE_KEYS, type BooleanAttr, type Suspect } from './content';

/** Keep suspects matching the given attribute value after an answer. */
export function filterByAnswer(
  suspects: Suspect[],
  attr: BooleanAttr,
  value: boolean,
): Suspect[] {
  return suspects.filter((s) => s.attrs[attr] === value);
}

/** After an answer, which suspect ids remain on the board? */
export function remainingAfterAnswer(
  remainingIds: string[],
  suspects: Suspect[],
  attr: BooleanAttr,
  value: boolean,
): string[] {
  const keep = new Set(
    filterByAnswer(suspects, attr, value).map((s) => s.id),
  );
  return remainingIds.filter((id) => keep.has(id));
}

/** True when an accusation names the opponent's secret pick. */
export function isCorrectAccusation(accusedId: string, secretPickId: string): boolean {
  return accusedId === secretPickId;
}

/** Deterministic first turn: lexicographically smaller player id. */
export function firstTurn(playerIds: string[]): string | null {
  if (playerIds.length === 0) return null;
  return [...playerIds].sort()[0];
}

export function attributeKeys(): readonly BooleanAttr[] {
  return ATTRIBUTE_KEYS;
}
