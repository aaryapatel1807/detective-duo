import { describe, expect, it } from 'vitest';
import {
  dailyAllDone,
  emptyDaily,
  emptyInbox,
  gameLoadFailed,
  noLastRoom,
  roomNotFound,
  tierCycleNote,
  unknownCase,
  wrongRoomCode,
  type EmptyStateData,
} from './emptyStates';

const states: EmptyStateData[] = [
  roomNotFound('ABCD'),
  wrongRoomCode('WXYZ'),
  emptyInbox(),
  noLastRoom(),
  gameLoadFailed('Logic Grids'),
  unknownCase('nope'),
  emptyDaily(),
  dailyAllDone(),
];

describe('empty and error states', () => {
  it('every state has a plain sentence and a next action, never a dead end', () => {
    for (const s of states) {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.body.length).toBeGreaterThan(20);
      expect(s.body).not.toMatch(/lorem|placeholder|Phase \d/i);
      expect(s.actionLabel.length).toBeGreaterThan(0);
      expect(s.actionHref.startsWith('/')).toBe(true);
    }
  });

  it('unknown room code names the code and offers a way forward', () => {
    const s = roomNotFound('ABCD');
    expect(s.title).toContain('ABCD');
    const w = wrongRoomCode('WXYZ');
    expect(w.title).toContain('WXYZ');
    expect(w.body).toMatch(/check the letters/i);
  });

  it('empty inbox and no last room point at a real next step', () => {
    expect(emptyInbox().actionHref).toBe('/together/leave');
    expect(noLastRoom().actionHref).toBe('/together');
  });

  it('failed game load says progress is safe and offers a retry path', () => {
    const s = gameLoadFailed('Cipher Desk');
    expect(s.body).toMatch(/progress is safe/i);
  });

  it('tier cycle note only appears once a tier wraps past its bank', () => {
    expect(tierCycleNote(3, 1, 10)).toBeNull();
    expect(tierCycleNote(10, 1, 10)).toBeNull();
    expect(tierCycleNote(11, 1, 10)).toMatch(/cycles back to the start/i);
    expect(tierCycleNote(100, 56, 0)).toBeNull();
  });
});
