/* Crime Mystery shared types. */

import type { Clue } from '../../lib/content/cases';

/** Which half of the asymmetric clue deal a player holds. Host = 'a'. */
export type Side = 'a' | 'b';

/** Board position as % of board width/height (0..100). */
export interface PinPos {
  x: number;
  y: number;
}

/** A red string between two clue pins, stored by clue id. */
export interface StringLink {
  a: string;
  b: string;
}

/** Hint token earned in Cipher Breaker (written by the cipher-breaker game). */
export interface HintToken {
  from: string;
  text: string;
}

export type MysteryPhase = 'select' | 'board' | 'accuse' | 'solved' | 'failed';

export type CaseResult = 'solved' | 'failed';

/**
 * Everything the mystery game keeps in room.shared.games['crime-mystery'].
 * Arrays replace (never merge) under the realtime deep-merge rules.
 */
export interface MysteryShared {
  caseId?: string | null;
  phase?: MysteryPhase;
  /** playerId -> 'a' | 'b'. The player who opened the case is 'a'. */
  sides?: Record<string, Side>;
  /** clueId -> board position (% coords). */
  pins?: Record<string, PinPos>;
  /** Red strings between clue ids. */
  links?: StringLink[];
  /** playerId -> suspect name. UI hides choices until both voted. */
  votes?: Record<string, string>;
  /** Wrong accusations so far (1 retry allowed). */
  attempts?: number;
  /** "The captain doubts you" penalty flag after a wrong vote. */
  doubted?: boolean;
  /** Tokens granted by cipher-breaker solves. */
  hintTokens?: HintToken[];
  /** How many tokens have been spent. */
  hintsUsed?: number;
  /** Bonus 'both' clue revealed via a token. */
  bonusRevealed?: boolean;
  /** Nudges already shown from spent tokens. */
  nudgesShown?: string[];
  /** caseId -> result, per room. */
  log?: Record<string, CaseResult>;
  /** playerId -> true once XP was awarded for the solved case. */
  awarded?: Record<string, boolean>;
  /** Detective-created sticky notes pinned to the board. */
  stickies?: BoardSticky[];
  /** Shared detective notepad text (Notes tab). */
  notepad?: string;
}

/** A player-authored sticky note on the evidence board. */
export interface BoardSticky {
  id: string;
  text: string;
  pos: PinPos;
  rotate: number;
}

/** A scripted interrogation Q&A pair for one suspect. */
export interface QA {
  q: string;
  a: string;
}

/** Bonus content unlocked by spending a hint token. */
export interface HintExtras {
  /** An extra 'both' clue revealed by the first spent token. */
  bonus: Clue;
  /** Nudges revealed by later tokens, in order. */
  nudges: string[];
}
