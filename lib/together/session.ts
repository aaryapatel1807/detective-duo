/**
 * Session storage: Supabase `game_sessions` when configured and signed
 * in, localStorage otherwise (local-only mode: rooms work in this
 * browser, but two devices cannot sync without the project).
 *
 * Last-room memory: localStorage `dd-v2-last-room` (instant, offline)
 * plus the players record in the DB row (survives device switches).
 */
import { getSupabase, isSupabaseConfigured } from '../supabase/client';
import {
  emptySession,
  sessionFromRow,
  sessionToRow,
  type RoomPlayer,
  type RoomSession,
} from './types';

export type { RoomPlayer, RoomSession } from './types';

export const LAST_ROOM_KEY = 'dd-v2-last-room';
export const DISPLAY_NAME_KEY = 'dd-v2-display-name';

function localKey(code: string): string {
  return `dd-v2-room-${code}`;
}

export function getDisplayName(): string {
  try {
    return localStorage.getItem(DISPLAY_NAME_KEY) || 'Detective';
  } catch {
    return 'Detective';
  }
}

export function setDisplayName(name: string): void {
  try {
    localStorage.setItem(DISPLAY_NAME_KEY, name);
  } catch {
    /* ignore */
  }
}

export function rememberLastRoom(code: string): void {
  try {
    localStorage.setItem(LAST_ROOM_KEY, code);
  } catch {
    /* ignore */
  }
}

export function lastRoomCode(): string | null {
  try {
    return localStorage.getItem(LAST_ROOM_KEY);
  } catch {
    return null;
  }
}

export async function loadSession(code: string): Promise<RoomSession | null> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from('game_sessions')
      .select('room_code,game,seed,state,players,updated_at')
      .eq('room_code', code)
      .maybeSingle();
    if (error || !data) return null;
    return sessionFromRow(data as never);
  }
  try {
    const raw = localStorage.getItem(localKey(code));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RoomSession;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveSession(s: RoomSession): Promise<void> {
  const row = sessionToRow(s);
  const sb = getSupabase();
  if (sb) {
    await sb.from('game_sessions').upsert(
      { ...row, updated_at: new Date().toISOString() },
      { onConflict: 'room_code' },
    );
    return;
  }
  try {
    localStorage.setItem(localKey(s.code), JSON.stringify({ ...s, updatedAt: new Date().toISOString() }));
  } catch {
    /* ignore */
  }
}

export async function createSession(code: string, host: RoomPlayer): Promise<RoomSession> {
  const s = emptySession(code, host);
  await saveSession(s);
  rememberLastRoom(code);
  return s;
}

/** Join an existing room: adds the player if not already listed. */
export async function joinSession(
  code: string,
  player: RoomPlayer,
): Promise<RoomSession | null> {
  const existing = await loadSession(code);
  if (!existing) return null;
  if (!existing.players.some((p) => p.uid === player.uid)) {
    existing.players = [...existing.players, player];
    await saveSession(existing);
  }
  rememberLastRoom(code);
  return existing;
}

/**
 * Most recent room the user is a player of (DB when available, else the
 * local last-room code). Used by "reopen last room with one tap".
 */
export async function myLastSession(uid: string): Promise<RoomSession | null> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from('game_sessions')
      .select('room_code,game,seed,state,players,updated_at')
      .order('updated_at', { ascending: false })
      .limit(20);
    const rows = (data ?? []) as never[];
    for (const row of rows) {
      const s = sessionFromRow(row as never);
      if (s.players.some((p) => p.uid === uid)) return s;
    }
    return null;
  }
  const code = lastRoomCode();
  if (!code) return null;
  return loadSession(code);
}

export function isConfigured(): boolean {
  return isSupabaseConfigured;
}
