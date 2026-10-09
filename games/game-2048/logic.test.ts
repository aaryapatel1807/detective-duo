import { describe, expect, it } from 'vitest';
import { emptyGrid, isGameOver, maxTile, move, spawnTile } from './logic';

function fixedRng(values: number[]) {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('2048 slide/merge', () => {
  it('merges left: [2,2,0,0] -> [4,0,0,0] with +4 score', () => {
    const g = emptyGrid();
    g[0] = 2;
    g[1] = 2;
    const r = move(g, 'left');
    expect(r.grid.slice(0, 4)).toEqual([4, 0, 0, 0]);
    expect(r.gained).toBe(4);
    expect(r.moved).toBe(true);
  });

  it('does not double-merge: [2,2,2,0] -> [4,2,0,0]', () => {
    const g = emptyGrid();
    g[0] = 2;
    g[1] = 2;
    g[2] = 2;
    const r = move(g, 'left');
    expect(r.grid.slice(0, 4)).toEqual([4, 2, 0, 0]);
    expect(r.gained).toBe(4);
  });

  it('slides right and up correctly', () => {
    const g = emptyGrid();
    g[0] = 2;
    g[1] = 2;
    const right = move(g, 'right');
    expect(right.grid.slice(0, 4)).toEqual([0, 0, 0, 4]);
    expect(right.gained).toBe(4);

    const g2 = emptyGrid();
    g2[0] = 4;
    g2[4] = 4;
    const up = move(g2, 'up');
    expect(up.grid[0]).toBe(8);
    expect(up.gained).toBe(8);
  });

  it('reports moved=false when nothing can slide', () => {
    const g = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2];
    const r = move(g, 'left');
    expect(r.moved).toBe(false);
    expect(r.gained).toBe(0);
  });

  it('detects game over only when no move exists', () => {
    const stuck = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2];
    expect(isGameOver(stuck)).toBe(true);
    const g = emptyGrid();
    g[0] = 2;
    expect(isGameOver(g)).toBe(false);
    const mergeable = [2, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2, 4, 8, 16, 32];
    expect(isGameOver(mergeable)).toBe(false);
  });

  it('spawnTile adds exactly one tile to a random empty cell', () => {
    const g = emptyGrid();
    g[0] = 2;
    const r = spawnTile(g, fixedRng([0.5, 0.95])); // pick middle empty, value 4
    expect(r.index).not.toBe(-1);
    expect(r.grid[r.index]).toBe(4);
    expect(r.grid.filter((v) => v !== 0)).toHaveLength(2);
  });

  it('maxTile finds the biggest tile', () => {
    const g = emptyGrid();
    g[5] = 1024;
    g[9] = 512;
    expect(maxTile(g)).toBe(1024);
  });
});
