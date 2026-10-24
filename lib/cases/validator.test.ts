import { describe, expect, it } from 'vitest';
import type { CaseFile } from './types';
import { survivingSuspects, validateCase } from './validator';

const goodCase: CaseFile = {
  id: 'test-good',
  title: 'The Missing Teapot',
  difficulty: 'Easy',
  setting: 'A village tea room',
  narrative: 'The silver teapot vanished during the afternoon rush.',
  suspects: [
    { id: 's1', name: 'Mabel Hart', role: 'Tea room owner', alibi: 'At the counter all afternoon.', secret: 'She hides the good biscuits for herself.' },
    { id: 's2', name: 'Rupert Cole', role: 'Regular', alibi: 'Reading by the window.', secret: 'He never pays for extra jam.' },
    { id: 's3', name: 'Priya Nair', role: 'Waitress', alibi: 'In the kitchen.', secret: 'She practises poetry on order pads.' },
    { id: 's4', name: 'Tomas Reed', role: 'Delivery driver', alibi: 'Outside with his van.', secret: 'He naps in the van between drops.' },
  ],
  clues: [
    { id: 'c1', kind: 'timing', text: 'The till log shows Mabel never left the counter.', rulesOut: ['s1'] },
    { id: 'c2', kind: 'statement', text: 'Two guests saw Rupert by the window the whole time.', rulesOut: ['s2'] },
    { id: 'c3', kind: 'physical', text: 'Flour on the kitchen floor is undisturbed, and Priya never left it.', rulesOut: ['s3'] },
  ],
  redHerrings: [
    { id: 'r1', text: 'A stranger in a long coat was seen near the door.' },
  ],
  solution: { culpritId: 's4', explanation: 'Tomas slipped in through the back while his van idled outside.' },
  deductionPath: [
    { clueId: 'c1', text: 'Mabel never left the counter, so she could not have taken it.' },
    { clueId: 'c2', text: 'Rupert stayed by the window the whole time.' },
    { clueId: 'c3', text: 'Priya stayed in the kitchen. Only Tomas is left.' },
  ],
};

describe('case validator', () => {
  it('ACCEPTS a known-good case', () => {
    expect(validateCase(goodCase)).toEqual({ valid: true, errors: [] });
    expect(survivingSuspects(goodCase)).toEqual(['s4']);
  });

  it('REJECTS a case with two consistent suspects', () => {
    const twoSurvivors: CaseFile = {
      ...goodCase,
      clues: goodCase.clues.slice(0, 2), // Priya is never ruled out
    };
    const result = validateCase(twoSurvivors);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('not unique'))).toBe(true);
  });

  it('REJECTS a case whose deduction path references a nonexistent clue', () => {
    const badRef: CaseFile = {
      ...goodCase,
      deductionPath: [{ clueId: 'c99', text: 'A step pointing nowhere.' }],
    };
    const result = validateCase(badRef);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('c99'))).toBe(true);
  });

  it('REJECTS a case whose culprit is not among the suspects', () => {
    const result = validateCase({
      ...goodCase,
      solution: { culpritId: 's99', explanation: 'Nobody did it.' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('not among the suspects'))).toBe(true);
  });

  it('REJECTS a clue that rules out the culprit', () => {
    const result = validateCase({
      ...goodCase,
      clues: [
        ...goodCase.clues,
        { id: 'c4', kind: 'physical', text: 'A muddy bootprint matches the van.', rulesOut: ['s4'] },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('rules out the culprit'))).toBe(true);
  });

  it('REJECTS a solution-revealing red herring', () => {
    const result = validateCase({
      ...goodCase,
      redHerrings: [{ id: 'r1', text: 'Tomas was seen carrying something silver.' }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('names the culprit'))).toBe(true);
  });

  it('REJECTS too few suspects and missing clues', () => {
    expect(validateCase({ ...goodCase, suspects: goodCase.suspects.slice(0, 3) }).valid).toBe(false);
    expect(validateCase({ ...goodCase, clues: [] }).valid).toBe(false);
  });
});
