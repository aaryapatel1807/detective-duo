import { describe, expect, it } from 'vitest';
import { inboxFor, markSeen, type LeftCase } from './leftCases';
import { initialPauseState, pauseTransition } from './pause';

const mk = (id: string, fromUid: string, seenAt: string | null, createdAt: string): LeftCase => ({
  id,
  fromUid,
  caseId: 'cf-easy-01',
  note: 'for you',
  createdAt,
  seenAt,
});

describe('leave-a-case inbox', () => {
  it("a case left by A appears in B's inbox and NOT in A's own", () => {
    const cases = [
      mk('1', 'user-a', null, '2026-10-24T10:00:00Z'),
      mk('2', 'user-b', null, '2026-10-24T11:00:00Z'),
    ];
    expect(inboxFor(cases, 'user-b').map((c) => c.id)).toEqual(['1']);
    expect(inboxFor(cases, 'user-a').map((c) => c.id)).toEqual(['2']);
  });

  it('unopened cases sort before seen ones, newest first within each group', () => {
    const cases = [
      mk('old-seen', 'user-a', '2026-10-24T09:00:00Z', '2026-10-23T10:00:00Z'),
      mk('new-unopened', 'user-a', null, '2026-10-24T12:00:00Z'),
      mk('old-unopened', 'user-a', null, '2026-10-24T08:00:00Z'),
    ];
    expect(inboxFor(cases, 'user-b').map((c) => c.id)).toEqual([
      'new-unopened',
      'old-unopened',
      'old-seen',
    ]);
  });

  it('marking seen works and only touches that case', () => {
    const cases = [mk('1', 'user-a', null, '2026-10-24T10:00:00Z'), mk('2', 'user-a', null, '2026-10-24T11:00:00Z')];
    const out = markSeen(cases, '1', '2026-10-24T12:00:00Z');
    expect(out.find((c) => c.id === '1')!.seenAt).toBe('2026-10-24T12:00:00Z');
    expect(out.find((c) => c.id === '2')!.seenAt).toBeNull();
    expect(cases[0].seenAt).toBeNull(); // no mutation
  });
});

describe('pause/resume state machine', () => {
  it('stays unpaused until both have been present', () => {
    let s = initialPauseState();
    s = pauseTransition(s, 1, 'playing');
    expect(s.paused).toBe(false);
    s = pauseTransition(s, 2, 'playing');
    expect(s.paused).toBe(false);
  });

  it('pauses when a player drops after both were present, resumes on return', () => {
    let s = initialPauseState();
    s = pauseTransition(s, 2, 'playing');
    s = pauseTransition(s, 1, 'playing');
    expect(s.paused).toBe(true);
    s = pauseTransition(s, 2, 'playing');
    expect(s.paused).toBe(false);
  });

  it('never pauses in the lobby, and state survives the transition', () => {
    const s = pauseTransition({ paused: false, everTwo: true }, 1, 'lobby');
    expect(s.paused).toBe(false);
    expect(s.everTwo).toBe(true);
  });
});
