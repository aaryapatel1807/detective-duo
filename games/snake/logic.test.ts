import { describe, expect, it } from 'vitest';
import { initSnake, queueDirection, spawnFood, step, type SnakeState, type Vec } from './logic';

const rng = () => 0.5;

function custom(partial: Partial<SnakeState>): SnakeState {
  return {
    cols: 10,
    rows: 10,
    snake: [{ x: 5, y: 5 }],
    dir: { x: 1, y: 0 },
    queue: [],
    food: { x: 8, y: 8 },
    score: 0,
    dead: false,
    ...partial,
  };
}

describe('snake', () => {
  it('moves the head one cell per step', () => {
    const s = step(custom({}), rng);
    expect(s.snake[0]).toEqual({ x: 6, y: 5 });
    expect(s.snake).toHaveLength(1);
    expect(s.dead).toBe(false);
  });

  it('eating food grows the snake and adds 10 points', () => {
    const s = custom({ snake: [{ x: 5, y: 5 }], food: { x: 6, y: 5 } });
    const next = step(s, rng);
    expect(next.score).toBe(10);
    expect(next.snake).toHaveLength(2);
    expect(next.snake[0]).toEqual({ x: 6, y: 5 });
    expect(next.food).not.toEqual({ x: 6, y: 5 });
  });

  it('dies on wall collision', () => {
    const s = custom({ snake: [{ x: 9, y: 5 }], dir: { x: 1, y: 0 } });
    expect(step(s, rng).dead).toBe(true);
  });

  it('dies on self collision', () => {
    const s = custom({
      snake: [
        { x: 5, y: 5 },
        { x: 5, y: 4 },
        { x: 6, y: 4 },
        { x: 6, y: 5 },
      ],
      dir: { x: 0, y: -1 }, // head moves into (5,4), a body segment
    });
    expect(step(s, rng).dead).toBe(true);
  });

  it('ignores 180° reversals but accepts turns', () => {
    const s = custom({});
    const rev = queueDirection(s, { x: -1, y: 0 });
    expect(rev.queue).toHaveLength(0);
    const turn = queueDirection(s, { x: 0, y: 1 });
    expect(turn.queue).toEqual([{ x: 0, y: 1 }]);
    const stepped = step(turn, rng);
    expect(stepped.snake[0]).toEqual({ x: 5, y: 6 });
  });

  it('spawnFood never lands on the snake', () => {
    const snake: Vec[] = [];
    for (let i = 0; i < 99; i++) snake.push({ x: i % 10, y: Math.floor(i / 10) });
    const food = spawnFood(snake, 10, 10, () => 0.999);
    expect(food).toEqual({ x: 9, y: 9 }); // the only free cell
  });

  it('initSnake starts centered with 3 segments', () => {
    const s = initSnake(20, 20, rng);
    expect(s.snake).toHaveLength(3);
    expect(s.snake[0]).toEqual({ x: 10, y: 10 });
    expect(s.dead).toBe(false);
  });
});
