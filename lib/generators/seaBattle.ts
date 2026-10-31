/**
 * Sea Battle — Battleship-style firing game, Duo Corner.
 *
 * Studied from the classic rules only (no copied art, board graphics,
 * or text from any Battleship product): two 10x10 grids, each side
 * hides a fleet, players alternate firing one shot at a time, a shot
 * is a hit or a miss, a ship is sunk when every one of its cells has
 * been hit, and the first side to sink the whole opposing fleet wins.
 *
 * There is deliberately no placement phase: each fleet is a seeded
 * placement (non-overlapping, fully in bounds), so a round starts
 * straight at firing. The firing grid only ever shows hit / miss /
 * sunk — never the opponent's ship positions — and the page never
 * renders either fleet's positions, so a pass-and-play opponent
 * cannot peek at them.
 *
 * Pure logic, no React: the page drives shots turn by turn and tests
 * can replay exact games.
 */
import { rngFromSeed } from './rng';

export const BOARD_SIZE = 10;
export const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;

export type SeaBattlePlayer = 0 | 1;

export interface ShipDef {
  name: string;
  length: number;
}

/** Classic fleet composition. */
export const FLEET: readonly ShipDef[] = [
  { name: 'Carrier', length: 5 },
  { name: 'Battleship', length: 4 },
  { name: 'Cruiser', length: 3 },
  { name: 'Submarine', length: 3 },
  { name: 'Destroyer', length: 2 },
];

export interface ShipPlacement {
  name: string;
  length: number;
  /** Cell indexes (row * 10 + col), in line, in order. */
  cells: number[];
  horizontal: boolean;
}

export interface Fleet {
  ships: ShipPlacement[];
}

export function cellIndex(row: number, col: number): number {
  return row * BOARD_SIZE + col;
}

export function rowOf(cell: number): number {
  return Math.floor(cell / BOARD_SIZE);
}

export function colOf(cell: number): number {
  return cell % BOARD_SIZE;
}

/** Human-readable square label, e.g. 0,0 -> "A1", 2,9 -> "C10". */
export function cellLabel(cell: number): string {
  return `${'ABCDEFGHIJ'[colOf(cell)]}${rowOf(cell) + 1}`;
}

function placeShip(
  def: ShipDef,
  occupied: Set<number>,
  rng: () => number,
): ShipPlacement {
  for (let attempt = 0; attempt < 1000; attempt++) {
    const horizontal = rng() < 0.5;
    const row = Math.floor(rng() * BOARD_SIZE);
    const col = Math.floor(rng() * BOARD_SIZE);
    // The ship must fit entirely on the board.
    if (horizontal && col + def.length > BOARD_SIZE) continue;
    if (!horizontal && row + def.length > BOARD_SIZE) continue;
    const cells: number[] = [];
    for (let i = 0; i < def.length; i++) {
      cells.push(cellIndex(horizontal ? row : row + i, horizontal ? col + i : col));
    }
    if (cells.some((c) => occupied.has(c))) continue;
    for (const c of cells) occupied.add(c);
    return { name: def.name, length: def.length, cells, horizontal };
  }
  throw new Error(`could not place ${def.name} after 1000 attempts`);
}

/**
 * Seeded fleet for one player. Same seed + player = same fleet;
 * player 0 and player 1 get different fleets from the same seed.
 */
export function generateFleet(seed: string, player: SeaBattlePlayer): Fleet {
  const rng = rngFromSeed(`sea-battle|${seed}|player-${player}`);
  const occupied = new Set<number>();
  const ships = FLEET.map((def) => placeShip(def, occupied, rng));
  return { ships };
}

/** Ship occupying a cell, or undefined for open water. */
export function shipAt(fleet: Fleet, cell: number): ShipPlacement | undefined {
  return fleet.ships.find((s) => s.cells.includes(cell));
}

/** Names of the ships in `fleet` whose every cell is in `shots`. */
export function sunkShips(fleet: Fleet, shots: readonly boolean[]): string[] {
  return fleet.ships
    .filter((s) => s.cells.every((c) => shots[c]))
    .map((s) => s.name);
}

export function isFleetSunk(fleet: Fleet, shots: readonly boolean[]): boolean {
  return fleet.ships.every((s) => s.cells.every((c) => shots[c]));
}

export type ShotResult = 'miss' | 'hit' | 'sunk' | 'repeat' | 'invalid';

export interface FireOutcome {
  result: ShotResult;
  /** Set when result is 'sunk': the ship that just went down. */
  sunkShip?: string;
  state: SeaBattleState;
}

export interface SeaBattleState {
  /** fleets[0] belongs to player 0, fleets[1] to player 1. */
  fleets: [Fleet, Fleet];
  /**
   * shots[p] marks the cells player p has fired at on the opponent's
   * grid. Hit/miss/sunk are derived from the opponent's fleet, so no
   * ship position ever leaks into a shot record.
   */
  shots: [boolean[], boolean[]];
  turn: SeaBattlePlayer;
  finished: boolean;
}

export function createSeaBattle(seed: string): SeaBattleState {
  const empty = (): boolean[] => Array<boolean>(CELL_COUNT).fill(false);
  return {
    fleets: [generateFleet(seed, 0), generateFleet(seed, 1)],
    shots: [empty(), empty()],
    turn: 0,
    finished: false,
  };
}

export function otherPlayer(player: SeaBattlePlayer): SeaBattlePlayer {
  return player === 0 ? 1 : 0;
}

/**
 * Fire one shot. Turns strictly alternate: the turn passes after
 * every shot, hit or miss. Repeats and out-of-board shots are
 * rejected with the state untouched; shots after the game ends are
 * rejected too.
 */
export function fireShot(
  state: SeaBattleState,
  player: SeaBattlePlayer,
  cell: number,
): FireOutcome {
  if (state.finished || player !== state.turn) {
    return { result: 'invalid', state };
  }
  if (cell < 0 || cell >= CELL_COUNT) return { result: 'invalid', state };
  if (state.shots[player]![cell]) return { result: 'repeat', state };

  const shots: [boolean[], boolean[]] = [
    [...state.shots[0]!],
    [...state.shots[1]!],
  ];
  shots[player]![cell] = true;
  const targetFleet = state.fleets[otherPlayer(player)]!;
  const ship = shipAt(targetFleet, cell);
  const next: SeaBattleState = {
    ...state,
    shots,
    turn: otherPlayer(player),
    finished: false,
  };
  if (!ship) return { result: 'miss', state: next };
  const sunk = ship.cells.every((c) => shots[player]![c]);
  if (sunk) {
    next.finished = isFleetSunk(targetFleet, shots[player]!);
    return { result: 'sunk', sunkShip: ship.name, state: next };
  }
  return { result: 'hit', state: next };
}

/** Winner once finished: the player who sank the opposing fleet. */
export function seaBattleWinner(state: SeaBattleState): SeaBattlePlayer | null {
  if (!state.finished) return null;
  // The player who fired the final shot is the one whose turn just passed.
  const lastShooter = otherPlayer(state.turn);
  return isFleetSunk(state.fleets[otherPlayer(lastShooter)]!, state.shots[lastShooter]!)
    ? lastShooter
    : null;
}

/** Cells of the opponent's fleet that `shooter` has hit but not yet sunk. */
export function unsunkHits(
  opponentFleet: Fleet,
  shots: readonly boolean[],
): number[] {
  const sunk = new Set(sunkShips(opponentFleet, shots));
  const hits: number[] = [];
  for (const ship of opponentFleet.ships) {
    if (sunk.has(ship.name)) continue;
    for (const c of ship.cells) if (shots[c]) hits.push(c);
  }
  return hits;
}

function adjacentCells(cell: number): number[] {
  const row = rowOf(cell);
  const col = colOf(cell);
  const out: number[] = [];
  if (row > 0) out.push(cellIndex(row - 1, col));
  if (row < BOARD_SIZE - 1) out.push(cellIndex(row + 1, col));
  if (col > 0) out.push(cellIndex(row, col - 1));
  if (col < BOARD_SIZE - 1) out.push(cellIndex(row, col + 1));
  return out;
}

/**
 * Cosy Bot's next shot against `opponentFleet`, given the cells it
 * has already fired at (`shots`). After a hit it hunts the unshot
 * cells adjacent to a hit-but-unsunk ship; otherwise it fires at a
 * random unshot cell. Never repeats a shot; -1 when the board is
 * exhausted.
 */
export function botNextShot(
  opponentFleet: Fleet,
  shots: readonly boolean[],
  rng: () => number,
): number {
  const unshot = (cell: number) => !shots[cell];
  const targets = new Set<number>();
  for (const hit of unsunkHits(opponentFleet, shots)) {
    for (const neighbour of adjacentCells(hit)) {
      if (unshot(neighbour)) targets.add(neighbour);
    }
  }
  if (targets.size > 0) {
    const pool = [...targets];
    return pool[Math.floor(rng() * pool.length)]!;
  }
  const open: number[] = [];
  for (let cell = 0; cell < CELL_COUNT; cell++) if (unshot(cell)) open.push(cell);
  if (open.length === 0) return -1;
  return open[Math.floor(rng() * open.length)]!;
}
