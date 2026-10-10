/* Detective Duo realtime abstraction.
 *
 * Two providers:
 *  - socket.io  (default; standalone node server in server/, works on localhost)
 *  - supabase   (behind NEXT_PUBLIC_REALTIME_PROVIDER=supabase + URL/anon key)
 *
 * Rooms are in-memory on the socket server. No auth: display names come
 * from localStorage. Shared state is a plain JSON object; patches are
 * deep-merged on every client. Games live under shared.games[slug].
 */

export interface Peer {
  id: string;
  name: string;
}

export type SharedState = Record<string, any>;

export type ActionHandler = (payload: any, fromId: string) => void;

export interface RealtimeProvider {
  readonly name: string;
  connect(): Promise<void>;
  disconnect(): void;
  /** Create a room as `name`. Resolves with the 6-char room code. */
  createRoom(name: string): Promise<string>;
  /** Join an existing room. Resolves with current members + shared state. */
  joinRoom(code: string, name: string): Promise<{ members: Peer[]; shared: SharedState }>;
  leaveRoom(): void;
  /** Deep-merge a patch into the room's shared state and broadcast it. */
  patchShared(patch: SharedState): void;
  /** Send a one-off action message to the room (not persisted in shared state). */
  sendAction(type: string, payload: any): void;
  onPresence(cb: (members: Peer[]) => void): () => void;
  onShared(cb: (patch: SharedState) => void): () => void;
  onAction(cb: (type: string, payload: any, fromId: string) => void): () => void;
  onConnectionChange(cb: (connected: boolean) => void): () => void;
}

/** Socket event names shared by client (socketio.ts) and server/socket-server.ts */
export const EVENTS = {
  CREATE: 'room:create',
  JOIN: 'room:join',
  LEAVE: 'room:leave',
  PRESENCE: 'room:presence',
  PATCH: 'room:patch',
  STATE: 'room:state',
  ACTION: 'room:action',
} as const;
