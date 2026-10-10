/* Detective Duo XP + detective rank ladder.
 * Per-player XP persists in localStorage 'dd-xp' and syncs into the room
 * via shared.xp when a room is active (game agents: call syncXp(room)).
 */

export const XP_KEY = 'dd-xp';

export interface Rank {
  name: string;
  min: number;
}

export const RANKS: Rank[] = [
  { name: 'Rookie', min: 0 },
  { name: 'Observer', min: 100 },
  { name: 'Sleuth', min: 250 },
  { name: 'Investigator', min: 500 },
  { name: 'Detective', min: 1000 },
  { name: 'Chief Inspector', min: 2000 },
];

/** Standard XP awards. Game agents: use these constants for consistency. */
export const XP_AWARDS = {
  soloWin: 25,
  soloParticipation: 5,
  duoWin: 100,
  duoParticipation: 20,
  coopWin: 150,
  coopParticipation: 40,
  clueSolved: 30,
  cipherSolved: 30,
  mysterySolved: 200,
  perfectRound: 50,
} as const;

export function rankFor(xp: number): Rank {
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (xp >= r.min) rank = r;
  }
  return rank;
}

export interface RankProgress {
  rank: Rank;
  next: Rank | null;
  /** XP into the current rank */
  into: number;
  /** XP needed to finish the current rank (0 at max rank) */
  span: number;
  /** 0..1 progress toward the next rank */
  pct: number;
}

export function progressToNext(xp: number): RankProgress {
  const rank = rankFor(xp);
  const idx = RANKS.indexOf(rank);
  const next = idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
  if (!next) return { rank, next: null, into: 0, span: 0, pct: 1 };
  const into = xp - rank.min;
  const span = next.min - rank.min;
  return { rank, next, into, span, pct: Math.min(1, Math.max(0, into / span)) };
}

function safeGet(): number {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(XP_KEY) : null;
    const n = raw == null ? 0 : parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** Current local XP. */
export function getXP(): number {
  return safeGet();
}

/**
 * Award XP locally. Returns the new total. Negative amounts are clamped
 * at zero — XP never goes below 0.
 */
export function awardXP(amount: number): number {
  const next = Math.max(0, safeGet() + Math.round(amount));
  try {
    window.localStorage.setItem(XP_KEY, String(next));
  } catch {}
  return next;
}

/**
 * Push local XP into room shared state so the partner's scoreboard can
 * show both detectives. Call after awardXP when a room is active.
 */
export function syncXpToRoom(
  setShared: (patch: Record<string, any>) => void,
  playerId: string,
  playerName: string,
): void {
  setShared({ xp: { [playerId]: { name: playerName, xp: getXP() } } });
}
