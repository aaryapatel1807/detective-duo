/**
 * Duo Corner together-mode helpers (pure, tested).
 *
 * These decide turn order, winners and round phases from session state
 * alone, so the together views stay thin and the rules are unit-tested.
 */

import { score, type DotsBoxesBoard } from '../generators/dotsBoxes';

/** Next turn after a Dots and Boxes move: same player again on a box, else pass. */
export function dotsNextTurn(
  completed: number,
  currentUid: string,
  playerUids: string[],
): string {
  if (completed > 0) return currentUid;
  const idx = playerUids.indexOf(currentUid);
  if (idx === -1) return playerUids[0] ?? currentUid;
  return playerUids[(idx + 1) % playerUids.length];
}

/** Dots and Boxes result once the board is full. Player 0/1 map to playerUids order. */
export function dotsResult(
  board: DotsBoxesBoard,
  playerUids: string[],
): { winnerUid: string | null; tie: boolean; finished: boolean } {
  const [a, b] = score(board);
  const total = board.size * board.size;
  if (a + b < total) return { winnerUid: null, tie: false, finished: false };
  if (a === b) return { winnerUid: null, tie: true, finished: true };
  return { winnerUid: playerUids[a > b ? 0 : 1] ?? null, tie: false, finished: true };
}

/**
 * Know Me phase from who has answered / guessed / validated (async-safe).
 *
 * Flow: answering -> guessing -> reveal-without-verdict, then each
 * partner validates only the guesses about their own answers ->
 * 'validating' until every player has validated every question ->
 * 'done', when the validated score is shown.
 *
 * Backwards compatibility: callers that pass no validations (old
 * sessions, old tests) still get 'reveal' once everyone has guessed,
 * so an in-progress session from before self-validation simply
 * enters the reveal and can validate from there — nothing already
 * answered or guessed is lost or re-asked.
 */
export function knowMePhase(
  answers: Record<string, Record<string, string>>,
  guesses: Record<string, Record<string, string>>,
  playerUids: string[],
  questionCount: number,
  validations?: Record<string, Record<string, string>>,
  questionIds?: string[],
): 'answering' | 'guessing' | 'reveal' | 'validating' | 'done' {
  const answered = (uid: string) =>
    Object.keys(answers[uid] ?? {}).filter((k) => (answers[uid][k] ?? '').trim() !== '').length >=
    questionCount;
  const guessed = (uid: string) =>
    Object.keys(guesses[uid] ?? {}).filter((k) => (guesses[uid][k] ?? '').trim() !== '').length >=
    questionCount;
  if (!playerUids.every(answered)) return 'answering';
  if (!playerUids.every(guessed)) return 'guessing';
  if (validations === undefined) return 'reveal';
  const ids = questionIds ?? Object.keys(answers[playerUids[0] ?? ''] ?? {});
  const validated = (uid: string) =>
    ids.every((qid) => (validations[uid]?.[qid] ?? '') !== '');
  if (!playerUids.every(validated)) return 'validating';
  return 'done';
}

/** Spot the Liar round phase from the round record. */
export interface LiarRoundState {
  writerUid: string;
  statements: string[];
  lieIndex: number | null;
  questions: { text: string; answer: 'yes' | 'no' | null }[];
  guessIndex: number | null;
}

export function liarPhase(r: LiarRoundState): 'writing' | 'asking' | 'picking' | 'revealed' {
  if (r.statements.length < 3 || r.lieIndex === null) return 'writing';
  if (r.guessIndex !== null) return 'revealed';
  if (r.questions.length >= 3) return 'picking';
  return 'asking';
}

/** Sketch the Clue drawer for a round: host draws first, then they alternate. */
export function sketchDrawerUid(round: number, hostUid: string, guestUid: string): string {
  return round % 2 === 0 ? hostUid : guestUid;
}

/**
 * Private two-player tally (Phase 5 correction, 24 Oct).
 *
 * This is NOT a leaderboard, XP, rank or streak: just a round-win count
 * for the two accounts in this room, shown inside the room. It lives in
 * session state, so it survives refreshes and resets with a new room.
 * The brief's "not a scoreboard" line means no public/competitive boards;
 * a tally between her and him stays.
 */
export type RoomTally = Record<string, number>;

export function tallyAfter(
  tally: RoomTally | undefined,
  winnerUid: string | null,
): RoomTally {
  if (!winnerUid) return { ...(tally ?? {}) };
  return { ...(tally ?? {}), [winnerUid]: (tally?.[winnerUid] ?? 0) + 1 };
}
