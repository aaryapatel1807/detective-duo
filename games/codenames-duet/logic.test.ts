import { describe, expect, it } from 'vitest';
import {
  agentsFound,
  allAgentsFound,
  buildBoard,
  isLegalClue,
  outOfTurns,
  revealCard,
  DUET_AGENTS,
  DUET_ASSASSINS,
  DUET_BOARD_SIZE,
} from './logic';

const POOL = Array.from({ length: 40 }, (_, i) => `WORD${i}`);

describe('codenames-duet logic', () => {
  it('builds a 25-card board with 9 agents and 3 assassins', () => {
    const { words, key } = buildBoard(POOL);
    expect(words).toHaveLength(DUET_BOARD_SIZE);
    expect(new Set(words).size).toBe(DUET_BOARD_SIZE);
    expect(key.filter((k) => k === 'agent')).toHaveLength(DUET_AGENTS);
    expect(key.filter((k) => k === 'assassin')).toHaveLength(DUET_ASSASSINS);
  });

  it('reveals cards immutably and reports the outcome', () => {
    const key = ['agent', 'bystander', 'assassin'] as const;
    const r = revealCard([false, false, false], [...key], 2);
    expect(r.outcome).toBe('assassin');
    expect(r.revealed).toEqual([false, false, true]);
  });

  it('counts found agents', () => {
    const key = ['agent', 'agent', 'bystander'] as const;
    expect(agentsFound([...key], [true, false, false])).toBe(1);
    expect(allAgentsFound([...key], [true, true, false])).toBe(false);
    const full = Array(DUET_AGENTS).fill('agent') as ('agent' | 'bystander' | 'assassin')[];
    expect(allAgentsFound(full, Array(DUET_AGENTS).fill(true))).toBe(true);
  });

  it('rejects illegal clues', () => {
    const words = ['CRIME', 'GHOST'];
    expect(isLegalClue('CRIME', words, [false, false])).toBe(false); // matches a card
    expect(isLegalClue('CRIMES', words, [false, false])).toBe(false); // contains a card
    expect(isLegalClue('CRIME', words, [true, false])).toBe(true); // already revealed
    expect(isLegalClue('SHADOW', words, [false, false])).toBe(true);
    expect(isLegalClue('two words', words, [false, false])).toBe(false);
  });

  it('detects the turn limit', () => {
    expect(outOfTurns(9)).toBe(false);
    expect(outOfTurns(10)).toBe(true);
  });
});
