'use client';

import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { Peer, RealtimeProvider, SharedState } from './provider';
import { deepMerge } from './merge';

/**
 * Supabase realtime provider (optional).
 * Enabled when NEXT_PUBLIC_REALTIME_PROVIDER=supabase and the Supabase
 * env vars are set. Uses broadcast channels per room; the host's client
 * is the source of truth for shared state (hosts merge patches and
 * re-broadcast full state). Minimal but functional for two players.
 */
export class SupabaseProvider implements RealtimeProvider {
  readonly name = 'supabase';
  private client: SupabaseClient | null = null;
  private channel: RealtimeChannel | null = null;
  private playerId: string;
  private playerName = 'Detective';
  private roomCode: string | null = null;
  private isHost = false;
  private shared: SharedState = {};
  private members: Peer[] = [];
  private connected = false;

  private presenceCbs = new Set<(m: Peer[]) => void>();
  private sharedCbs = new Set<(p: SharedState) => void>();
  private actionCbs = new Set<(t: string, p: any, from: string) => void>();
  private connCbs = new Set<(c: boolean) => void>();

  constructor(playerId: string) {
    this.playerId = playerId;
  }

  private ensureClient(): SupabaseClient {
    if (!this.client) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) {
        throw new Error(
          'Supabase provider needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY',
        );
      }
      this.client = createClient(url, key);
    }
    return this.client;
  }

  async connect(): Promise<void> {
    this.ensureClient();
  }

  disconnect(): void {
    this.leaveRoom();
  }

  private topic(code: string) {
    return `dd-room-${code.toUpperCase()}`;
  }

  private subscribe(code: string): Promise<void> {
    const client = this.ensureClient();
    return new Promise((resolve, reject) => {
      this.channel = client
        .channel(this.topic(code), {
          config: { presence: { key: this.playerId } },
        })
        .on('broadcast', { event: 'state' }, ({ payload }) => {
          this.shared = deepMerge(this.shared, payload.patch);
          this.sharedCbs.forEach((cb) => cb(payload.patch));
        })
        .on('broadcast', { event: 'action' }, ({ payload }) => {
          if (payload.from === this.playerId) return;
          this.actionCbs.forEach((cb) => cb(payload.type, payload.payload, payload.from));
        })
        .on('presence', { event: 'sync' }, () => {
          const state = this.channel?.presenceState() ?? {};
          this.members = Object.entries(state).map(([id, metas]: any) => ({
            id,
            name: metas[0]?.name || 'Detective',
          }));
          this.presenceCbs.forEach((cb) => cb(this.members));
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.setConn(true);
            this.channel
              ?.track({ name: this.playerName })
              .then(() => resolve())
              .catch(reject);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            reject(new Error(`supabase subscribe failed: ${status}`));
          }
        });
    });
  }

  async createRoom(name: string): Promise<string> {
    await this.connect();
    this.playerName = name;
    const code = Array.from({ length: 6 }, () =>
      'ABCDEFGHJKMNPQRSTUVWXYZ23456789'.charAt(Math.floor(Math.random() * 32)),
    ).join('');
    this.isHost = true;
    this.shared = {};
    this.roomCode = code;
    await this.subscribe(code);
    return code;
  }

  async joinRoom(code: string, name: string): Promise<{ members: Peer[]; shared: SharedState }> {
    await this.connect();
    this.playerName = name;
    this.isHost = false;
    this.roomCode = code.toUpperCase();
    await this.subscribe(this.roomCode);
    // Ask the host for the current state snapshot.
    await this.channel?.send({
      type: 'broadcast',
      event: 'action',
      payload: { type: 'dd:request-state', payload: {}, from: this.playerId },
    });
    return { members: this.members, shared: this.shared };
  }

  leaveRoom(): void {
    if (this.channel) {
      this.ensureClient().removeChannel(this.channel);
      this.channel = null;
    }
    this.setConn(false);
    this.roomCode = null;
    this.members = [];
    this.shared = {};
  }

  patchShared(patch: SharedState): void {
    if (!this.roomCode) return;
    if (this.isHost) {
      // Host applies + rebroadcasts.
      this.shared = deepMerge(this.shared, patch);
      this.sharedCbs.forEach((cb) => cb(patch));
      this.channel?.send({ type: 'broadcast', event: 'state', payload: { patch } });
    } else {
      // Guest forwards to host via action; host rebroadcasts.
      this.sendAction('dd:patch', patch);
    }
  }

  sendAction(type: string, payload: any): void {
    if (!this.roomCode) return;
    if (type === 'dd:request-state' || type === 'dd:patch') {
      if (this.isHost && type === 'dd:patch') {
        this.patchShared(payload);
        return;
      }
      if (this.isHost && type === 'dd:request-state') {
        this.channel?.send({
          type: 'broadcast',
          event: 'state',
          payload: { patch: this.shared },
        });
        return;
      }
    }
    this.channel?.send({
      type: 'broadcast',
      event: 'action',
      payload: { type, payload, from: this.playerId },
    });
  }

  onPresence(cb: (m: Peer[]) => void): () => void {
    this.presenceCbs.add(cb);
    return () => this.presenceCbs.delete(cb);
  }
  onShared(cb: (p: SharedState) => void): () => void {
    this.sharedCbs.add(cb);
    return () => this.sharedCbs.delete(cb);
  }
  onAction(cb: (t: string, p: any, f: string) => void): () => void {
    const wrapped = (t: string, p: any, f: string) => {
      // Host-side internal messages
      if (this.isHost && t === 'dd:request-state') {
        this.channel?.send({
          type: 'broadcast',
          event: 'state',
          payload: { patch: this.shared },
        });
        return;
      }
      cb(t, p, f);
    };
    this.actionCbs.add(wrapped);
    return () => this.actionCbs.delete(wrapped);
  }
  onConnectionChange(cb: (c: boolean) => void): () => void {
    this.connCbs.add(cb);
    return () => this.connCbs.delete(cb);
  }

  private setConn(c: boolean) {
    this.connected = c;
    this.connCbs.forEach((cb) => cb(c));
  }
}
