import { describe, expect, it } from 'vitest';
import { PAGES } from './art';
import { createFills, filledCount, isComplete, setFill } from './logic';

describe('coloring', () => {
  it('starts empty and fills regions immutably', () => {
    const fills = createFills();
    const next = setFill(fills, 'crown', '#a03030');
    expect(fills['crown']).toBeUndefined();
    expect(next['crown']).toBe('#a03030');
  });

  it('isComplete only when every region is filled', () => {
    const page = PAGES[0]; // the fedora: 3 regions
    expect(page.regions.length).toBeGreaterThan(0);
    let fills = createFills();
    expect(isComplete(page, fills)).toBe(false);
    page.regions.forEach((r, i) => {
      fills = setFill(fills, r.id, '#e8a33d');
      expect(isComplete(page, fills)).toBe(i === page.regions.length - 1);
    });
    expect(filledCount(page, fills)).toBe(page.regions.length);
  });

  it('all four pages have regions and valid shapes', () => {
    expect(PAGES).toHaveLength(4);
    for (const p of PAGES) {
      expect(p.regions.length).toBeGreaterThanOrEqual(3);
      for (const r of p.regions) {
        expect(['path', 'circle', 'ellipse', 'rect']).toContain(r.kind);
      }
    }
  });
});
