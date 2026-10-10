/* Three hand-authored heist maps, escalating difficulty.
 * Grid is 8x8; x = column 0..7 (left to right), y = row 0..7 (top to bottom).
 */
import type { HeistMap } from './types';

const xy = (x: number, y: number) => ({ x, y });

export const HEIST_MAPS: HeistMap[] = [
  {
    id: 'first-national',
    name: 'First National — Night Shift',
    blurb: 'A sleepy branch bank. One guard, one fixed camera, lazy lasers.',
    difficulty: 'Easy',
    width: 8,
    height: 8,
    walls: [xy(3, 2), xy(3, 3), xy(3, 4), xy(4, 4), xy(5, 4)],
    entry: xy(0, 7),
    vault: xy(7, 0),
    lasers: [
      { x: 2, y: 5, period: 6, offset: 0 },
      { x: 5, y: 1, period: 6, offset: 3 },
    ],
    cameras: [{ x: 7, y: 3, dir: 'W', range: 3, sweep: 0 }],
    guards: [{ name: 'Rook', route: [xy(1, 1), xy(2, 1), xy(3, 1), xy(3, 0)] }],
  },
  {
    id: 'meridian-gallery',
    name: 'The Meridian Gallery',
    blurb: 'Two guards, sweeping cameras, and a wall with exactly one gap.',
    difficulty: 'Medium',
    width: 8,
    height: 8,
    walls: [
      xy(3, 0), xy(3, 1), xy(3, 2), xy(3, 4), xy(3, 5),
      xy(4, 5), xy(5, 5),
    ],
    entry: xy(0, 7),
    vault: xy(7, 0),
    lasers: [
      { x: 1, y: 3, period: 4, offset: 0 },
      { x: 5, y: 2, period: 4, offset: 2 },
      { x: 6, y: 5, period: 5, offset: 1 },
    ],
    cameras: [
      { x: 4, y: 0, dir: 'S', range: 4, sweep: 0 },
      { x: 2, y: 6, dir: 'N', range: 3, sweep: 4 },
    ],
    guards: [
      { name: 'Rook', route: [xy(1, 1), xy(2, 1), xy(2, 2), xy(1, 2)] },
      { name: 'Vesper', route: [xy(5, 6), xy(6, 6), xy(6, 7), xy(5, 7)] },
    ],
  },
  {
    id: 'blackwood-casino',
    name: 'Blackwood Casino Vault',
    blurb: 'Three guards, twitchy lasers, rotating cameras. The big score.',
    difficulty: 'Hard',
    width: 8,
    height: 8,
    walls: [
      xy(2, 1), xy(2, 2), xy(2, 3), xy(2, 4),
      xy(4, 3), xy(4, 4), xy(4, 5), xy(4, 6),
      xy(5, 1), xy(6, 1), xy(1, 5), xy(2, 5),
    ],
    entry: xy(0, 7),
    vault: xy(7, 0),
    lasers: [
      { x: 3, y: 1, period: 3, offset: 0 },
      { x: 5, y: 3, period: 3, offset: 1 },
      { x: 6, y: 4, period: 4, offset: 2 },
      { x: 1, y: 6, period: 4, offset: 0 },
    ],
    cameras: [
      { x: 7, y: 2, dir: 'W', range: 4, sweep: 3 },
      { x: 3, y: 7, dir: 'N', range: 4, sweep: 0 },
      { x: 0, y: 0, dir: 'E', range: 3, sweep: 5 },
    ],
    guards: [
      { name: 'Rook', route: [xy(1, 0), xy(2, 0), xy(3, 0), xy(3, 1)] },
      { name: 'Hawk', route: [xy(0, 3), xy(1, 3), xy(1, 4), xy(0, 4)] },
      {
        name: 'Vesper',
        route: [xy(5, 5), xy(6, 5), xy(6, 6), xy(6, 7), xy(5, 7), xy(5, 6)],
      },
    ],
  },
];

export function getMap(id: string | undefined): HeistMap {
  return HEIST_MAPS.find((m) => m.id === id) ?? HEIST_MAPS[0];
}
