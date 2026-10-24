import { describe, expect, it } from 'vitest';
import {
  checkboxBotDelayMs,
  checkboxFinished,
  checkboxProgress,
  checkboxTargetForLevel,
  currentCall,
  generateCheckbox,
} from './checkbox';

describe('checkbox race', () => {
  it('generates a 100-digit cloud and a full call permutation', () => {
    const g = generateCheckbox('seed', 5);
    expect(g.grid).toHaveLength(100);
    expect(new Set(g.grid).size).toBe(100);
    expect(new Set(g.calls).size).toBe(100);
    expect(g.target).toBe(30);
    expect(checkboxTargetForLevel(20)).toBe(50);
    expect(checkboxTargetForLevel(45)).toBe(75);
    expect(checkboxTargetForLevel(80)).toBe(100);
  });

  it('is deterministic for the same seed + level', () => {
    const a = generateCheckbox('abc', 12);
    const b = generateCheckbox('abc', 12);
    expect(a).toEqual(b);
    expect(generateCheckbox('abc', 13).grid).not.toEqual(a.grid);
  });

  it('calls numbers in order, skipping found ones, until the target', () => {
    const g = generateCheckbox('s', 1);
    expect(currentCall(g, [])).toBe(g.calls[0]);
    expect(currentCall(g, [g.calls[0]!])).toBe(g.calls[1]);
    const found = g.calls.slice(0, 30);
    expect(currentCall(g, found)).toBe(null);
    expect(checkboxFinished(g, found)).toBe(true);
    expect(checkboxProgress(g, g.calls.slice(0, 15))).toBe(0.5);
  });

  it('speeds the bot up with level', () => {
    expect(checkboxBotDelayMs(1)).toBeGreaterThan(checkboxBotDelayMs(20));
    expect(checkboxBotDelayMs(20)).toBeGreaterThan(checkboxBotDelayMs(70));
  });
});
