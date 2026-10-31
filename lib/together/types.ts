/**
 * Together-mode session model.
 *
 * A room is one row in `game_sessions` (or one localStorage entry in
 * local-only mode). The row is the source of truth: a page refresh
 * re-loads it and re-subscribes, so the game restores exactly.
 *
 * State is plain JSON, namespaced per game. Callers patch whole
 * sub-objects (e.g. `{ marks: {...} }`); applyPatch shallow-merges
 * them, which keeps broadcast + DB writes predictable and testable.
 *
 * State shapes (all optional until the game starts):
 * - coop logic-grids: { marks: Record<"cat:item", "yes"|"no">,
 *     struckClues: number[], notes: string, chat: ChatMsg[] }
 * - versus logic-grids: { answers: Record<uid, Record<string,string>>,
 *     progress: Record<uid, number>, winnerUid: string|null, chat }
 * - versus cipher-desk: { answers: Record<uid, string>,
 *     progress: Record<uid, number>, winnerUid, chat }
 * - versus nonograms: { answers: Record<uid, Record<string,string>>,
 *     progress: Record<uid, number>, winnerUid, chat }
 * - coop case-files: { pinned: string[], accused: string|null,
 *     solved: boolean, solvedBy: string|null, notes, chat }
 * - coop escape-rooms: { inventory: string[], openedLocks: string[],
 *     inspected: string[], escapeRole: Record<uid, "room"|"notebook">,
 *     escaped: boolean, notes, chat }
 * - versus dots-boxes: { dotsBoard: DotsBoxesBoard, dotsTurn: uid,
 *     tally: Record<uid, number> } (shared board, alternating turns;
 *     a finished board sets winnerUid, or null on a tie)
 * - versus safe-cracker: { safeGuesses: Record<uid, GuessRecord[]>,
 *     safeProgress: Record<uid, number>, tally } (same secret code;
 *     progress = share of the candidate set ruled out)
 * - coop sketch-clue: { sketchRound: number, sketchStrokes: Stroke[],
 *     sketchGuesses: {name,text}[], sketchWonUid: uid|null }
 * - coop spot-liar: { liarRound: number, liarWriter: uid,
 *     liarStatements: string[], liarLie: number|null,
 *     liarQuestions: {text, answer}[], liarGuess: number|null, tally }
 *     (round win: questioner if they pick the lie, writer if fooled)
 * - coop know-me: { knowAnswers: Record<uid, Record<qid, string>>,
 *     knowGuesses: Record<uid, Record<qid, string>>,
 *     knowValidations: Record<ownerUid, Record<qid, 'correct'|'incorrect'>> }
 *     (reveal with NO app verdict once every player has answered AND
 *     guessed; each partner then validates only the guesses about
 *     their own answers, and the validated score shows once every
 *     owner has validated every question)
 * - coop know-me Would You Rather: { wyrAnswers: Record<uid, Record<wyrId, 'A'|'B'>>,
 *     wyrGuesses: Record<uid, Record<wyrId, 'A'|'B'>>,
 *     wyrValidations: Record<ownerUid, Record<wyrId, 'correct'|'incorrect'>> }
 *     (same answer -> guess -> reveal -> validate flow, separate keys)
 * - every game: { notes: string, chat: ChatMsg[] } (shared extras)
 * - tally (private, Phase 5): round wins per player inside this room
 *   only. Not a leaderboard, not XP, not a rank — just the two of them.
 *   Phase 6 extends the same tally to the original versus modes
 *   (logic-grids, cipher-desk, nonograms) and the quick games.
 * - versus quoridor (Phase 6): { quoridor: QuoridorState } — shared
 *   board; host initializes it, host declares the winner.
 * - versus vibe-check (Phase 6): { vibeTurn: uid, vibePending:
 *   { askerUid, questionId, text, trait } | null, vibeLastAnswer:
 *   { text, answer } | null, vibeAsked: string[], vibeEliminated:
 *   Record<uid, number[]> } — secrets are never stored: each player
 *   derives their own from seed + uid, and only their own is shown.
 * - versus jinx (Phase 6): { answers: Record<uid, string[]>,
 *   jinxSubmitted: Record<uid, boolean> } — host declares the winner
 *   from the two lists once both are submitted (tie = no winner).
 * - boothAutoSnap (Phase 6): boolean — offer a win strip when a
 *   round is won.
 * - dateNightRoll (Phase 6): { counter, dinner, activity, treat,
 *   entertainment } — the latest shared date-night roll in this room.
 */

export type TogetherMode = 'coop' | 'versus';
export type TogetherStatus = 'lobby' | 'playing' | 'paused' | 'finished';

export interface RoomPlayer {
  uid: string;
  name: string;
  role: 'host' | 'guest';
}

export interface ChatMsg {
  from: string;
  name: string;
  text: string;
  at: string;
}

export interface RoomSession {
  code: string;
  game: string;
  mode: TogetherMode | '';
  seed: string;
  level: number;
  state: Record<string, unknown>;
  players: RoomPlayer[];
  status: TogetherStatus;
  winnerUid: string | null;
  updatedAt: string;
}

export function emptySession(code: string, host: RoomPlayer): RoomSession {
  return {
    code,
    game: '',
    mode: '',
    seed: '',
    level: 1,
    state: { notes: '', chat: [] as ChatMsg[] },
    players: [host],
    status: 'lobby',
    winnerUid: null,
    updatedAt: new Date().toISOString(),
  };
}

/** Shallow-merge a patch into state (patch wins per top-level key). */
export function applyPatch(
  state: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  return { ...state, ...patch };
}

/** JSON round-trip: the exact path a refresh takes (DB -> parse). */
export function serializeSession(s: RoomSession): string {
  return JSON.stringify(s);
}

export function deserializeSession(raw: string): RoomSession | null {
  try {
    const parsed = JSON.parse(raw) as RoomSession;
    if (!parsed || typeof parsed !== 'object' || typeof parsed.code !== 'string') {
      return null;
    }
    return {
      ...parsed,
      state: (parsed.state ?? {}) as Record<string, unknown>,
      players: Array.isArray(parsed.players) ? parsed.players : [],
    };
  } catch {
    return null;
  }
}

export function sessionFromRow(row: {
  room_code: string;
  game: string;
  seed: string;
  state: unknown;
  players: unknown;
  updated_at: string;
}): RoomSession {
  const state = (row.state ?? {}) as Record<string, unknown>;
  return {
    code: row.room_code,
    game: row.game ?? '',
    mode: (state.mode as TogetherMode | '') ?? '',
    seed: row.seed ?? '',
    level: (state.level as number) ?? 1,
    state,
    players: Array.isArray(row.players) ? (row.players as RoomPlayer[]) : [],
    status: (state.status as TogetherStatus) ?? 'lobby',
    winnerUid: (state.winnerUid as string | null) ?? null,
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

/** Row shape written back to game_sessions (mode/status/level ride in state). */
export function sessionToRow(s: RoomSession): {
  room_code: string;
  game: string;
  seed: string;
  state: Record<string, unknown>;
  players: RoomPlayer[];
} {
  return {
    room_code: s.code,
    game: s.game,
    seed: s.seed,
    state: { ...s.state, mode: s.mode, level: s.level, status: s.status, winnerUid: s.winnerUid },
    players: s.players,
  };
}

/** Deterministic versus seed: both players generate the identical puzzle. */
export function versusSeed(code: string, game: string, level: number): string {
  return `vs|${code}|${game}|${level}`;
}

/** Deterministic co-op seed (case split, escape room, shared grid). */
export function coopSeed(code: string, game: string, level: number): string {
  return `coop|${code}|${game}|${level}`;
}
