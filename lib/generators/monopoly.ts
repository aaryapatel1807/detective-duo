/**
 * Monopoly-style board game logic (original presentation, classic mechanics).
 *
 * This file is pure logic: no React, no DOM, no randomness except through
 * a caller-supplied dice pair or RNG, so a page can drive it turn by turn
 * and tests can replay exact games.
 *
 * Classic mechanics implemented: 40 squares, dice movement, passing Go
 * (+$200), buying, rent, houses/hotels, Chance / Community Chest style
 * cards (own short wording, shuffled decks), jail (3 doubles, pay, card,
 * or roll doubles), Vacation (no effect, as in the official rules),
 * taxes, stations, utilities, and bankruptcy / winner detection.
 *
 * Deliberate simplifications (see the page for the player-facing list):
 * no auctions (declining a property leaves it unowned), no trading, no
 * mortgages, no selling houses back, and a bankrupt player pays nothing
 * partial — they are out and their properties return to the bank.
 */
import { rngFromSeed, shuffle } from './rng';

export type PlayerIndex = 0 | 1;

export type SquareKind =
  | 'go'
  | 'property'
  | 'station'
  | 'utility'
  | 'tax'
  | 'chance'
  | 'chest'
  | 'jail'
  | 'parking'
  | 'goto-jail';

export interface Square {
  index: number;
  kind: SquareKind;
  name: string;
  /** Purchase price for property / station / utility squares. */
  price?: number;
  /** Colour set id for properties; 'station' / 'utility' for those kinds. */
  group?: string;
  /** Rent table: [base, 1 house, 2, 3, 4, hotel] for properties. */
  rent?: number[];
  /** Cost of one house (or the hotel upgrade) on this property. */
  houseCost?: number;
  /** Tax amount for tax squares. */
  tax?: number;
}

export interface PropertyState {
  owner: PlayerIndex | null;
  /** 0-4 houses, 5 = hotel. */
  houses: number;
}

export interface PlayerState {
  name: string;
  money: number;
  position: number;
  inJail: boolean;
  /** Consecutive failed jail rolls (0-2; a third forces a $50 fine). */
  jailTurns: number;
  getOutCards: number;
  bankrupt: boolean;
}

export type Phase = 'roll' | 'jail' | 'buy' | 'over';

export interface GameState {
  players: [PlayerState, PlayerState];
  property: PropertyState[];
  turn: PlayerIndex;
  phase: Phase;
  /** Index of the square the current player may buy, when phase === 'buy'. */
  pendingBuy: number | null;
  lastDice: [number, number] | null;
  /** True when the roll that led here was doubles (extra roll after buy). */
  rolledDoubles: boolean;
  doublesCount: number;
  chanceDeck: Card[];
  chanceDiscard: Card[];
  chestDeck: Card[];
  chestDiscard: Card[];
  winner: PlayerIndex | null;
  turnCount: number;
  log: string[];
}

export type CardEffect =
  | { kind: 'money'; amount: number }
  | { kind: 'money-from-each'; amount: number }
  | { kind: 'move-to'; square: number }
  | { kind: 'nearest-station' }
  | { kind: 'go-to-jail' }
  | { kind: 'get-out' }
  | { kind: 'repairs'; perHouse: number; perHotel: number };

export interface Card {
  id: string;
  deck: 'chance' | 'chest';
  text: string;
  effect: CardEffect;
}

export const GO_SALARY = 200;
export const JAIL_FINE = 50;
export const JAIL_SQUARE = 10;
export const START_MONEY = 1500;

const GROUP_COLOUR: Record<string, string> = {
  brown: '#8b5a2b',
  lightblue: '#7ec8e3',
  pink: '#e88bb1',
  orange: '#f59e0b',
  red: '#ef4444',
  yellow: '#eab308',
  green: '#22c55e',
  darkblue: '#1d4ed8',
};

export function groupColour(group?: string): string {
  return (group && GROUP_COLOUR[group]) || '#94a3b8';
}

function prop(
  index: number,
  name: string,
  price: number,
  group: string,
  rent: number[],
  houseCost: number,
): Square {
  return { index, kind: 'property', name, price, group, rent, houseCost };
}

function station(index: number, name: string): Square {
  return { index, kind: 'station', name, price: 200, group: 'station' };
}

function utility(index: number, name: string): Square {
  return { index, kind: 'utility', name, price: 150, group: 'utility' };
}

/** The 40-square board, RichUp-style: property names are real cities, one country per colour group, stations are real airports, corners are Start / Prison / Vacation / Go to Prison — not official streets. */
export const BOARD: Square[] = [
  { index: 0, kind: 'go', name: 'Start' },
  prop(1, 'Lisbon, Portugal', 60, 'brown', [2, 10, 30, 90, 160, 250], 50),
  { index: 2, kind: 'chest', name: 'Neighbour Chest' },
  prop(3, 'Porto, Portugal', 60, 'brown', [4, 20, 60, 180, 320, 450], 50),
  { index: 4, kind: 'tax', name: 'Meadow Tax', tax: 200 },
  station(5, 'Heathrow Airport'),
  prop(6, 'Madrid, Spain', 100, 'lightblue', [6, 30, 90, 270, 400, 550], 50),
  { index: 7, kind: 'chance', name: 'Chance' },
  prop(8, 'Barcelona, Spain', 100, 'lightblue', [6, 30, 90, 270, 400, 550], 50),
  prop(9, 'Seville, Spain', 120, 'lightblue', [8, 40, 100, 300, 450, 600], 50),
  { index: 10, kind: 'jail', name: 'Prison' },
  prop(11, 'Paris, France', 140, 'pink', [10, 50, 150, 450, 625, 750], 100),
  utility(12, 'Lantern Works'),
  prop(13, 'Lyon, France', 140, 'pink', [10, 50, 150, 450, 625, 750], 100),
  prop(14, 'Marseille, France', 160, 'pink', [12, 60, 180, 500, 700, 900], 100),
  station(15, 'Charles de Gaulle Airport'),
  prop(16, 'Berlin, Germany', 180, 'orange', [14, 70, 200, 550, 750, 950], 100),
  { index: 17, kind: 'chest', name: 'Neighbour Chest' },
  prop(18, 'Munich, Germany', 180, 'orange', [14, 70, 200, 550, 750, 950], 100),
  prop(19, 'Hamburg, Germany', 200, 'orange', [16, 80, 220, 600, 800, 1000], 100),
  { index: 20, kind: 'parking', name: 'Vacation' },
  prop(21, 'Rome, Italy', 220, 'red', [18, 90, 250, 700, 875, 1050], 150),
  { index: 22, kind: 'chance', name: 'Chance' },
  prop(23, 'Florence, Italy', 220, 'red', [18, 90, 250, 700, 875, 1050], 150),
  prop(24, 'Venice, Italy', 240, 'red', [20, 100, 300, 750, 925, 1100], 150),
  station(25, 'JFK Airport'),
  prop(26, 'Tokyo, Japan', 260, 'yellow', [22, 110, 330, 800, 975, 1150], 150),
  prop(27, 'Kyoto, Japan', 260, 'yellow', [22, 110, 330, 800, 975, 1150], 150),
  utility(28, 'Well House'),
  prop(29, 'Osaka, Japan', 280, 'yellow', [24, 120, 360, 850, 1025, 1200], 150),
  { index: 30, kind: 'goto-jail', name: 'Go to Prison' },
  prop(31, 'London, United Kingdom', 300, 'green', [26, 130, 390, 900, 1100, 1275], 200),
  prop(32, 'Edinburgh, United Kingdom', 300, 'green', [26, 130, 390, 900, 1100, 1275], 200),
  { index: 33, kind: 'chest', name: 'Neighbour Chest' },
  prop(34, 'Manchester, United Kingdom', 320, 'green', [28, 150, 450, 1000, 1200, 1400], 200),
  station(35, 'Haneda Airport'),
  { index: 36, kind: 'chance', name: 'Chance' },
  prop(37, 'New York, United States', 350, 'darkblue', [35, 175, 500, 1100, 1300, 1500], 200),
  { index: 38, kind: 'tax', name: 'Festival Tax', tax: 100 },
  prop(39, 'Los Angeles, United States', 400, 'darkblue', [50, 200, 600, 1400, 1700, 2000], 200),
];

function chanceCards(): Card[] {
  return [
    { id: 'ch1', deck: 'chance', text: 'A neighbour drops off a basket of jam. Collect $50.', effect: { kind: 'money', amount: 50 } },
    { id: 'ch2', deck: 'chance', text: 'The market stall pays out. Collect $150.', effect: { kind: 'money', amount: 150 } },
    { id: 'ch3', deck: 'chance', text: 'Go back to Start. Collect $200.', effect: { kind: 'move-to', square: 0 } },
    { id: 'ch4', deck: 'chance', text: 'Fly to Los Angeles, United States.', effect: { kind: 'move-to', square: 39 } },
    { id: 'ch5', deck: 'chance', text: 'Head to the nearest station. If someone owns it, pay double rent.', effect: { kind: 'nearest-station' } },
    { id: 'ch6', deck: 'chance', text: 'A storm keeps you in Prison. Go there now.', effect: { kind: 'go-to-jail' } },
    { id: 'ch7', deck: 'chance', text: 'A kind passer-by hands you a Prison pass. Keep it for later.', effect: { kind: 'get-out' } },
    { id: 'ch8', deck: 'chance', text: 'Garden repairs: pay $25 for each house and $100 for each hotel you own.', effect: { kind: 'repairs', perHouse: 25, perHotel: 100 } },
    { id: 'ch9', deck: 'chance', text: 'You win the village raffle. Collect $100.', effect: { kind: 'money', amount: 100 } },
    { id: 'ch10', deck: 'chance', text: 'Pay $50 towards the village fete.', effect: { kind: 'money', amount: -50 } },
    { id: 'ch11', deck: 'chance', text: 'Wander back three squares.', effect: { kind: 'move-to', square: -3 } },
    { id: 'ch12', deck: 'chance', text: 'A friend repays an old loan. Collect $75.', effect: { kind: 'money', amount: 75 } },
  ];
}

function chestCards(): Card[] {
  return [
    { id: 'ce1', deck: 'chest', text: 'It is your birthday! Each other player gives you $20.', effect: { kind: 'money-from-each', amount: 20 } },
    { id: 'ce2', deck: 'chest', text: 'A savings tin turns up $100. Collect $100.', effect: { kind: 'money', amount: 100 } },
    { id: 'ce3', deck: 'chest', text: 'Pay $50 for school supplies.', effect: { kind: 'money', amount: -50 } },
    { id: 'ce4', deck: 'chest', text: 'A neighbour leaves you a Prison pass. Keep it for later.', effect: { kind: 'get-out' } },
    { id: 'ce5', deck: 'chest', text: 'You are sent to Prison for a quiet think.', effect: { kind: 'go-to-jail' } },
    { id: 'ce6', deck: 'chest', text: 'Go back to Start. Collect $200.', effect: { kind: 'move-to', square: 0 } },
    { id: 'ce7', deck: 'chest', text: 'The choir fund pays out $25.', effect: { kind: 'money', amount: 25 } },
    { id: 'ce8', deck: 'chest', text: 'A leaking tap costs $40 to fix.', effect: { kind: 'money', amount: -40 } },
    { id: 'ce9', deck: 'chest', text: 'Holiday savings mature. Collect $200.', effect: { kind: 'money', amount: 200 } },
    { id: 'ce10', deck: 'chest', text: 'Pay $15 for a library fine.', effect: { kind: 'money', amount: -15 } },
    { id: 'ce11', deck: 'chest', text: 'Everyone chips in $10 for your picnic.', effect: { kind: 'money-from-each', amount: 10 } },
    { id: 'ce12', deck: 'chest', text: 'A lost wallet is returned with $45 inside.', effect: { kind: 'money', amount: 45 } },
  ];
}

function clone<T>(v: T): T {
  const out = JSON.parse(JSON.stringify(v)) as T;
  // The log is display-only; keep it bounded so long games stay fast.
  const maybe = out as unknown as { log?: string[] };
  if (Array.isArray(maybe.log) && maybe.log.length > 200) {
    maybe.log = maybe.log.slice(-200);
  }
  return out;
}

export function rollDicePair(rng: () => number): [number, number] {
  return [1 + Math.floor(rng() * 6), 1 + Math.floor(rng() * 6)];
}

export function createGame(seed?: string, names?: [string, string]): GameState {
  const rng = seed ? rngFromSeed(seed) : () => Math.random();
  const mkPlayer = (name: string): PlayerState => ({
    name,
    money: START_MONEY,
    position: 0,
    inJail: false,
    jailTurns: 0,
    getOutCards: 0,
    bankrupt: false,
  });
  return {
    players: [mkPlayer(names?.[0] ?? 'Player 1'), mkPlayer(names?.[1] ?? 'Player 2')],
    property: BOARD.map(() => ({ owner: null, houses: 0 })),
    turn: 0,
    phase: 'roll',
    pendingBuy: null,
    lastDice: null,
    rolledDoubles: false,
    doublesCount: 0,
    chanceDeck: shuffle(chanceCards(), rng),
    chanceDiscard: [],
    chestDeck: shuffle(chestCards(), rng),
    chestDiscard: [],
    winner: null,
    turnCount: 0,
    log: ['A fresh board, $1500 each. Player 1 rolls first.'],
  };
}

export function squaresOfGroup(group: string): Square[] {
  return BOARD.filter((s) => s.group === group);
}

export function ownsFullSet(state: GameState, player: PlayerIndex, group: string): boolean {
  const squares = squaresOfGroup(group);
  return (
    squares.length > 0 &&
    squares.every((s) => state.property[s.index].owner === player)
  );
}

/** Rent due for landing on `square` (dice total needed for utilities). */
export function rentFor(state: GameState, square: Square, diceTotal: number): number {
  const propState = state.property[square.index];
  if (square.kind === 'property' && square.rent) {
    if (propState.houses > 0) return square.rent[propState.houses];
    const base = square.rent[0];
    // Full set, no houses: rent doubles (classic rule).
    return square.group && ownsFullSet(state, propState.owner as PlayerIndex, square.group)
      ? base * 2
      : base;
  }
  if (square.kind === 'station') {
    const owned = squaresOfGroup('station').filter(
      (s) => state.property[s.index].owner === propState.owner,
    ).length;
    return 25 * Math.pow(2, Math.max(owned - 1, 0));
  }
  if (square.kind === 'utility') {
    const owned = squaresOfGroup('utility').filter(
      (s) => state.property[s.index].owner === propState.owner,
    ).length;
    return diceTotal * (owned >= 2 ? 10 : 4);
  }
  return 0;
}

function other(p: PlayerIndex): PlayerIndex {
  return (1 - p) as PlayerIndex;
}

function bankrupt(state: GameState, player: PlayerIndex, why: string): GameState {
  const s = clone(state);
  s.players[player].bankrupt = true;
  s.players[player].money = 0;
  for (const p of s.property) {
    if (p.owner === player) {
      p.owner = null;
      p.houses = 0;
    }
  }
  s.winner = other(player);
  s.phase = 'over';
  s.pendingBuy = null;
  s.log.push(`${s.players[player].name} is out of money (${why}) — ${s.players[s.winner].name} wins.`);
  return s;
}

/** Charge `player` an amount to the bank (or to `creditor`); bankrupt if unaffordable. */
function pay(state: GameState, player: PlayerIndex, amount: number, why: string, creditor: PlayerIndex | null): GameState {
  if (amount <= 0) return state;
  const s = clone(state);
  const p = s.players[player];
  if (p.money < amount) return bankrupt(s, player, why);
  p.money -= amount;
  if (creditor !== null) s.players[creditor].money += amount;
  s.log.push(`${p.name} pays $${amount} (${why}).`);
  return s;
}

function sendToJail(state: GameState, player: PlayerIndex): GameState {
  const s = clone(state);
  s.players[player].position = JAIL_SQUARE;
  s.players[player].inJail = true;
  s.players[player].jailTurns = 0;
  s.doublesCount = 0;
  s.log.push(`${s.players[player].name} goes to Prison.`);
  return s;
}

function advanceTurn(s: GameState, keepTurn: boolean): GameState {
  if (s.winner !== null) {
    s.phase = 'over';
    return s;
  }
  if (keepTurn) {
    s.phase = 'roll';
    return s;
  }
  s.turn = other(s.turn);
  s.turnCount += 1;
  const next = s.players[s.turn];
  s.phase = next.inJail ? 'jail' : 'roll';
  s.rolledDoubles = false;
  return s;
}

/** Resolve landing on a square. `allowCard` is false for card-driven moves (no chained draws). */
function resolveLanding(
  state: GameState,
  player: PlayerIndex,
  diceTotal: number,
  allowCard: boolean,
): GameState {
  let s = clone(state);
  const p = s.players[player];
  const square = BOARD[p.position];
  s.log.push(`${p.name} lands on ${square.name}.`);
  if (square.kind === 'goto-jail') {
    s = sendToJail(s, player);
    return advanceTurn(s, false);
  }
  if (square.kind === 'tax' && square.tax) {
    s = pay(s, player, square.tax, square.name, null);
    if (s.winner !== null) return s;
    return advanceTurn(s, s.rolledDoubles);
  }
  if (square.kind === 'chance' || square.kind === 'chest') {
    if (!allowCard) return advanceTurn(s, s.rolledDoubles);
    s = drawCard(s, player, square.kind, diceTotal);
    if (s.winner !== null) return s;
    // A card may have set a pending buy (move-to an unowned square).
    if (s.phase === 'buy') return s;
    // A card that sends the player to jail ends the turn, even on doubles.
    return advanceTurn(s, s.players[player].inJail ? false : s.rolledDoubles);
  }
  if (square.kind === 'property' || square.kind === 'station' || square.kind === 'utility') {
    const propState = s.property[square.index];
    if (propState.owner === null) {
      s.phase = 'buy';
      s.pendingBuy = square.index;
      s.log.push(`${square.name} is for sale at $${square.price}.`);
      return s;
    }
    if (propState.owner !== player) {
      const rent = rentFor(s, square, diceTotal);
      s = pay(s, player, rent, `rent for ${square.name}`, propState.owner);
      if (s.winner !== null) return s;
      return advanceTurn(s, s.rolledDoubles);
    }
    return advanceTurn(s, s.rolledDoubles);
  }
  // go / jail (just visiting) / parking: nothing happens.
  return advanceTurn(s, s.rolledDoubles);
}

function drawCard(state: GameState, player: PlayerIndex, deckKind: 'chance' | 'chest', diceTotal: number): GameState {
  let s = clone(state);
  const deckKey = deckKind === 'chance' ? 'chanceDeck' : 'chestDeck';
  const discardKey = deckKind === 'chance' ? 'chanceDiscard' : 'chestDiscard';
  if (s[deckKey].length === 0) {
    s[deckKey] = shuffle(s[discardKey], () => Math.random());
    s[discardKey] = [];
  }
  const card = s[deckKey].shift();
  if (!card) return s;
  s.log.push(`Card: ${card.text}`);
  if (card.effect.kind !== 'get-out') s[discardKey].push(card);
  return applyCard(s, player, card, diceTotal);
}

function applyCard(state: GameState, player: PlayerIndex, card: Card, diceTotal: number): GameState {
  let s = clone(state);
  const p = s.players[player];
  const eff = card.effect;
  if (eff.kind === 'money') {
    if (eff.amount >= 0) {
      s.players[player].money += eff.amount;
    } else {
      s = pay(s, player, -eff.amount, 'card payment', null);
    }
    return s;
  }
  if (eff.kind === 'money-from-each') {
    const giver = other(player);
    if (s.players[giver].money < eff.amount) {
      // The giver cannot pay in full: they go bankrupt, the receiver gets what they had.
      const had = s.players[giver].money;
      s.players[player].money += had;
      return bankrupt(s, giver, 'could not pay a card gift');
    }
    s.players[giver].money -= eff.amount;
    s.players[player].money += eff.amount;
    return s;
  }
  if (eff.kind === 'get-out') {
    s.players[player].getOutCards += 1;
    return s;
  }
  if (eff.kind === 'go-to-jail') {
    return sendToJail(s, player);
  }
  if (eff.kind === 'repairs') {
    let cost = 0;
    for (const propState of s.property) {
      if (propState.owner !== player) continue;
      cost += propState.houses === 5 ? eff.perHotel : eff.perHouse * propState.houses;
    }
    if (cost > 0) s = pay(s, player, cost, 'repairs', null);
    return s;
  }
  if (eff.kind === 'nearest-station') {
    const stations = [5, 15, 25, 35];
    const target = stations.find((st) => st > p.position) ?? stations[0];
    const wrapped = target <= p.position;
    if (wrapped) s.players[player].money += GO_SALARY;
    s.players[player].position = target;
    const square = BOARD[target];
    const propState = s.property[target];
    if (propState.owner === null) {
      s.phase = 'buy';
      s.pendingBuy = target;
      s.log.push(`${square.name} is for sale at $${square.price}.`);
      return s;
    }
    if (propState.owner !== player) {
      const rent = rentFor(s, square, diceTotal) * 2;
      s = pay(s, player, rent, `double rent for ${square.name}`, propState.owner);
    }
    return s;
  }
  // move-to: -3 means "back three squares" (no Go salary); any other value is an absolute square.
  if (eff.kind === 'move-to') {
    if (eff.square === -3) {
      s.players[player].position = (p.position + 40 - 3) % 40;
    } else {
      const wrapped = eff.square < p.position;
      if (wrapped || eff.square === 0) s.players[player].money += GO_SALARY;
      s.players[player].position = eff.square;
    }
    // Resolve the new square without drawing another card.
    const landed = BOARD[s.players[player].position];
    if (landed.kind === 'goto-jail') return sendToJail(s, player);
    if (landed.kind === 'property' || landed.kind === 'station' || landed.kind === 'utility') {
      const propState = s.property[landed.index];
      if (propState.owner === null) {
        s.phase = 'buy';
        s.pendingBuy = landed.index;
        s.log.push(`${landed.name} is for sale at $${landed.price}.`);
        return s;
      }
      if (propState.owner !== player) {
        const rent = rentFor(s, landed, diceTotal);
        s = pay(s, player, rent, `rent for ${landed.name}`, propState.owner);
      }
    }
    return s;
  }
  return s;
}

/** Roll and move. Only valid in phase 'roll'. Returns the new state (unchanged on misuse). */
export function rollTurn(state: GameState, dice: [number, number]): GameState {
  if (state.phase !== 'roll' || state.winner !== null) return state;
  let s = clone(state);
  const player = s.turn;
  const p = s.players[player];
  const [d1, d2] = dice;
  const total = d1 + d2;
  const isDouble = d1 === d2;
  s.lastDice = dice;
  s.log.push(`${p.name} rolls ${d1} + ${d2} = ${total}${isDouble ? ' (doubles!)' : ''}.`);
  if (isDouble) {
    s.doublesCount += 1;
    if (s.doublesCount >= 3) {
      s = sendToJail(s, player);
      return advanceTurn(s, false);
    }
  } else {
    s.doublesCount = 0;
  }
  s.rolledDoubles = isDouble;
  const oldPos = p.position;
  const newPos = (oldPos + total) % 40;
  if (oldPos + total >= 40) {
    s.players[player].money += GO_SALARY;
    s.log.push(`${p.name} passes Start and collects $${GO_SALARY}.`);
  }
  s.players[player].position = newPos;
  s = resolveLanding(s, player, total, true);
  return s;
}

/** Pay $50 to leave jail; the player then rolls normally (phase 'roll'). */
export function payJailFine(state: GameState): GameState {
  if (state.phase !== 'jail' || state.winner !== null) return state;
  let s = clone(state);
  const player = s.turn;
  s = pay(s, player, JAIL_FINE, 'Prison fine', null);
  if (s.winner !== null) return s;
  s.players[player].inJail = false;
  s.players[player].jailTurns = 0;
  s.doublesCount = 0;
  s.phase = 'roll';
  s.log.push(`${s.players[player].name} pays $${JAIL_FINE} and leaves Prison.`);
  return s;
}

/** Spend a Prison pass to leave jail; the player then rolls normally. */
export function useJailCard(state: GameState): GameState {
  if (state.phase !== 'jail' || state.winner !== null) return state;
  const player = state.turn;
  if (state.players[player].getOutCards <= 0) return state;
  const s = clone(state);
  s.players[player].getOutCards -= 1;
  s.players[player].inJail = false;
  s.players[player].jailTurns = 0;
  s.doublesCount = 0;
  s.phase = 'roll';
  s.log.push(`${s.players[player].name} uses a Prison pass.`);
  return s;
}

/** Roll while in jail: doubles free the player and move; otherwise stay (3rd failure pays and moves). */
export function rollJailDice(state: GameState, dice: [number, number]): GameState {
  if (state.phase !== 'jail' || state.winner !== null) return state;
  let s = clone(state);
  const player = s.turn;
  const p = s.players[player];
  const [d1, d2] = dice;
  const total = d1 + d2;
  s.lastDice = dice;
  s.log.push(`${p.name} rolls ${d1} + ${d2} in Prison.`);
  if (d1 === d2) {
    s.players[player].inJail = false;
    s.players[player].jailTurns = 0;
    s.doublesCount = 0;
    s.rolledDoubles = false;
    const oldPos = p.position;
    const newPos = (oldPos + total) % 40;
    if (oldPos + total >= 40) s.players[player].money += GO_SALARY;
    s.players[player].position = newPos;
    s = resolveLanding(s, player, total, true);
    return s;
  }
  s.players[player].jailTurns += 1;
  if (s.players[player].jailTurns >= 3) {
    s = pay(s, player, JAIL_FINE, 'Prison fine after three tries', null);
    if (s.winner !== null) return s;
    s.players[player].inJail = false;
    s.players[player].jailTurns = 0;
    s.rolledDoubles = false;
    const oldPos = s.players[player].position;
    const newPos = (oldPos + total) % 40;
    if (oldPos + total >= 40) s.players[player].money += GO_SALARY;
    s.players[player].position = newPos;
    s = resolveLanding(s, player, total, true);
    return s;
  }
  // Still in jail: turn passes to the other player.
  return advanceTurn(s, false);
}

/** Buy the pending property (phase 'buy'). Unchanged if unaffordable or not pending. */
export function buyProperty(state: GameState): GameState {
  if (state.phase !== 'buy' || state.pendingBuy === null || state.winner !== null) return state;
  const square = BOARD[state.pendingBuy];
  const player = state.turn;
  if (!square.price || state.players[player].money < square.price) return state;
  const s = clone(state);
  s.players[player].money -= square.price;
  s.property[state.pendingBuy].owner = player;
  s.log.push(`${s.players[player].name} buys ${square.name} for $${square.price}.`);
  s.pendingBuy = null;
  return advanceTurn(s, s.rolledDoubles);
}

/** Decline the pending property; it stays unowned (no auction). */
export function declineBuy(state: GameState): GameState {
  if (state.phase !== 'buy' || state.pendingBuy === null) return state;
  const pending = state.pendingBuy;
  const s = clone(state);
  s.log.push(`${s.players[s.turn].name} passes on ${BOARD[pending].name}.`);
  s.pendingBuy = null;
  return advanceTurn(s, s.rolledDoubles);
}

/** Squares the player may build on right now (full set, even building, affordable, not a hotel yet). */
export function buildableSquares(state: GameState, player: PlayerIndex): number[] {
  const out: number[] = [];
  for (const square of BOARD) {
    if (square.kind !== 'property' || !square.group || !square.houseCost) continue;
    const propState = state.property[square.index];
    if (propState.owner !== player || propState.houses >= 5) continue;
    if (!ownsFullSet(state, player, square.group)) continue;
    if (state.players[player].money < square.houseCost) continue;
    // Even building: only build on a property at the set's lowest level.
    const levels = squaresOfGroup(square.group).map((sq) => state.property[sq.index].houses);
    if (propState.houses > Math.min(...levels)) continue;
    out.push(square.index);
  }
  return out;
}

export function buildHouse(state: GameState, squareIndex: number): { state: GameState; ok: boolean; message: string } {
  const player = state.turn;
  if (state.winner !== null) return { state, ok: false, message: 'The game is over.' };
  if (!buildableSquares(state, player).includes(squareIndex)) {
    return { state, ok: false, message: 'You cannot build there yet — own the full set, build evenly, and keep enough money.' };
  }
  const square = BOARD[squareIndex];
  const s = clone(state);
  s.players[player].money -= square.houseCost ?? 0;
  s.property[squareIndex].houses += 1;
  const level = s.property[squareIndex].houses;
  s.log.push(
    `${s.players[player].name} builds ${level === 5 ? 'a hotel' : `house ${level}`} on ${square.name} for $${square.houseCost}.`,
  );
  return { state: s, ok: true, message: level === 5 ? `A hotel rises on ${square.name}.` : `House ${level} built on ${square.name}.` };
}

/** Net worth: cash + purchase prices + house/hotel costs spent. */
export function netWorth(state: GameState, player: PlayerIndex): number {
  let total = state.players[player].money;
  for (const square of BOARD) {
    const propState = state.property[square.index];
    if (propState.owner !== player) continue;
    total += square.price ?? 0;
    if (square.kind === 'property' && square.houseCost) total += propState.houses * square.houseCost;
  }
  return total;
}

/** Simple computer strategy: buy when it completes a set, or when a reserve of $100 remains. */
export function botShouldBuy(state: GameState): boolean {
  if (state.phase !== 'buy' || state.pendingBuy === null) return false;
  const square = BOARD[state.pendingBuy];
  const player = state.turn;
  if (!square.price || state.players[player].money < square.price) return false;
  if (square.group && square.kind === 'property') {
    const others = squaresOfGroup(square.group).filter((sq) => sq.index !== square.index);
    if (others.every((sq) => state.property[sq.index].owner === player)) return true;
  }
  return state.players[player].money - square.price >= 100;
}

/** Cheapest buildable square for the bot, or null. */
export function botBuildChoice(state: GameState): number | null {
  const options = buildableSquares(state, state.turn);
  if (options.length === 0) return null;
  options.sort((a, b) => (BOARD[a].houseCost ?? 0) - (BOARD[b].houseCost ?? 0));
  return options[0];
}

/** Bot jail decision: use a pass, pay on the last chance, otherwise roll. */
export function botJailAction(state: GameState): 'card' | 'pay' | 'roll' {
  const p = state.players[state.turn];
  if (p.getOutCards > 0) return 'card';
  if (p.jailTurns >= 2) return 'pay';
  return 'roll';
}

/**
 * Play a full bot-vs-bot game with a seed. Terminates because turnCount is
 * capped: if the cap is hit, the richer player (by net worth) is the winner.
 * This cap is a simulation guard, not a game rule.
 */
export function simulateBotGame(seed: string, maxTurns = 1500): { winner: PlayerIndex; turns: number; state: GameState } {
  const rng = rngFromSeed(seed);
  let s = createGame(seed);
  let guard = 0;
  while (s.winner === null && s.turnCount < maxTurns && guard < maxTurns * 20) {
    guard += 1;
    if (s.phase === 'jail') {
      const action = botJailAction(s);
      if (action === 'card') s = useJailCard(s);
      else if (action === 'pay') s = payJailFine(s);
      else s = rollJailDice(s, rollDicePair(rng));
      continue;
    }
    if (s.phase === 'buy') {
      s = botShouldBuy(s) ? buyProperty(s) : declineBuy(s);
      continue;
    }
    if (s.phase === 'roll') {
      // Build before rolling when the bot can.
      const build = botBuildChoice(s);
      if (build !== null) {
        const res = buildHouse(s, build);
        s = res.state;
      }
      s = rollTurn(s, rollDicePair(rng));
      continue;
    }
    break;
  }
  if (s.winner === null) {
    const w: PlayerIndex = netWorth(s, 0) >= netWorth(s, 1) ? 0 : 1;
    s = clone(s);
    s.winner = w;
    s.phase = 'over';
    s.log.push(`Turn cap reached — ${s.players[w].name} leads on value and wins.`);
  }
  return { winner: s.winner as PlayerIndex, turns: s.turnCount, state: s };
}
