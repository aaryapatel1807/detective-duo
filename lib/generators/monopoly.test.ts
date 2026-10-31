import { describe, expect, it } from 'vitest';
import {
  BOARD,
  buyProperty,
  createGame,
  declineBuy,
  buildHouse,
  buildableSquares,
  ownsFullSet,
  rentFor,
  rollJailDice,
  rollTurn,
  simulateBotGame,
  START_MONEY,
} from './monopoly';

describe('monopoly board', () => {
  it('has 40 squares with Go, jail, parking, and go-to-jail in the classic spots', () => {
    expect(BOARD).toHaveLength(40);
    expect(BOARD.map((s) => s.index)).toEqual(Array.from({ length: 40 }, (_, i) => i));
    expect(BOARD[0].kind).toBe('go');
    expect(BOARD[10].kind).toBe('jail');
    expect(BOARD[20].kind).toBe('parking');
    expect(BOARD[30].kind).toBe('goto-jail');
    expect(BOARD.filter((s) => s.kind === 'property')).toHaveLength(22);
    expect(BOARD.filter((s) => s.kind === 'station')).toHaveLength(4);
    expect(BOARD.filter((s) => s.kind === 'utility')).toHaveLength(2);
  });

  it('names all 22 properties as real "City, Country", one country per colour group, no duplicate cities', () => {
    const properties = BOARD.filter((s) => s.kind === 'property');
    expect(properties).toHaveLength(22);
    const expectedCountryByGroup: Record<string, string> = {
      brown: 'Portugal',
      lightblue: 'Spain',
      pink: 'France',
      orange: 'Germany',
      red: 'Italy',
      yellow: 'Japan',
      green: 'United Kingdom',
      darkblue: 'United States',
    };
    const cities = new Set<string>();
    for (const square of properties) {
      const parts = square.name.split(', ');
      expect(parts).toHaveLength(2);
      const [city, country] = parts as [string, string];
      expect(city!.length).toBeGreaterThan(0);
      expect(country).toBe(expectedCountryByGroup[square.group!]);
      expect(cities.has(city!)).toBe(false);
      cities.add(city!);
    }
    expect(cities.size).toBe(22);
    // Each colour group maps to exactly one country.
    for (const [group, country] of Object.entries(expectedCountryByGroup)) {
      const groupCountries = new Set(
        properties.filter((s) => s.group === group).map((s) => s.name.split(', ')[1]),
      );
      expect([...groupCountries]).toEqual([country]);
    }
  });

  it('uses RichUp-style corners and airports: Start, Prison, Vacation, Go to Prison, and 4 real airports', () => {
    expect(BOARD[0].name).toBe('Start');
    expect(BOARD[10].name).toBe('Prison');
    expect(BOARD[20].name).toBe('Vacation');
    expect(BOARD[30].name).toBe('Go to Prison');
    const airports = BOARD.filter((s) => s.kind === 'station').map((s) => s.name);
    expect(airports).toEqual([
      'Heathrow Airport',
      'Charles de Gaulle Airport',
      'JFK Airport',
      'Haneda Airport',
    ]);
  });

  it('pays the Go salary when passing Go', () => {
    // Player at 39 rolls 2: 39 + 2 wraps to 1 (Lisbon, Portugal), collecting $200 first.
    let s = createGame('go-test');
    s.players[0].position = 39;
    s = rollTurn(s, [1, 1]);
    // Landing on Lisbon, Portugal (unowned) pauses for a buy decision.
    expect(s.phase).toBe('buy');
    expect(s.players[0].position).toBe(1);
    expect(s.players[0].money).toBe(START_MONEY + 200);
  });

  it('charges rent to the owner when landing on an owned property', () => {
    let s = createGame('rent-test');
    s.property[1].owner = 1;
    s.players[0].position = 39;
    // Roll 2 to land on Lisbon, Portugal (rent $2, owner is player 2).
    s = rollTurn(s, [1, 1]);
    expect(s.players[0].money).toBe(START_MONEY + 200 - 2);
    expect(s.players[1].money).toBe(START_MONEY + 2);
  });

  it('doubles rent on a full colour set with no houses', () => {
    let s = createGame('set-rent');
    s.property[1].owner = 1;
    s.property[3].owner = 1;
    expect(ownsFullSet(s, 1, 'brown')).toBe(true);
    // Lisbon, Portugal base rent 2 doubles to 4 on a full set.
    expect(rentFor(s, BOARD[1], 2)).toBe(4);
  });

  it('lets the owner buy and then build only on a full set', () => {
    let s = createGame('build-test');
    s.property[1].owner = 0;
    expect(buildableSquares(s, 0)).toEqual([]);
    s.property[3].owner = 0;
    expect(buildableSquares(s, 0)).toContain(1);
    const res = buildHouse(s, 1);
    expect(res.ok).toBe(true);
    expect(res.state.property[1].houses).toBe(1);
    expect(res.state.players[0].money).toBe(START_MONEY - 50);
  });

  it('sends a player to jail on three doubles', () => {
    let s = createGame('jail-test');
    s = rollTurn(s, [2, 2]);
    expect(s.players[0].inJail).toBe(false);
    // After doubles the same player rolls again.
    expect(s.turn).toBe(0);
    s = rollTurn(s, [3, 3]);
    expect(s.turn).toBe(0);
    s = rollTurn(s, [4, 4]);
    expect(s.players[0].inJail).toBe(true);
    expect(s.players[0].position).toBe(10);
    expect(s.turn).toBe(1);
  });

  it('lets a jailed player out on doubles', () => {
    let s = createGame('jail-out');
    s.players[0].inJail = true;
    s.players[0].position = 10;
    s.turn = 0;
    s.phase = 'jail';
    s = rollJailDice(s, [5, 5]);
    expect(s.players[0].inJail).toBe(false);
    expect(s.players[0].position).toBe(20);
  });

  it('ends the game on bankruptcy', () => {
    let s = createGame('bankrupt-test');
    s.property[39].owner = 1;
    s.property[39].houses = 5; // Los Angeles, United States hotel: $2000 rent.
    s.players[0].money = 100;
    s.players[0].position = 37;
    // Roll 2 to land on Los Angeles, United States; rent far exceeds cash.
    s = rollTurn(s, [1, 1]);
    expect(s.winner).toBe(1);
    expect(s.phase).toBe('over');
    expect(s.players[0].bankrupt).toBe(true);
  });

  it('buy then decline flow: buying owns the square, declining leaves it open', () => {
    let s = createGame('buy-test');
    s.players[0].position = 39;
    s = rollTurn(s, [1, 1]); // lands on Lisbon, Portugal, phase 'buy'
    expect(s.phase).toBe('buy');
    s = buyProperty(s);
    expect(s.property[1].owner).toBe(0);
    expect(s.players[0].money).toBe(START_MONEY + 200 - 60);

    let t = createGame('decline-test');
    t.players[0].position = 38;
    t = rollTurn(t, [1, 2]); // 38 + 3 wraps to Lisbon, Portugal, not doubles
    t = declineBuy(t);
    expect(t.property[1].owner).toBe(null);
    expect(t.turn).toBe(1);
  });

  it('a full seeded bot-vs-bot game terminates with a winner', () => {
    const { winner, turns } = simulateBotGame('bot-game-1');
    expect(winner === 0 || winner === 1).toBe(true);
    expect(turns).toBeGreaterThan(0);
    expect(turns).toBeLessThanOrEqual(1500);
  }, 30000);

  it('another seeded bot-vs-bot game also terminates', () => {
    const { winner, turns } = simulateBotGame('bot-game-2');
    expect(winner === 0 || winner === 1).toBe(true);
    expect(turns).toBeLessThanOrEqual(1500);
  }, 30000);
});
