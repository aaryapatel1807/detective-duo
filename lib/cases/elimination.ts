import type { CaseFile } from './types';

/**
 * Live elimination for the Case Files board.
 *
 * Pinning a clue rules out every suspect in that clue's rulesOut; a
 * wrong accusation rules out its suspect too. Red herrings rule out
 * nobody (they carry no rulesOut). The culprit is never ruled out —
 * the validator guarantees no clue rules out the culprit, and a
 * correct accusation ends the case before it could be "wrong".
 * Everything here is derived from the case data, so no case content
 * had to change for the board to narrow as you pin.
 */

export interface RuledOut {
  suspectId: string;
  by: 'clue' | 'accusation';
  clueId?: string;
  clueText?: string;
}

export interface Elimination {
  ruledOut: RuledOut[];
  standingIds: string[];
}

export function eliminationFor(
  c: CaseFile,
  pinnedIds: string[],
  wrongAccusedIds: string[],
): Elimination {
  const byId = new Map<string, RuledOut>();
  for (const clue of c.clues) {
    if (!pinnedIds.includes(clue.id)) continue;
    for (const sid of clue.rulesOut) {
      if (!byId.has(sid)) {
        byId.set(sid, { suspectId: sid, by: 'clue', clueId: clue.id, clueText: clue.text });
      }
    }
  }
  for (const sid of wrongAccusedIds) {
    if (!byId.has(sid)) byId.set(sid, { suspectId: sid, by: 'accusation' });
  }
  const ruledOut = [...byId.values()];
  const ruledIds = new Set(ruledOut.map((r) => r.suspectId));
  return {
    ruledOut,
    standingIds: c.suspects.filter((s) => !ruledIds.has(s.id)).map((s) => s.id),
  };
}
