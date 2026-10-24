'use client';

/**
 * useRoom: Supabase Realtime channel + presence for one room, with the
 * game_sessions row as the durable source of truth.
 *
 * - On mount: load the session row (DB or local), ensure the current
 *   player is listed, subscribe to `dd-together-<CODE>`, track presence.
 * - Live updates travel as broadcast 'patch' events (shallow state
 *   merges) and are written through to the row (debounced 600ms,
 *   immediate for chat/accusations/wins). A refresh re-loads the row,
 *   so the game restores exactly.
 * - Pause: once both players have been present, a drop below two
 *   members pauses the game (status 'paused' in the row); return
 *   resumes it. State is never cleared by a pause.
 * - Cursors are transient broadcast only (never persisted).
 * - Local-only mode (no Supabase): same API, localStorage-backed, one
 *   member. Two-device sync needs the project; the UI says so.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { applyPatch, emptySession, type ChatMsg, type RoomSession } from '@/lib/together/types';
import {
  joinSession,
  loadSession,
  saveSession,
} from '@/lib/together/session';
import { initialPauseState, pauseTransition } from '@/lib/together/pause';

export interface Me {
  uid: string;
  name: string;
}

export interface CursorPos {
  x: number;
  y: number;
  name: string;
}

interface Member {
  uid: string;
  name: string;
}

export function useRoom(code: string, me: Me | null) {
  const [session, setSession] = useState<RoomSession | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [paused, setPaused] = useState(false);
  const [connected, setConnected] = useState(false);
  const [cursors, setCursors] = useState<Record<string, CursorPos>>({});
  const sessionRef = useRef<RoomSession | null>(null);
  const channelRef = useRef<ReturnType<NonNullable<ReturnType<typeof getSupabase>>['channel']> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pauseRef = useRef(initialPauseState());
  const cursorAt = useRef(0);

  const setBoth = useCallback((s: RoomSession | null) => {
    sessionRef.current = s;
    setSession(s);
  }, []);

  // Load + join.
  useEffect(() => {
    let active = true;
    setLoaded(false);
    (async () => {
      let s = await loadSession(code);
      if (s && me && !s.players.some((p) => p.uid === me.uid)) {
        s = await joinSession(code, { uid: me.uid, name: me.name, role: 'guest' });
      }
      if (!s && me) {
        // Guest fallback (Phase 6): a signed-out visitor cannot read the
        // row under the current RLS policy (reads need a signed-in role),
        // so give them an ephemeral local session. Live broadcast play
        // still works, and signed-in members' saves keep the room row —
        // but a guest refresh re-enters through this same fallback, so
        // durable guest restore awaits the flagged guest-sessions
        // migration. Never write the ephemeral session to the row.
        const sb = getSupabase();
        let signedIn = false;
        try {
          if (sb) {
            const { data } = await sb.auth.getSession();
            signedIn = Boolean(data?.session);
          }
        } catch {
          signedIn = false;
        }
        if (!signedIn) {
          s = {
            ...emptySession(code, { uid: me.uid, name: me.name, role: 'guest' }),
            status: 'lobby',
          };
        }
      }
      if (!active) return;
      setBoth(s);
      setLoaded(true);
      if (s && me) {
        setMembers(s.players.map((p) => ({ uid: p.uid, name: p.name })));
        // A refresh during a pause must show the waiting banner at once,
        // before presence settles.
        if (s.status === 'paused') {
          pauseRef.current = { paused: true, everTwo: true };
          setPaused(true);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [code, me?.uid, me?.name, setBoth]);

  // Realtime channel.
  useEffect(() => {
    if (!me) return;
    const sb = getSupabase();
    if (!sb) {
      setConnected(true);
      return;
    }
    const channel = sb.channel(`dd-together-${code}`, {
      config: { broadcast: { self: false }, presence: { key: me.uid } },
    });
    channelRef.current = channel;
    channel
      .on('broadcast', { event: 'patch' }, ({ payload }) => {
        const patch = payload?.patch as Record<string, unknown> | undefined;
        if (!patch) return;
        const prev = sessionRef.current;
        if (!prev) return;
        setBoth({ ...prev, state: applyPatch(prev.state, patch) });
      })
      .on('broadcast', { event: 'session' }, ({ payload }) => {
        const patch = payload?.patch as Partial<RoomSession> | undefined;
        if (!patch) return;
        const prev = sessionRef.current;
        if (!prev) return;
        const next = { ...prev, ...patch };
        setBoth(next);
        // Persist what we received, so a game started by a guest (whose
        // own saves are refused by RLS) still lands in the row through
        // a signed-in member's client. Guest clients fail silently here.
        void saveSession(next);
      })
      .on('broadcast', { event: 'cursor' }, ({ payload }) => {
        const p = payload as { uid?: string; x?: number; y?: number; name?: string } | undefined;
        if (!p || p.uid === me.uid || typeof p.x !== 'number') return;
        setCursors((prev) => ({ ...prev, [p.uid as string]: { x: p.x as number, y: p.y as number, name: p.name ?? 'Partner' } }));
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as Record<string, { name?: string }[]>;
        const list = Object.entries(state).map(([uid, metas]) => ({
          uid,
          name: metas[0]?.name ?? 'Partner',
        }));
        setMembers(list);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnected(true);
          void channel.track({ name: me.name });
        }
      });
    return () => {
      void sb.removeChannel(channel);
      channelRef.current = null;
    };
  }, [code, me?.uid, me?.name, setBoth]);

  // Pause tracking from presence.
  useEffect(() => {
    const status = sessionRef.current?.status ?? 'lobby';
    const next = pauseTransition(pauseRef.current, members.length, status);
    pauseRef.current = next;
    if (next.paused !== paused) {
      setPaused(next.paused);
      const s = sessionRef.current;
      if (s) {
        const updated: RoomSession = { ...s, status: next.paused ? 'paused' : 'playing' };
        sessionRef.current = updated;
        setSession(updated);
        void saveSession(updated);
      }
    }
  }, [members, paused]);

  // Prune stale cursors.
  useEffect(() => {
    const t = setInterval(() => setCursors({}), 6000);
    return () => clearInterval(t);
  }, []);

  const persist = useCallback((s: RoomSession, immediate: boolean) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (immediate) {
      void saveSession(s);
      return;
    }
    saveTimer.current = setTimeout(() => void saveSession(s), 600);
  }, []);

  /** Merge a patch into state, broadcast it, and write it through. */
  const update = useCallback(
    (patch: Record<string, unknown>, immediate = false) => {
      const prev = sessionRef.current;
      if (!prev) return;
      const next: RoomSession = { ...prev, state: applyPatch(prev.state, patch) };
      setBoth(next);
      channelRef.current?.send({ type: 'broadcast', event: 'patch', payload: { patch } });
      persist(next, immediate);
    },
    [persist, setBoth],
  );

  /** Replace whole session fields (game/mode/seed/status) + save now. */
  const updateSession = useCallback(
    (patch: Partial<RoomSession>) => {
      const prev = sessionRef.current;
      if (!prev) return;
      const next: RoomSession = { ...prev, ...patch, updatedAt: new Date().toISOString() };
      setBoth(next);
      channelRef.current?.send({
        type: 'broadcast',
        event: 'session',
        payload: { patch },
      });
      void saveSession(next);
    },
    [setBoth],
  );

  const sendChat = useCallback(
    (text: string) => {
      if (!me) return;
      const prev = sessionRef.current;
      if (!prev) return;
      const chat = [...((prev.state.chat as ChatMsg[] | undefined) ?? []), {
        from: me.uid,
        name: me.name,
        text: text.slice(0, 280),
        at: new Date().toISOString(),
      }].slice(-50);
      update({ chat }, true);
    },
    [me, update],
  );

  const sendNote = useCallback(
    (text: string) => {
      update({ notes: text.slice(0, 2000) });
    },
    [update],
  );

  const sendCursor = useCallback(
    (x: number, y: number) => {
      const now = Date.now();
      if (now - cursorAt.current < 150) return;
      cursorAt.current = now;
      channelRef.current?.send({
        type: 'broadcast',
        event: 'cursor',
        payload: { uid: me?.uid, x, y, name: me?.name },
      });
    },
    [me?.uid, me?.name],
  );

  return {
    session,
    loaded,
    members,
    paused,
    connected,
    cursors,
    update,
    updateSession,
    sendChat,
    sendNote,
    sendCursor,
  };
}
