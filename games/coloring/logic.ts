/* Coloring fill-state helpers — pure, unit-testable. */

import type { ColoringPage } from './art';

/** regionId -> hex color */
export type Fills = Record<string, string>;

export function createFills(): Fills {
  return {};
}

export function setFill(fills: Fills, regionId: string, color: string): Fills {
  return { ...fills, [regionId]: color };
}

/** A page is finished when every region has a fill. */
export function isComplete(page: ColoringPage, fills: Fills): boolean {
  return page.regions.every((r) => fills[r.id] !== undefined && fills[r.id] !== '');
}

export function filledCount(page: ColoringPage, fills: Fills): number {
  return page.regions.filter((r) => fills[r.id]).length;
}
