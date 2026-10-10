/* Logic Grids — 3 local puzzles (small 3x3 / 4x3).
 * Combined with the 2 imported from lib/content/logicGrids.ts → 5 total.
 * Schema: LogicGrid { id, title, setup, rows, cols, clues, solution }.
 * solution entries are "Row → Col" where Col exactly matches a cols[] label.
 */

import { LOGIC_GRIDS as SHARED_GRIDS, type LogicGrid } from '../../lib/content/logicGrids';

export type { LogicGrid };

export const LOCAL_GRIDS: LogicGrid[] = [
  {
    id: 'lgl-1',
    title: 'The Midnight Informants',
    setup:
      'Three couriers — Ash, Birch, and Cedar — each delivered a package (Letters, Ledger, Locket) to a different safehouse (North, East, West). Match courier → package → safehouse.',
    rows: ['Ash', 'Birch', 'Cedar'],
    cols: ['Letters/North', 'Ledger/East', 'Locket/West'],
    clues: [
      'Ash never carried the Locket.',
      'The Ledger went East.',
      'Cedar delivered to the North safehouse.',
      'Birch\'s package went West.',
    ],
    solution: [
      'Ash → Ledger → East',
      'Birch → Locket → West',
      'Cedar → Letters → North',
    ],
  },
  {
    id: 'lgl-2',
    title: 'The Getaway Cars',
    setup:
      'Three getaway drivers — Fox, Hawk, and Wolf — each drove a different car (Sedan, Coupe, Van) and fled down a different route (Bridge, Tunnel, Alley). Match driver → car → route.',
    rows: ['Fox', 'Hawk', 'Wolf'],
    cols: ['Sedan/Bridge', 'Coupe/Tunnel', 'Van/Alley'],
    clues: [
      'Fox did not take the Tunnel.',
      'The Van fled down the Alley.',
      'Hawk drove the Sedan.',
      'Wolf\'s route was the Bridge — but not in the Sedan.',
    ],
    solution: [
      'Fox → Van → Alley',
      'Hawk → Sedan → Tunnel',
      'Wolf → Coupe → Bridge',
    ],
  },
  {
    id: 'lgl-3',
    title: 'The Poisoned Chalices',
    setup:
      'Three tasters — Ada, Ben, and Cy — each sipped from a different chalice (Gold, Silver, Bronze) holding a different drink (Wine, Ale, Mead). One chalice was poisoned — find who drank what by elimination.',
    rows: ['Ada', 'Ben', 'Cy'],
    cols: ['Gold/Wine', 'Silver/Ale', 'Bronze/Mead'],
    clues: [
      'Ada did not drink from the Gold chalice.',
      'Ben drank Ale.',
      'The Mead was served in the Bronze chalice.',
      'Cy drank Wine.',
    ],
    solution: [
      'Ada → Bronze → Mead',
      'Ben → Silver → Ale',
      'Cy → Gold → Wine',
    ],
  },
];

export const ALL_GRIDS: LogicGrid[] = [...SHARED_GRIDS, ...LOCAL_GRIDS];

export function getGrid(id: string): LogicGrid | undefined {
  return ALL_GRIDS.find((g) => g.id === id);
}
