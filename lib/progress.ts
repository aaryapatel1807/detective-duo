/**
 * Progress: per-game level + stars, stored per account in Supabase
 * (table `progress`) with a localStorage cache.
 *
 * The cache is the source the UI reads, so the app works offline after
 * load. When signed in, local changes are pushed up and remote rows are
 * pulled down on sign-in; conflicts resolve last-write-wins by
 * last_played_at, which is fine for one person on her own devices.
 *
 * Stars: a finished level always earns at least 1.
 *   3 stars — no hints used and at most 1 mistake
 *   2 stars — at most 2 hints, or at most 3 mistakes
 *   1 star  — finished, with more help than that
 * Hints are free; stars are a keepsake, not a punishment.
 */
import { getSupabase } from './supabase/client';

export interface GameProgress {
  currentLevel: number;
  stars: Record<string, number>;
  hintsUsed: number;
  mistakes: number;
  lastPlayedAt: string | null;
}

export type ProgressMap = Record<string, GameProgress>;

const CACHE_KEY = 'dd-v2-progress';
const QUEUE_KEY = 'dd-v2-progress-queue';

/**
 * Offline queue (Phase 4): when a progress push fails — offline, or the
 * network drops mid-write — the game's row waits here in localStorage.
 * syncProgress() drains it on reconnect. Last-write-wins per game and
 * best-stars-per-level still hold: the queued row is the latest local
 * row for that game, and the merge in syncProgress keeps the best star
 * per level from either side.
 */
export type PendingQueue = Record<string, GameProgress>;

export function loadPendingProgress(): PendingQueue {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PendingQueue;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function savePendingProgress(q: PendingQueue): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {
    /* ignore */
  }
}

export function enqueuePendingProgress(game: string, p: GameProgress): PendingQueue {
  const q = { ...loadPendingProgress(), [game]: p };
  savePendingProgress(q);
  return q;
}

export function dequeuePendingProgress(game: string): void {
  const q = loadPendingProgress();
  delete q[game];
  savePendingProgress(q);
}

export function emptyProgress(): GameProgress {
  return { currentLevel: 1, stars: {}, hintsUsed: 0, mistakes: 0, lastPlayedAt: null };
}

export function computeStars(hints: number, mistakes: number): number {
  if (hints === 0 && mistakes <= 1) return 3;
  if (hints <= 2 || mistakes <= 3) return 2;
  return 1;
}

export function loadLocalProgress(): ProgressMap {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ProgressMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveLocalProgress(map: ProgressMap): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch {
    // Storage full/blocked — play continues without the cache.
  }
}

export function getGameProgress(map: ProgressMap, game: string): GameProgress {
  return map[game] ?? emptyProgress();
}

/** Record a finished level. Returns the updated map (already cached). */
export function recordWin(
  map: ProgressMap,
  game: string,
  level: number,
  hints: number,
  mistakes: number,
): { map: ProgressMap; stars: number } {
  const prev = getGameProgress(map, game);
  const stars = computeStars(hints, mistakes);
  const best = Math.max(prev.stars[String(level)] ?? 0, stars);
  const next: GameProgress = {
    currentLevel: Math.max(prev.currentLevel, level + 1),
    stars: { ...prev.stars, [String(level)]: best },
    hintsUsed: prev.hintsUsed + hints,
    mistakes: prev.mistakes + mistakes,
    lastPlayedAt: new Date().toISOString(),
  };
  const out = { ...map, [game]: next };
  saveLocalProgress(out);
  void pushGameProgress(game, next);
  return { map: out, stars };
}

interface ProgressRow {
  game: string;
  current_level: number;
  stars: Record<string, number>;
  hints_used: number;
  mistakes: number;
  last_played_at: string | null;
}

function rowToProgress(r: ProgressRow): GameProgress {
  return {
    currentLevel: r.current_level,
    stars: r.stars ?? {},
    hintsUsed: r.hints_used,
    mistakes: r.mistakes,
    lastPlayedAt: r.last_played_at,
  };
}

/** Push one game's progress up (no-op when signed out / unconfigured).
 *  On any failure (offline, dropped network) the row is queued locally
 *  instead of lost — syncProgress() retries it on reconnect. */
export async function pushGameProgress(game: string, p: GameProgress): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    const { data } = await sb.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return;
    const { error } = await sb.from('progress').upsert(
      {
        user_id: uid,
        game,
        current_level: p.currentLevel,
        stars: p.stars,
        hints_used: p.hintsUsed,
        mistakes: p.mistakes,
        last_played_at: p.lastPlayedAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,game' },
    );
    if (error) throw error;
    dequeuePendingProgress(game);
  } catch {
    // Offline or failed: keep the row in the local queue for reconnect.
    enqueuePendingProgress(game, p);
  }
}

/** Retry every queued row; rows that still fail stay queued. */
export async function flushPendingProgress(): Promise<void> {
  const q = loadPendingProgress();
  for (const [game, p] of Object.entries(q)) {
    await pushGameProgress(game, p);
  }
}

/**
 * Pull the signed-in user's rows and merge with the local cache
 * (per game, the row with the later last_played_at wins; stars merge
 * by keeping the best per level so nothing earned is ever lost).
 */
export async function syncProgress(local: ProgressMap): Promise<ProgressMap> {
  const sb = getSupabase();
  if (!sb) return local;
  // Reconnect path: push anything queued while offline first, so the
  // server sees the latest local rows before we pull and merge.
  await flushPendingProgress();
  let uid: string | undefined;
  try {
    const { data } = await sb.auth.getSession();
    uid = data.session?.user.id;
  } catch {
    return local;
  }
  if (!uid) return local;
  let rows: ProgressRow[] | null = null;
  try {
    const res = await sb
      .from('progress')
      .select('game,current_level,stars,hints_used,mistakes,last_played_at')
      .eq('user_id', uid);
    if (res.error || !res.data) return local;
    rows = res.data as ProgressRow[];
  } catch {
    return local;
  }

  const merged: ProgressMap = { ...local };
  for (const row of rows as ProgressRow[]) {
    const remote = rowToProgress(row);
    const mine = merged[row.game];
    if (!mine) {
      merged[row.game] = remote;
      continue;
    }
    const remoteNewer =
      (remote.lastPlayedAt ?? '') >= (mine.lastPlayedAt ?? '');
    const base = remoteNewer ? remote : mine;
    const other = remoteNewer ? mine : remote;
    const stars: Record<string, number> = { ...other.stars };
    for (const [lvl, s] of Object.entries(base.stars)) {
      stars[lvl] = Math.max(stars[lvl] ?? 0, s);
    }
    merged[row.game] = {
      currentLevel: Math.max(mine.currentLevel, remote.currentLevel),
      stars,
      hintsUsed: base.hintsUsed,
      mistakes: base.mistakes,
      lastPlayedAt: base.lastPlayedAt,
    };
    if (!remoteNewer) void pushGameProgress(row.game, merged[row.game]);
  }
  // Push any local-only games up.
  for (const game of Object.keys(local)) {
    if (!rows.some((r) => (r as ProgressRow).game === game)) {
      void pushGameProgress(game, local[game]);
    }
  }
  saveLocalProgress(merged);
  return merged;
}
