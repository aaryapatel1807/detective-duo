/* Guess Who — suspect edition. 12 suspects with interrogatable attributes.
 * Secret picks stay local (never synced); only turn + win state go to shared.
 */

export interface SuspectAttributes {
  hat: boolean;
  glasses: boolean;
  beard: boolean;
  scar: boolean;
  uniform: boolean;
  mustache: boolean;
  earrings: boolean;
  tie: boolean;
  ageBand: 'young' | 'middle' | 'old';
}

export interface Suspect {
  id: string;
  name: string;
  face: string;
  attrs: SuspectAttributes;
}

export const SUSPECTS: Suspect[] = [
  { id: 's1', name: 'Vincent "Lefty" Marlowe', face: '🕵️', attrs: { hat: true, glasses: false, beard: true, scar: true, uniform: false, mustache: false, earrings: false, tie: true, ageBand: 'old' } },
  { id: 's2', name: 'Rosa Delgado', face: '👩‍🦰', attrs: { hat: false, glasses: true, beard: false, scar: false, uniform: false, mustache: false, earrings: true, tie: false, ageBand: 'middle' } },
  { id: 's3', name: 'Officer Bram Cole', face: '👮', attrs: { hat: true, glasses: false, beard: false, scar: false, uniform: true, mustache: true, earrings: false, tie: false, ageBand: 'middle' } },
  { id: 's4', name: 'Eddie "Specs" Novak', face: '🤓', attrs: { hat: false, glasses: true, beard: false, scar: false, uniform: false, mustache: false, earrings: false, tie: true, ageBand: 'young' } },
  { id: 's5', name: 'Madame Zara Voss', face: '💃', attrs: { hat: true, glasses: false, beard: false, scar: false, uniform: false, mustache: false, earrings: true, tie: false, ageBand: 'middle' } },
  { id: 's6', name: 'Big Sal Moretti', face: '🧔', attrs: { hat: false, glasses: false, beard: true, scar: true, uniform: false, mustache: false, earrings: false, tie: false, ageBand: 'old' } },
  { id: 's7', name: 'Nina Kowalski', face: '👱‍♀️', attrs: { hat: false, glasses: false, beard: false, scar: false, uniform: false, mustache: false, earrings: true, tie: false, ageBand: 'young' } },
  { id: 's8', name: 'Doctor Emil Crane', face: '🧑‍⚕️', attrs: { hat: false, glasses: true, beard: false, scar: false, uniform: false, mustache: true, earrings: false, tie: true, ageBand: 'old' } },
  { id: 's9', name: 'Tommy "Wheels" Park', face: '🧑‍🎤', attrs: { hat: true, glasses: true, beard: false, scar: false, uniform: false, mustache: false, earrings: false, tie: false, ageBand: 'young' } },
  { id: 's10', name: 'Sgt. Ada Reyes', face: '👩‍✈️', attrs: { hat: true, glasses: false, beard: false, scar: true, uniform: true, mustache: false, earrings: false, tie: false, ageBand: 'middle' } },
  { id: 's11', name: 'Felix Grant', face: '🤵', attrs: { hat: false, glasses: false, beard: true, scar: false, uniform: false, mustache: true, earrings: false, tie: true, ageBand: 'middle' } },
  { id: 's12', name: 'Pearl Nguyen', face: '👵', attrs: { hat: false, glasses: true, beard: false, scar: false, uniform: false, mustache: false, earrings: true, tie: false, ageBand: 'old' } },
];

/** Questionable boolean attributes, in UI order. */
export const ATTRIBUTE_KEYS = [
  'hat',
  'glasses',
  'beard',
  'scar',
  'uniform',
  'mustache',
  'earrings',
  'tie',
] as const;

export type BooleanAttr = (typeof ATTRIBUTE_KEYS)[number];

export const ATTRIBUTE_LABELS: Record<BooleanAttr, string> = {
  hat: 'wearing a hat',
  glasses: 'wearing glasses',
  beard: 'has a beard',
  scar: 'has a scar',
  uniform: 'in uniform',
  mustache: 'has a mustache',
  earrings: 'wearing earrings',
  tie: 'wearing a tie',
};

export function getSuspect(id: string): Suspect | undefined {
  return SUSPECTS.find((s) => s.id === id);
}
