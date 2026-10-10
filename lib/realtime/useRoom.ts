'use client';

/**
 * useRoom — the single realtime entry point for every game.
 *
 *   const room = useRoom();
 *   room.createRoom('Aarya')      -> 'KX7Q2M'
 *   room.joinRoom('KX7Q2M', 'Partner')
 *   room.shared.games['tap-duel'] // game state lives here
 *   room.setShared({ games: { 'tap-duel': { taps: { a: 5 } } } }) // deep-merged + broadcast
 *   room.send('tap', { n: 1 }); room.onAction('tap', (p, from) => ...)
 *
 * Singleton: one provider instance per browser tab, shared across pages.
 * Room code persists in localStorage 'dd-room'; player id in 'dd-player-id';
 * display name in 'dd-name'.
 */

import { useCallback, useSyncExternalStore } from 'react';
import { Peer, RealtimeProvider, SharedState, ActionHandler } from './provider';
import { SocketIOProvider } from './socketio';
import { SupabaseProvider } from './supabase';
import { deepMerge } from './merge';

export const ROOM_CODE_KEY = 'dd-room';
export const PLAYER_ID_KEY = 'dd-player-id';
export const PLAYER_NAME_KEY = 'dd-name';

export interface Me {
  id: string;
  name: string;
}

function randId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function getPlayerId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = window.localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = randId();
    window.localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

function makeProvider(): RealtimeProvider {
  const kind = process.env.NEXT_PUBLIC_REALTIME_PROVIDER || 'socketio';
  const pid = getPlayerId();
  if (kind === 'supabase') return new SupabaseProvider(pid);
  return new SocketIOProvider(pid);
}

interface RoomSnapshot {
  roomCode: string | null;
  me: Me;
  members: Peer[];
  connected: boolean;
  shared: SharedState;
  busy: boolean;
  error: string | null;
}

class RoomStore {
  private provider: RealtimeProvider | null = null;
  private listeners = new Set<() => void>();
  private actionHandlers = new Map<string, Set<ActionHandler>>();
  private snap: RoomSnapshot = {
    roomCode:
      typeof window !== 'undefined' ? window.localStorage.getItem(ROOM_CODE_KEY) : null,
    me: { id: getPlayerId(), name: 'Detective' },
    members: [],
    connected: false,
    shared: {},
    busy: false,
    error: null,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      const savedName = window.localStorage.getItem(PLAYER_NAME_KEY);
      if (savedName) this.snap.me.name = savedName;
    }
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }

  subscribe = (l: () => void): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  getSnapshot = (): RoomSnapshot => this.snap;

  private get providerOrThrow(): RealtimeProvider {
    if (!this.provider) {
      this.provider = makeProvider();
      const p = this.provider;
      p.onPresence((members) => {
        this.snap = { ...this.snap, members };
        this.emit();
      });
      p.onShared((patch) => {
        this.snap = { ...this.snap, shared: deepMerge(this.snap.shared, patch) };
        this.emit();
      });
      p.onAction((type, payload, fromId) => {
        this.actionHandlers.get(type)?.forEach((h) => {
          try {
            h(payload, fromId);
          } catch (e) {
            console.error('room action handler error', type, e);
          }
        });
      });
      p.onConnectionChange((connected) => {
        this.snap = { ...this.snap, connected };
        this.emit();
      });
    }
    return this.provider;
  }

  setName(name: string) {
    const clean = name.trim().slice(0, 24) || 'Detective';
    this.snap = { ...this.snap, me: { ...this.snap.me, name: clean } };
    try {
      window.localStorage.setItem(PLAYER_NAME_KEY, clean);
    } catch {}
    this.emit();
  }

  async createRoom(name?: string): Promise<string> {
    const p = this.providerOrThrow;
    this.snap = { ...this.snap, busy: true, error: null };
    this.emit();
    try {
      const displayName = name || this.snap.me.name;
      this.setName(displayName);
      const code = await p.createRoom(displayName);
      this.snap = { ...this.snap, roomCode: code, busy: false, shared: {} };
      try {
        window.localStorage.setItem(ROOM_CODE_KEY, code);
      } catch {}
      this.emit();
      return code;
    } catch (e: any) {
      this.snap = { ...this.snap, busy: false, error: e?.message || 'create failed' };
      this.emit();
      throw e;
    }
  }

  async joinRoom(code: string, name?: string): Promise<void> {
    const p = this.providerOrThrow;
    this.snap = { ...this.snap, busy: true, error: null };
    this.emit();
    try {
      const displayName = name || this.snap.me.name;
      this.setName(displayName);
      const { members, shared } = await p.joinRoom(code.trim().toUpperCase(), displayName);
      this.snap = {
        ...this.snap,
        roomCode: code.trim().toUpperCase(),
        members,
        shared,
        busy: false,
      };
      try {
        window.localStorage.setItem(ROOM_CODE_KEY, this.snap.roomCode!);
      } catch {}
      this.emit();
    } catch (e: any) {
      this.snap = { ...this.snap, busy: false, error: e?.message || 'join failed' };
      this.emit();
      throw e;
    }
  }

  leaveRoom() {
    this.provider?.leaveRoom();
    this.snap = { ...this.snap, roomCode: null, members: [], shared: {} };
    try {
      window.localStorage.removeItem(ROOM_CODE_KEY);
    } catch {}
    this.emit();
  }

  setShared(patch: SharedState) {
    // Optimistic local merge, then broadcast.
    this.snap = { ...this.snap, shared: deepMerge(this.snap.shared, patch) };
    this.emit();
    this.provider?.patchShared(patch);
  }

  send(type: string, payload: any) {
    this.provider?.sendAction(type, payload);
  }

  onAction(type: string, handler: ActionHandler): () => void {
    let set = this.actionHandlers.get(type);
    if (!set) {
      set = new Set();
      this.actionHandlers.set(type, set);
    }
    set.add(handler);
    return () => {
      set!.delete(handler);
      if (set!.size === 0) this.actionHandlers.delete(type);
    };
  }
}

const store = new RoomStore();

export interface RoomApi {
  roomCode: string | null;
  createRoom(name?: string): Promise<string>;
  joinRoom(code: string, name?: string): Promise<void>;
  leaveRoom(): void;
  me: Me;
  setName(name: string): void;
  /** The other detective in the room, or null when alone. */
  peer: Peer | null;
  members: Peer[];
  connected: boolean;
  busy: boolean;
  error: string | null;
  /** Room-wide shared state. Games live under shared.games[slug]. */
  shared: SharedState;
  /** Deep-merge a patch into shared state and broadcast it. */
  setShared(patch: SharedState): void;
  /** Send a one-off action message to the room. */
  send(type: string, payload: any): void;
  /** Subscribe to action messages of a given type. Returns unsubscribe. */
  onAction(type: string, handler: ActionHandler): () => void;
}

export function useRoom(): RoomApi {
  const snap = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  const createRoom = useCallback((name?: string) => store.createRoom(name), []);
  const joinRoom = useCallback((code: string, name?: string) => store.joinRoom(code, name), []);
  const leaveRoom = useCallback(() => store.leaveRoom(), []);
  const setName = useCallback((name: string) => store.setName(name), []);
  const setShared = useCallback((patch: SharedState) => store.setShared(patch), []);
  const send = useCallback((type: string, payload: any) => store.send(type, payload), []);
  const onAction = useCallback(
    (type: string, handler: ActionHandler) => store.onAction(type, handler),
    [],
  );

  const peer = snap.members.find((m) => m.id !== snap.me.id) ?? null;

  return {
    roomCode: snap.roomCode,
    createRoom,
    joinRoom,
    leaveRoom,
    me: snap.me,
    setName,
    peer,
    members: snap.members,
    connected: snap.connected,
    busy: snap.busy,
    error: snap.error,
    shared: snap.shared,
    setShared,
    send,
    onAction,
  };
}
