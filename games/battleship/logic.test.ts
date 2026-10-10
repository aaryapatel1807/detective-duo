import { describe, expect, it } from 'vitest';
import {
  SHIP_SIZES,
  allSunk,
  canPlace,
  cellsForShip,
  hitAt,
  placeShip,
  shipSunk,
} from './logic';

describe('battleship logic', () => {
  it('lays out ship cells and rejects off-grid placements', () => {
    expect(cellsForShip(0, 4, true)).toEqual([0, 1, 2, 3]);
    expect(cellsForShip(0, 4, false)).toEqual([0, 8, 16, 24]);
    expect(cellsForShip(6, 4, true)).toBe(null); // runs past the east edge
    expect(cellsForShip(56, 3, false)).toBe(null); // runs past the south edge
    expect(cellsForShip(63, 1, true)).toEqual([63]);
  });

  it('rejects overlapping ships', () => {
    const ships = placeShip([], 0, 4, true)!;
    expect(canPlace(ships, 2, 3, true)).toBe(false); // overlaps
    expect(canPlace(ships, 8, 3, true)).toBe(true); // clear row below
    expect(canPlace(ships, 0, 2, false)).toBe(false); // shares cell 0
  });

  it('has four ships per fleet', () => {
    expect(SHIP_SIZES).toHaveLength(4);
  });

  it('detects hits and sunk ships', () => {
    const ships = [[0, 1], [10, 18]];
    expect(hitAt(ships, 1)).toBe(true);
    expect(hitAt(ships, 5)).toBe(false);
    expect(shipSunk([0, 1], { 0: 'hit', 1: 'hit' })).toBe(true);
    expect(shipSunk([0, 1], { 0: 'hit', 1: 'miss' })).toBe(false);
  });

  it('declares the fleet sunk only when all four ships are sunk', () => {
    const ships = [[0], [8], [16], [24]];
    const partial = { 0: 'hit', 8: 'hit', 16: 'hit' } as Record<number, 'hit' | 'miss'>;
    expect(allSunk(ships, partial)).toBe(false);
    expect(allSunk(ships, { ...partial, 24: 'hit' })).toBe(true);
    expect(allSunk(ships.slice(0, 3), { 0: 'hit', 8: 'hit', 16: 'hit' })).toBe(false);
  });
});
