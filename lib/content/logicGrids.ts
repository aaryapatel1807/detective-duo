/* Logic grid puzzles (small, race-or-coop friendly).
 *
 * Schema: LogicGrid { id, title, setup, rows, cols, clues, solution }
 *  rows/cols: the two axes being matched (keep tiny: 3x3 or 4x4)
 *  clues: plain-language elimination clues
 *  solution: array of "row = col" pairings
 */

export interface LogicGrid {
  id: string;
  title: string;
  setup: string;
  rows: string[];
  cols: string[];
  clues: string[];
  solution: string[];
}

export const LOGIC_GRIDS: LogicGrid[] = [
  {
    id: 'lg-1',
    title: 'The Three Informants',
    setup:
      'Three informants — Viper, Ghost, and Lark — each left a tip in a different dead drop (Fountain, Library, Pier) on a different night (Friday, Saturday, Sunday). Match informant → drop → night.',
    rows: ['Viper', 'Ghost', 'Lark'],
    cols: ['Fountain/Friday', 'Library/Saturday', 'Pier/Sunday'],
    clues: [
      'Viper never uses the Fountain drop.',
      'The Saturday tip was left at the Library.',
      'Ghost\'s tip came the night after the Fountain drop was used.',
      'Lark\'s tip was left on Friday.',
    ],
    solution: [
      'Viper → Pier → Sunday',
      'Ghost → Library → Saturday',
      'Lark → Fountain → Friday',
    ],
  },
  {
    id: 'lg-2',
    title: 'Stolen Alibis',
    setup:
      'Three suspects — the Butler, the Cook, the Driver — were each in a different room (Study, Kitchen, Garage) at 9 PM, 10 PM, and 11 PM. Reconstruct who was where, when.',
    rows: ['Butler', 'Cook', 'Driver'],
    cols: ['Study/9PM', 'Kitchen/10PM', 'Garage/11PM'],
    clues: [
      'The Butler was in the Study, but not at 9 PM.',
      'The Cook was seen at 10 PM.',
      'Nobody was in the Garage at 9 PM.',
      'The Driver was in the Kitchen at some point.',
    ],
    solution: [
      'Butler → Study → 11PM',
      'Cook → Garage → 10PM',
      'Driver → Kitchen → 9PM',
    ],
  },
];
