import { describe, expect, it } from 'vitest';
import {
  applyPatch,
  deserializeSession,
  emptySession,
  serializeSession,
  sessionFromRow,
  sessionToRow,
  versusSeed,
  type RoomSession,
} from './types';

const host = { uid: 'u1', name: 'Host', role: 'host' as const };

function midGameSession(): RoomSession {
  const s = emptySession('ABCD', host);
  s.game = 'logic-grids';
  s.mode = 'coop';
  s.seed = 'coop|ABCD|logic-grids|3';
  s.level = 3;
  s.status = 'playing';
  s.players = [
    host,
    { uid: 'u2', name: 'Guest', role: 'guest' as const },
  ];
  s.state = {
    marks: { '1:0': 'yes', '1:1': 'no', '2:2': 'yes' },
    struckClues: [0, 2],
    notes: 'Mabel cannot be teal',
    chat: [{ from: 'u2', name: 'Guest', text: 'check row 2?', at: '2026-10-24T10:00:00Z' }],
  };
  return s;
}

describe('session serialization round-trip', () => {
  it('a mid-game co-op state survives save -> reload identically', () => {
    const before = midGameSession();
    const after = deserializeSession(serializeSession(before));
    expect(after).toEqual(before);
  });

  it('a mid-game versus state survives save -> reload identically', () => {
    const s = emptySession('WXYZ', host);
    s.game = 'nonograms';
    s.mode = 'versus';
    s.seed = versusSeed('WXYZ', 'nonograms', 5);
    s.status = 'playing';
    s.state = {
      answers: { u1: { '0,0': 'fill', '1,1': 'fill' }, u2: { '0,0': 'fill' } },
      progress: { u1: 0.4, u2: 0.2 },
      winnerUid: null,
      chat: [],
    };
    expect(deserializeSession(serializeSession(s))).toEqual(s);
  });

  it('rejects corrupt payloads instead of crashing', () => {
    expect(deserializeSession('not json')).toBeNull();
    expect(deserializeSession('{"nope":true}')).toBeNull();
    expect(deserializeSession('')).toBeNull();
  });

  it('row conversion is lossless across a DB write + read', () => {
    const before = midGameSession();
    const row = sessionToRow(before);
    const after = sessionFromRow({
      ...row,
      updated_at: before.updatedAt,
    });
    expect(after.code).toBe(before.code);
    expect(after.game).toBe(before.game);
    expect(after.mode).toBe(before.mode);
    expect(after.seed).toBe(before.seed);
    expect(after.level).toBe(before.level);
    expect(after.status).toBe(before.status);
    // Row state carries mode/level/status/winnerUid merged in by design.
    expect(after.state).toEqual({
      ...before.state,
      mode: before.mode,
      level: before.level,
      status: before.status,
      winnerUid: before.winnerUid,
    });
    expect(after.players).toEqual(before.players);
  });

  it('applyPatch merges top-level keys without touching the rest', () => {
    const state = { marks: { a: 'yes' }, notes: 'keep me', chat: [] as unknown[] };
    const out = applyPatch(state, { marks: { a: 'yes', b: 'no' } });
    expect(out).toEqual({ marks: { a: 'yes', b: 'no' }, notes: 'keep me', chat: [] });
    expect(state.marks).toEqual({ a: 'yes' }); // no mutation
  });

  it('versus seeds are stable per room+game+level and differ across rooms', () => {
    expect(versusSeed('ABCD', 'logic-grids', 3)).toBe(versusSeed('ABCD', 'logic-grids', 3));
    expect(versusSeed('ABCD', 'logic-grids', 3)).not.toBe(versusSeed('WXYZ', 'logic-grids', 3));
    expect(versusSeed('ABCD', 'logic-grids', 3)).not.toBe(versusSeed('ABCD', 'cipher-desk', 3));
  });
});
