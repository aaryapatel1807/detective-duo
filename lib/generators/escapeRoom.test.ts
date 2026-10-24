import { describe, expect, it } from 'vitest';
import {
  escapeTierForLevel,
  generateLevelRoom,
  generateRoom,
} from './escapeRoom';

describe('escape room generator', () => {
  it('is deterministic: same seed, same room', () => {
    const a = generateRoom('er|tester|17', 17);
    const b = generateRoom('er|tester|17', 17);
    expect(b).toEqual(a);
  });

  it('follows the tier ladder', () => {
    expect(escapeTierForLevel(1).name).toBe('Easy');
    expect(escapeTierForLevel(10).name).toBe('Easy');
    expect(escapeTierForLevel(11).name).toBe('Medium');
    expect(escapeTierForLevel(30).name).toBe('Medium');
    expect(escapeTierForLevel(31).name).toBe('Hard');
    expect(escapeTierForLevel(60).name).toBe('Hard');
    expect(escapeTierForLevel(61).name).toBe('Expert');
    // More locks at higher levels.
    const easy = generateLevelRoom(5, 'ladder').locks.length;
    const medium = generateLevelRoom(20, 'ladder').locks.length;
    const hard = generateLevelRoom(45, 'ladder').locks.length;
    const expert = generateLevelRoom(81, 'ladder').locks.length;
    expect(medium).toBeGreaterThan(easy);
    expect(hard).toBeGreaterThan(medium);
    expect(expert).toBeGreaterThanOrEqual(hard);
    // Expert twists rotate every 10 levels.
    expect(escapeTierForLevel(61).twist).not.toBe(escapeTierForLevel(71).twist);
    expect(escapeTierForLevel(71).twist).not.toBe(escapeTierForLevel(81).twist);
  });

  it('every lock has a visible source object, across levels 1-120', () => {
    for (let level = 1; level <= 120; level++) {
      const room = generateLevelRoom(level, 'sources');
      const objectIds = new Set(room.objects.map((o) => o.id));
      for (const lock of room.locks) {
        expect(objectIds.has(lock.sourceId), `level ${level} lock ${lock.id} source ${lock.sourceId}`).toBe(true);
        for (const s of lock.sources) {
          expect(objectIds.has(s), `level ${level} lock ${lock.id} source ${s}`).toBe(true);
        }
        expect(lock.derivation.length).toBeGreaterThan(0);
      }
    }
  });

  it('no lock is brute-forceable: codes are >= 3 digits, patterns from wall symbols', () => {
    for (let level = 1; level <= 120; level++) {
      const room = generateLevelRoom(level, 'brute');
      for (const lock of room.locks) {
        if (lock.kind === 'code') {
          expect(typeof lock.solution).toBe('string');
          expect((lock.solution as string).length).toBeGreaterThanOrEqual(3);
          expect(/^\d+$/.test(lock.solution as string)).toBe(true);
        }
        if (lock.kind === 'pattern') {
          const seq = lock.solution as string[];
          expect(seq.length).toBeGreaterThanOrEqual(3);
          for (const sym of seq) expect(room.wallSymbols).toContain(sym);
        }
      }
    }
  });

  it('the chain always ends with the door, and key locks name a hidden item', () => {
    for (const level of [1, 20, 45, 75, 95]) {
      const room = generateLevelRoom(level, 'chain');
      expect(room.locks[room.locks.length - 1].kind).toBe('door');
      for (const lock of room.locks.filter((l) => l.kind === 'key')) {
        expect(lock.requiresItem).toBeDefined();
        expect(
          room.objects.some((o) => o.hidesItem === lock.requiresItem),
        ).toBe(true);
      }
    }
  });
});
