'use client';

import { io, Socket } from 'socket.io-client';
import {
  ActionHandler,
  EVENTS,
  Peer,
  RealtimeProvider,
  SharedState,
} from './provider';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4001';

/** socket.io realtime provider (default). */
export class SocketIOProvider implements RealtimeProvider {
  readonly name = 'socketio';
  private socket: Socket | null = null;
  private playerId: string;
  private playerName = 'Detective';
  private roomCode: string | null = null;

  private presenceCbs = new Set<(m: Peer[]) => void>();
  private sharedCbs = new Set<(p: SharedState) => void>();
  private actionCbs = new Set<(t: string, p: any, from: string) => void>();
  private connCbs = new Set<(c: boolean) => void>();

  constructor(playerId: string) {
    this.playerId = playerId;
  }

  private ensure(): Socket {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
      });
      this.socket.on('connect', () => this.emitConn(true));
      this.socket.on('disconnect', () => this.emitConn(false));
      this.socket.on(EVENTS.PRESENCE, (members: Peer[]) =>
        this.presenceCbs.forEach((cb) => cb(members)),
      );
      this.socket.on(EVENTS.STATE, (patch: SharedState) =>
        this.sharedCbs.forEach((cb) => cb(patch)),
      );
      this.socket.on(EVENTS.ACTION, ({ type, payload, from }: any) =>
        this.actionCbs.forEach((cb) => cb(type, payload, from)),
      );
    }
    return this.socket;
  }

  async connect(): Promise<void> {
    const s = this.ensure();
    if (s.connected) return;
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('socket connect timeout')), 8000);
      s.once('connect', () => {
        clearTimeout(t);
        resolve();
      });
      s.once('connect_error', (e) => {
        clearTimeout(t);
        reject(e);
      });
    });
  }

  disconnect(): void {
    this.leaveRoom();
    this.socket?.disconnect();
    this.socket = null;
  }

  async createRoom(name: string): Promise<string> {
    await this.connect();
    this.playerName = name;
    const s = this.ensure();
    const code: string = await new Promise((resolve, reject) => {
      s.emit(
        EVENTS.CREATE,
        { playerId: this.playerId, name },
        (res: { code?: string; error?: string }) =>
          res?.code ? resolve(res.code) : reject(new Error(res?.error || 'create failed')),
      );
    });
    this.roomCode = code;
    return code;
  }

  async joinRoom(code: string, name: string): Promise<{ members: Peer[]; shared: SharedState }> {
    await this.connect();
    this.playerName = name;
    const s = this.ensure();
    const res: { ok?: boolean; error?: string; members?: Peer[]; shared?: SharedState } =
      await new Promise((resolve) => {
        s.emit(
          EVENTS.JOIN,
          { code: code.toUpperCase(), playerId: this.playerId, name },
          (r: any) => resolve(r),
        );
      });
    if (!res?.ok) throw new Error(res?.error || 'join failed');
    this.roomCode = code.toUpperCase();
    return { members: res.members || [], shared: res.shared || {} };
  }

  leaveRoom(): void {
    if (this.roomCode && this.socket?.connected) {
      this.socket.emit(EVENTS.LEAVE, {
        code: this.roomCode,
        playerId: this.playerId,
      });
    }
    this.roomCode = null;
  }

  patchShared(patch: SharedState): void {
    if (!this.roomCode || !this.socket?.connected) return;
    this.socket.emit(EVENTS.PATCH, {
      code: this.roomCode,
      playerId: this.playerId,
      patch,
    });
  }

  sendAction(type: string, payload: any): void {
    if (!this.roomCode || !this.socket?.connected) return;
    this.socket.emit(EVENTS.ACTION, {
      code: this.roomCode,
      playerId: this.playerId,
      type,
      payload,
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
  onAction(cb: ActionHandler extends never ? never : (t: string, p: any, f: string) => void): () => void {
    this.actionCbs.add(cb);
    return () => this.actionCbs.delete(cb);
  }
  onConnectionChange(cb: (c: boolean) => void): () => void {
    this.connCbs.add(cb);
    return () => this.connCbs.delete(cb);
  }

  private emitConn(c: boolean) {
    this.connCbs.forEach((cb) => cb(c));
  }
}
