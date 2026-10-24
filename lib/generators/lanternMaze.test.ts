import { describe, expect, it } from 'vitest';
import {
  describeView,
  generateMaze,
  isSolvable,
  paramsForLevel,
  tryStep,
  vagueDirection,
  visibleCells,
} from './lanternMaze';
import { rngFromSeed } from './rng';

describe('lanternMaze params', () => {
  it('grows size, doors and traps with level', () => {
    expect(paramsForLevel(1)).toEqual({ w: 6, h: 6, doors: 0, traps: 0 });
    expect(paramsForLevel(20)).toEqual({ w: 8, h: 8, doors: 1, traps: 1 });
    expect(paramsForLevel(40)).toEqual({ w: 10, h: 10, doors: 2, traps: 2 });
    expect(paramsForLevel(70).doors).toBe(3);
    expect(paramsForLevel(120).w).toBe(14);
  });
});

describe('lanternMaze generation', () => {
  it('every generated maze is solvable, across tiers and seeds', () => {
    for (const level of [1, 5, 15, 35, 70]) {
      for (const seed of [`m${level}a`, `m${level}b`, `m${level}c`]) {
        const m = generateMaze(seed, level);
        expect(isSolvable(m)).toBe(true);
      }
    }
  });

  it('is deterministic and differs across levels', () => {
    const a = generateMaze('det', 5);
    const b = generateMaze('det', 5);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(generateMaze('det', 5))).not.toBe(
      JSON.stringify(generateMaze('det', 6)),
    );
  });

  it('doors always have a reachable key, traps avoid start, exit and keys', () => {
    for (const level of [20, 40, 70]) {
      const m = generateMaze(`dk${level}`, level);
      expect(m.doors.length).toBeLessThanOrEqual(paramsForLevel(level).doors);
      const keyCells = Object.keys(m.keyCells);
      expect(new Set(Object.values(m.keyCells)).size).toBe(keyCells.length);
      for (const t of m.traps) {
        expect(t).not.toBe('0,0');
        expect(t).not.toBe(`${m.w - 1},${m.h - 1}`);
        expect(keyCells).not.toContain(t);
      }
    }
  });
});

describe('lanternMaze play', () => {
  it('the walker sees only their tile and open neighbours', () => {
    const m = generateMaze('vis', 1);
    const vis = visibleCells(m, [0, 0], []);
    expect(vis).toContainEqual([0, 0]);
    for (const [x, y] of vis) {
      expect(Math.abs(x) + Math.abs(y)).toBeLessThanOrEqual(1);
    }
  });

  it('walls block, locked doors block without the key, traps send you home', () => {
    const m = generateMaze('steps', 20);
    // Find a wall step from the start, if any.
    let wallBlocked = false;
    let openStep = false;
    for (const d of ['up', 'down', 'left', 'right'] as const) {
      const res = tryStep(m, [0, 0], d, []);
      if (res.info.blocked === 'wall' || res.info.blocked === 'edge') wallBlocked = true;
      if (res.info.ok) openStep = true;
    }
    expect(wallBlocked).toBe(true);
    expect(openStep).toBe(true);
    // A locked door blocks without its key.
    if (m.doors.length) {
      const doorKey = m.doors[0];
      const [kind, rest] = doorKey.split(':');
      const [a, b] = rest.split(',').map(Number);
      // Reconstruct the two cells either side of the door wall.
      let from: [number, number];
      let dir: 'up' | 'down' | 'left' | 'right';
      if (kind === 'v') {
        from = [b - 1, a];
        dir = 'right';
      } else {
        from = [b, a - 1];
        dir = 'down';
      }
      const locked = tryStep(m, from, dir, []);
      expect(locked.info.blocked).toBe('locked-door');
      const di = m.doors.indexOf(doorKey);
      const unlocked = tryStep(m, from, dir, [di]);
      expect(unlocked.info.ok).toBe(true);
    }
    // A trap returns the walker to the start.
    if (m.traps.length) {
      const [tx, ty] = m.traps[0].split(',').map(Number);
      // Step onto the trap from a neighbour through an open passage.
      for (const [dx, dy, d] of [
        [0, -1, 'down'],
        [0, 1, 'up'],
        [-1, 0, 'right'],
        [1, 0, 'left'],
      ] as const) {
        const nx = tx + dx;
        const ny = ty + dy;
        if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
        const res = tryStep(m, [nx, ny], d, [0, 1, 2, 3, 4]);
        if (res.info.hitTrap) {
          expect(res.pos).toEqual([0, 0]);
          break;
        }
      }
    }
  });

  it('the bot guide always names a walkable first step', () => {
    for (const level of [1, 20, 40]) {
      const m = generateMaze(`guide${level}`, level);
      const hint = vagueDirection(m, [0, 0], [], rngFromSeed(`h${level}`));
      expect(hint).not.toBeNull();
      const res = tryStep(m, [0, 0], hint!.dir, []);
      expect(res.info.ok).toBe(true);
      expect(typeof hint!.text).toBe('string');
      expect(hint!.text.length).toBeGreaterThan(0);
    }
  });

  it('describeView mentions something real about the tile', () => {
    const m = generateMaze('desc', 1);
    const text = describeView(m, [0, 0], []);
    expect(text.startsWith('From where I stand:')).toBe(true);
  });
});
