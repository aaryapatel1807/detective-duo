/**
 * Case Files: the solo mystery format for Sachi.
 *
 * A case is a small whodunit with ONE provable answer. The validator
 * (lib/cases/validator.ts) is the authority on what "provable" means:
 * every clue declares exactly which suspects it rules out, and the
 * culprit must be the only suspect left standing after all clues.
 *
 * Red herrings are flavour, never evidence: they must not name the
 * culprit and they never rule anybody out. The deduction path is the
 * author's proof walk — every step must point at a real clue id.
 */

export type CaseDifficulty = 'Easy' | 'Medium' | 'Hard' | 'Expert';

export type ClueKind = 'physical' | 'timing' | 'statement' | 'placement';

export interface CaseSuspect {
  /** Stable within the case, e.g. "s1". Unique. */
  id: string;
  name: string;
  /** What they were doing there, e.g. "Head baker". */
  role: string;
  /** Where they say they were when it happened. */
  alibi: string;
  /** Something they would rather nobody knew. Never solution-revealing. */
  secret: string;
}

export interface CaseClue {
  /** Stable within the case, e.g. "c1". Unique across clues + herrings. */
  id: string;
  kind: ClueKind;
  /** Plain human text shown on the evidence board. */
  text: string;
  /**
   * Suspect ids this clue rules OUT (they cannot be the culprit if this
   * clue is true). Must never contain the culprit. The union of all
   * clues' rulesOut sets must be exactly every non-culprit suspect.
   */
  rulesOut: string[];
}

export interface CaseRedHerring {
  /** Unique across clues + herrings, e.g. "r1". */
  id: string;
  /** Suspicious-looking flavour. Must not name the culprit. */
  text: string;
}

export interface DeductionStep {
  /** Must reference a real clue id in this case. */
  clueId: string;
  /** What this clue lets the reader conclude, in plain words. */
  text: string;
}

export interface CaseFile {
  /** Unique across the whole bank, e.g. "cf-easy-01". */
  id: string;
  title: string;
  difficulty: CaseDifficulty;
  /** One-line scene, e.g. "A bookshop after closing". */
  setting: string;
  /** The opening story: what happened, in 2-4 sentences. */
  narrative: string;
  /** 4-8 suspects. */
  suspects: CaseSuspect[];
  /** At least 1 clue; in practice enough to rule out every innocent. */
  clues: CaseClue[];
  /** Suspicious flavour that proves nothing. */
  redHerrings: CaseRedHerring[];
  solution: {
    culpritId: string;
    /** Short plain-words explanation of how it was done. */
    explanation: string;
  };
  /** The proof walk, revealed after solving. */
  deductionPath: DeductionStep[];
}
