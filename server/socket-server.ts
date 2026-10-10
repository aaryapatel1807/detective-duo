/**
 * Detective Duo socket.io server (standalone).
 * Run: npm run socket   (tsx server/socket-server.ts)
 *
 * In-memory rooms: 6-char codes, create/join/leave, deep-merged shared-state
 * patches + one-off action messages broadcast to the room, presence lists.
 * No auth, no persistence — private two-player hub.
 */

import { createServer } from 'http';
import { Server } from 'socket.io';
import type { Socket } from 'socket.io';

const PORT = Number(process.env.SOCKET_PORT || 4001);
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

interface Member {
  id: string;
  name: string;
  socketId: string;
}

interface Room {
  code: string;
  members: Map<string, Member>; // keyed by playerId
  shared: Record<string, any>;
}

const rooms = new Map<string, Room>();

function makeCode(): string {
  let code: string;
  do {
    code = Array.from({ length: 6 }, () =>
      CODE_ALPHABET.charAt(Math.floor(Math.random() * CODE_ALPHABET.length)),
    ).join('');
  } while (rooms.has(code));
  return code;
}

function isPlainObject(v: unknown): v is Record<string, any> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function deepMerge(base: any, patch: any): any {
  if (!isPlainObject(patch)) return patch;
  const out: Record<string, any> = isPlainObject(base) ? { ...base } : {};
  for (const [k, v] of Object.entries(patch)) {
    out[k] = isPlainObject(v) && isPlainObject(out[k]) ? deepMerge(out[k], v) : v;
  }
  return out;
}

function presenceList(room: Room) {
  return [...room.members.values()].map((m) => ({ id: m.id, name: m.name }));
}

function broadcastPresence(room: Room) {
  io.to(room.code).emit('room:presence', presenceList(room));
}

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

io.on('connection', (socket: Socket) => {
  socket.on(
    'room:create',
    (
      { playerId, name }: { playerId: string; name: string },
      ack: (res: { code?: string; error?: string }) => void,
    ) => {
      if (!playerId) return ack({ error: 'missing playerId' });
      const code = makeCode();
      const room: Room = { code, members: new Map(), shared: {} };
      room.members.set(playerId, {
        id: playerId,
        name: (name || 'Detective').slice(0, 24),
        socketId: socket.id,
      });
      rooms.set(code, room);
      socket.join(code);
      ack({ code });
      broadcastPresence(room);
    },
  );

  socket.on(
    'room:join',
    (
      { code, playerId, name }: { code: string; playerId: string; name: string },
      ack: (res: { ok?: boolean; error?: string; members?: any[]; shared?: any }) => void,
    ) => {
      const room = rooms.get((code || '').toUpperCase());
      if (!room) return ack({ error: 'room not found — check the code' });
      if (!playerId) return ack({ error: 'missing playerId' });
      room.members.set(playerId, {
        id: playerId,
        name: (name || 'Detective').slice(0, 24),
        socketId: socket.id,
      });
      socket.join(room.code);
      ack({ ok: true, members: presenceList(room), shared: room.shared });
      broadcastPresence(room);
    },
  );

  socket.on('room:leave', ({ code, playerId }: { code: string; playerId: string }) => {
    const room = rooms.get((code || '').toUpperCase());
    if (!room) return;
    room.members.delete(playerId);
    socket.leave(room.code);
    if (room.members.size === 0) rooms.delete(room.code);
    else broadcastPresence(room);
  });

  socket.on(
    'room:patch',
    ({ code, playerId, patch }: { code: string; playerId: string; patch: any }) => {
      const room = rooms.get((code || '').toUpperCase());
      if (!room || !room.members.has(playerId)) return;
      if (!isPlainObject(patch)) return;
      room.shared = deepMerge(room.shared, patch);
      socket.to(room.code).emit('room:state', patch);
    },
  );

  socket.on(
    'room:action',
    ({
      code,
      playerId,
      type,
      payload,
    }: {
      code: string;
      playerId: string;
      type: string;
      payload: any;
    }) => {
      const room = rooms.get((code || '').toUpperCase());
      if (!room || !room.members.has(playerId)) return;
      io.to(room.code).emit('room:action', { type, payload, from: playerId });
    },
  );

  socket.on('disconnect', () => {
    // Remove this socket's memberships; keep shared state for rejoin.
    for (const room of rooms.values()) {
      let changed = false;
      for (const [pid, m] of room.members) {
        if (m.socketId === socket.id) {
          room.members.delete(pid);
          changed = true;
        }
      }
      if (changed) {
        if (room.members.size === 0) rooms.delete(room.code);
        else broadcastPresence(room);
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`[detective-duo] socket server listening on :${PORT}`);
});
