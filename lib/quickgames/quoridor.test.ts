import { describe, expect, it } from 'vitest';
import {
  applyQuoridorMove,
  initialQuoridor,
  isFenceLegal,
  legalMoves,
  pawnSteps,
  quoridorBotMove,
  quoridorDistance,
  quoridorWinner,
  type QuoridorState,
} from './quoridor';

describe('quoridor', () => {
  it('starts with 3 pawn steps and 128 fences', () => {
    const moves = legalMoves(initialQuoridor(1));
    const steps = moves.filter((m) => m.kind === 'step');
    const fences = moves.filter((m) => m.kind === 'fence');
    expect(steps).toHaveLength(3);
    expect(fences).toHaveLength(128);
  });

  it('rejects overlapping and crossing fences', () => {
    const s = initialQuoridor(1);
    expect(isFenceLegal(s, { x: 3, y: 3, dir: 'h' })).toBe(true);
    const placed: QuoridorState = {
      ...s,
      fences: [{ x: 3, y: 3, dir: 'h' }],
    };
    expect(isFenceLegal(placed, { x: 3, y: 3, dir: 'h' })).toBe(false);
    expect(isFenceLegal(placed, { x: 4, y: 3, dir: 'h' })).toBe(false);
    expect(isFenceLegal(placed, { x: 3, y: 3, dir: 'v' })).toBe(false);
    // Touching at the end only is fine.
    expect(isFenceLegal(placed, { x: 5, y: 3, dir: 'h' })).toBe(true);
    expect(isFenceLegal(placed, { x: 3, y: 4, dir: 'v' })).toBe(true);
  });

  it('never lets a fence seal a route', () => {
    // Pawn 0 boxed into (4,8): up blocked by h(3,7), left by v(3,8),
    // right by v(4,8). With only two walls up, the third seals it.
    const base: QuoridorState = {
      pawns: [
        { x: 4, y: 8 },
        { x: 4, y: 0 },
      ],
      fences: [
        { x: 3, y: 7, dir: 'h' },
        { x: 3, y: 8, dir: 'v' },
      ],
      fencesLeft: [10, 10],
      turn: 0,
    };
    expect(quoridorDistance(base.fences, { x: 4, y: 8 }, 0)).toBeLessThan(Infinity);
    expect(isFenceLegal(base, { x: 4, y: 8, dir: 'v' })).toBe(false);
    const sealed: QuoridorState = {
      ...base,
      fences: [...base.fences, { x: 4, y: 8, dir: 'v' }],
    };
    expect(quoridorDistance(sealed.fences, { x: 4, y: 8 }, 0)).toBe(Infinity);
    expect(pawnSteps(sealed, 0)).toHaveLength(0);
  });

  it('jumps straight over, and diagonally when blocked behind', () => {
    const base: QuoridorState = {
      pawns: [
        { x: 4, y: 4 },
        { x: 4, y: 3 },
      ],
      fences: [],
      fencesLeft: [10, 10],
      turn: 0,
    };
    const steps = pawnSteps(base, 0).map((s) => `${s.x},${s.y}`);
    expect(steps).toContain('4,2'); // straight jump
    // Block the landing square with a fence behind the foe.
    const blocked: QuoridorState = {
      ...base,
      fences: [{ x: 4, y: 2, dir: 'h' }],
    };
    const diag = pawnSteps(blocked, 0).map((s) => `${s.x},${s.y}`);
    expect(diag).not.toContain('4,2');
    expect(diag).toContain('3,3');
    expect(diag).toContain('5,3');
  });

  it('detects a win and applies moves with turn passing', () => {
    const s = initialQuoridor(1);
    const moved = applyQuoridorMove(s, { kind: 'step', to: { x: 4, y: 7 } });
    expect(moved.turn).toBe(1);
    expect(moved.pawns[0]).toEqual({ x: 4, y: 7 });
    const won: QuoridorState = { ...s, pawns: [{ x: 4, y: 0 }, { x: 4, y: 1 }] };
    expect(quoridorWinner(won)).toBe(0);
    expect(quoridorWinner(s)).toBe(null);
  });

  it('bot always returns a legal move', () => {
    const s = initialQuoridor(30);
    for (let i = 0; i < 20; i++) {
      const move = quoridorBotMove(s, 30, `seed-${i}`);
      const legal = legalMoves(s);
      const same = legal.some((m) => JSON.stringify(m) === JSON.stringify(move));
      expect(same).toBe(true);
    }
  });
});
