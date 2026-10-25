import { describe, expect, it } from 'vitest';
import { claimDecision, MAX_ATTEMPTS, overBudget, PROCESS_BUDGET_MS } from './processQueue';

describe('claimDecision', () => {
  it('processes a fresh photo', () => {
    expect(claimDecision(0)).toBe('process');
  });
  it('processes a photo with claims left', () => {
    expect(claimDecision(MAX_ATTEMPTS - 1)).toBe('process');
  });
  it('fails a photo that burned all its claims', () => {
    expect(claimDecision(MAX_ATTEMPTS)).toBe('fail');
    expect(claimDecision(MAX_ATTEMPTS + 5)).toBe('fail');
  });
  it('treats a missing attempt count as fresh', () => {
    expect(claimDecision(null)).toBe('process');
    expect(claimDecision(undefined)).toBe('process');
  });
});

describe('overBudget', () => {
  it('is false inside the budget', () => {
    expect(overBudget(1000, 1000 + PROCESS_BUDGET_MS - 1)).toBe(false);
  });
  it('is true once the budget is spent', () => {
    expect(overBudget(1000, 1000 + PROCESS_BUDGET_MS)).toBe(true);
  });
  it('respects a custom budget', () => {
    expect(overBudget(0, 500, 1000)).toBe(false);
    expect(overBudget(0, 1000, 1000)).toBe(true);
  });
});
