import { describe, expect, it } from 'vitest';
import { allPlaced, homeFx, homeFy, homeOf, nearHome, pieceFrac, scatterPieces } from './logic';

describe('jigsaw', () => {
  it('scatters n×n unique pieces inside the tray area', () => {
    const pieces = scatterPieces(3, () => 0.5);
    expect(pieces).toHaveLength(9);
    const ids = new Set(pieces.map((p) => p.id));
    expect(ids.size).toBe(9);
    const size = pieceFrac(3);
    for (const p of pieces) {
      expect(p.placed).toBe(false);
      expect(p.fx).toBeGreaterThanOrEqual(0);
      expect(p.fx).toBeLessThanOrEqual(1 - size);
      expect(p.fy).toBeGreaterThanOrEqual(1); // in the tray, below the board
    }
  });

  it('homeOf maps ids to row/col', () => {
    expect(homeOf(0, 3)).toEqual({ row: 0, col: 0 });
    expect(homeOf(4, 3)).toEqual({ row: 1, col: 1 });
    expect(homeOf(8, 3)).toEqual({ row: 2, col: 2 });
    expect(homeOf(13, 4)).toEqual({ row: 3, col: 1 });
  });

  it('home fractions sit on the board grid', () => {
    expect(homeFx(2, 4)).toBeCloseTo(0.5);
    expect(homeFy(3, 4)).toBeCloseTo(0.75);
  });

  it('nearHome snaps only close pieces', () => {
    const [p] = scatterPieces(3, () => 0.5);
    const home = { ...p, fx: homeFx(p.col, 3), fy: homeFy(p.row, 3) };
    expect(nearHome(home, 3)).toBe(true);
    const far = { ...p, fx: homeFx(p.col, 3) + 0.5, fy: homeFy(p.row, 3) };
    expect(nearHome(far, 3)).toBe(false);
  });

  it('allPlaced is true only when every piece is placed', () => {
    const pieces = scatterPieces(3, () => 0.5);
    expect(allPlaced(pieces)).toBe(false);
    expect(allPlaced(pieces.map((p) => ({ ...p, placed: true })))).toBe(true);
    expect(allPlaced([])).toBe(false);
  });
});
