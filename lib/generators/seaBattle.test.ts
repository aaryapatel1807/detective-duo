import { describe, expect, it } from 'vitest';
import { rngFromSeed } from './rng';
import {
  BOARD_SIZE,
  botNextShot,
  cellLabel,
  createSeaBattle,
  FLEET,
  fireShot,
  generateFleet,
  isFleetSunk,
  seaBattleWinner,
  shipAt,
  sunkShips,
  unsunkHits,
  type SeaBattleState,
} from './seaBattle';

/** Player 1 wastes a turn on open water, handing the turn back to player 0. */
function passTurn(state: SeaBattleState): SeaBattleState {
  const water = Array.from({ length: 100 }, (_, i) => i).find(
    (c) => !state.shots[1]![c] && !shipAt(state.fleets[0]!, c),
  )!;
  const out = fireShot(state, 1, water);
  expect(out.result).toBe('miss');
  return out.state;
}

function openWater(fleetShips: { cells: number[] }[], exclude: Set<number>): number {
  return Array.from({ length: 100 }, (_, i) => i).find(
    (c) => !exclude.has(c) && !fleetShips.some((s) => s.cells.includes(c)),
  )!;
}

describe('seaBattle', () => {
  it('places the same fleets for the same seed, and different fleets per player', () => {
    expect(generateFleet('s', 0)).toEqual(generateFleet('s', 0));
    expect(generateFleet('s', 1)).toEqual(generateFleet('s', 1));
    expect(generateFleet('s', 0)).not.toEqual(generateFleet('s', 1));
    expect(generateFleet('other', 0)).not.toEqual(generateFleet('s', 0));
    expect(cellLabel(0)).toBe('A1');
    expect(cellLabel(29)).toBe('J3');
  });

  it('places every ship in bounds, non-overlapping, with the classic composition', () => {
    for (const seed of ['s', 'second', 'third-seed']) {
      for (const player of [0, 1] as const) {
        const fleet = generateFleet(seed, player);
        expect(fleet.ships.map((s) => `${s.name}:${s.length}`).sort()).toEqual(
          [...FLEET].map((d) => `${d.name}:${d.length}`).sort(),
        );
        const seen = new Set<number>();
        for (const ship of fleet.ships) {
          expect(ship.cells).toHaveLength(ship.length);
          // Cells form one straight line of the right length.
          const rows = ship.cells.map((c) => Math.floor(c / BOARD_SIZE));
          const cols = ship.cells.map((c) => c % BOARD_SIZE);
          const straight =
            rows.every((r) => r === rows[0]) || cols.every((c) => c === cols[0]);
          expect(straight).toBe(true);
          for (const cell of ship.cells) {
            expect(cell).toBeGreaterThanOrEqual(0);
            expect(cell).toBeLessThan(BOARD_SIZE * BOARD_SIZE);
            expect(seen.has(cell)).toBe(false);
            seen.add(cell);
          }
        }
        // 5 + 4 + 3 + 3 + 2 = 17 occupied cells.
        expect(seen.size).toBe(17);
      }
    }
  });

  it('reports miss, hit, and sunk on the last cell, and rejects repeats and bad cells', () => {
    let game = createSeaBattle('s');
    const target = game.fleets[1]!;
    const water = openWater(target.ships, new Set());
    const miss = fireShot(game, 0, water);
    expect(miss.result).toBe('miss');
    expect(miss.state.turn).toBe(1);
    expect(miss.state.shots[0]![water]).toBe(true);
    game = passTurn(miss.state);

    const ship = target.ships[0]!;
    for (const cell of ship.cells.slice(0, -1)) {
      const out = fireShot(game, 0, cell);
      expect(out.result).toBe('hit');
      game = passTurn(out.state);
    }
    const last = ship.cells[ship.cells.length - 1]!;
    const sunk = fireShot(game, 0, last);
    expect(sunk.result).toBe('sunk');
    expect(sunk.sunkShip).toBe(ship.name);
    expect(sunkShips(target, sunk.state.shots[0]!)).toContain(ship.name);
    // Repeating a shot is rejected with the state untouched: player 1
    // re-fires a cell player 1 already shot during a passTurn.
    const alreadyShotByP1 = sunk.state.shots[1]!.findIndex((s) => s);
    const rejected = fireShot(sunk.state, 1, alreadyShotByP1);
    expect(rejected.result).toBe('repeat');
    expect(rejected.state).toBe(sunk.state);
    // Out-of-board and wrong-turn shots are invalid, state untouched.
    expect(fireShot(sunk.state, 1, 100).result).toBe('invalid');
    expect(fireShot(sunk.state, 0, water).result).toBe('invalid');
  });

  it('declares the winner when the whole opposing fleet is sunk', () => {
    let game = createSeaBattle('s');
    expect(seaBattleWinner(game)).toBe(null);
    const targetCells = game.fleets[1]!.ships.flatMap((s) => s.cells);
    for (const cell of targetCells) {
      const out = fireShot(game, 0, cell);
      expect(['hit', 'sunk']).toContain(out.result);
      game = out.state;
      if (game.finished) break;
      game = passTurn(game);
    }
    expect(game.finished).toBe(true);
    expect(isFleetSunk(game.fleets[1]!, game.shots[0]!)).toBe(true);
    expect(seaBattleWinner(game)).toBe(0);
  });

  it('the bot hunts adjacent cells after a hit and never repeats a shot', () => {
    const game = createSeaBattle('s');
    const opponent = game.fleets[1]!;
    const firstHit = opponent.ships[0]!.cells[0]!;
    const shots = Array<boolean>(100).fill(false);
    shots[firstHit] = true;
    expect(unsunkHits(opponent, shots)).toContain(firstHit);
    const pick = botNextShot(opponent, shots, rngFromSeed('bot'));
    expect(shots[pick]).toBe(false);
    const dr = Math.abs(Math.floor(pick / 10) - Math.floor(firstHit / 10));
    const dc = Math.abs((pick % 10) - (firstHit % 10));
    expect(dr + dc).toBe(1);

    // Full-board sweep: the bot never repeats and ends at -1.
    const sweep = Array<boolean>(100).fill(false);
    for (let n = 0; n < 100; n++) {
      const next = botNextShot(opponent, sweep, rngFromSeed(`bot-${n}`));
      expect(next).toBeGreaterThanOrEqual(0);
      expect(sweep[next]).toBe(false);
      sweep[next] = true;
    }
    expect(botNextShot(opponent, sweep, rngFromSeed('bot-done'))).toBe(-1);
  });
});
