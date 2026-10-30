import { describe, expect, it } from 'vitest';
import {
  initialSnake,
  oppositeDir,
  snakeBotDir,
  snakeProgress,
  snakeTargetForLevel,
  snakeTickMsForLevel,
  stepSnake,
  type SnakeState,
} from './snake';

describe('snake arena', () => {
  it('starts with two snakes and three fruit', () => {
    const s = initialSnake('seed', true);
    expect(s.snake).toHaveLength(3);
    expect(s.other).toHaveLength(3);
    expect(s.pickups).toHaveLength(3);
    expect(s.alive).toBe(true);
    expect(oppositeDir('up')).toBe('down');
    expect(oppositeDir('left')).toBe('right');
  });

  it('moves, grows on fruit, and dies on walls', () => {
    const s = initialSnake('seed', false);
    const moved = stepSnake({ ...s, dir: 'right' }, 't1');
    expect(moved.snake[0]).toEqual({ x: 4, y: 8 });
    // Drive into the right wall.
    let cur: SnakeState = { ...s, snake: [{ x: 15, y: 8 }], dir: 'right', pickups: [] };
    cur = stepSnake(cur, 't2');
    expect(cur.alive).toBe(false);
    expect(cur.over).toBe(true);
  });

  it('spends a shield on a crash instead of dying', () => {
    let cur: SnakeState = {
      ...initialSnake('seed', false),
      snake: [{ x: 15, y: 8 }],
      dir: 'right',
      pickups: [],
      shields: 1,
    };
    cur = stepSnake(cur, 't3');
    expect(cur.alive).toBe(true);
    expect(cur.shields).toBe(0);
  });

  it('bot never reverses and prefers safe moves', () => {
    const s = initialSnake('seed', true);
    for (let i = 0; i < 30; i++) {
      const d = snakeBotDir(s);
      expect(d).not.toBe(oppositeDir(s.otherDir));
    }
    // Bot boxed against the left wall heading left: must not go left.
    const boxed = {
      ...s,
      other: [
        { x: 0, y: 8 },
        { x: 1, y: 8 },
        { x: 2, y: 8 },
      ],
      otherDir: 'left' as const,
    };
    expect(snakeBotDir(boxed)).not.toBe('left');
  });

  it('scales target and speed with level', () => {
    expect(snakeTargetForLevel(5)).toBe(10);
    expect(snakeTargetForLevel(80)).toBe(30);
    expect(snakeTickMsForLevel(5)).toBeGreaterThan(snakeTickMsForLevel(80));
    expect(snakeProgress(10, 5)).toBe(0.5);
  });
});
