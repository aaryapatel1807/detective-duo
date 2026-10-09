/* Coloring pages — hand-authored noir line art.
 * Game-specific content (lives in the game folder per REGISTRATION.md).
 * Each page is a set of fillable regions + non-fillable stroke details.
 */

export type ShapeKind = 'path' | 'circle' | 'ellipse' | 'rect';

export interface ArtRegion {
  id: string;
  label: string;
  kind: ShapeKind;
  attrs: Record<string, string | number>;
}

export interface ArtDecor {
  kind: ShapeKind;
  attrs: Record<string, string | number>;
}

export interface ColoringPage {
  id: string;
  title: string;
  icon: string;
  regions: ArtRegion[];
  decor: ArtDecor[];
}

/** Noir palette. */
export const PALETTE: { name: string; hex: string }[] = [
  { name: 'Blood', hex: '#a03030' },
  { name: 'Amber', hex: '#e8a33d' },
  { name: 'Brass', hex: '#b98a2f' },
  { name: 'Manila', hex: '#d9c9a3' },
  { name: 'Charcoal', hex: '#3a3a44' },
  { name: 'Fog', hex: '#8b93a0' },
  { name: 'Steel', hex: '#3d5a80' },
  { name: 'Moss', hex: '#4a6741' },
];

export const PAGES: ColoringPage[] = [
  {
    id: 'hat',
    title: 'The Fedora',
    icon: '🎩',
    regions: [
      {
        id: 'crown',
        label: 'Crown',
        kind: 'path',
        attrs: { d: 'M64 146 L72 84 Q76 64 100 64 Q124 64 128 84 L136 146 Z' },
      },
      {
        id: 'band',
        label: 'Band',
        kind: 'path',
        attrs: { d: 'M68 118 L132 118 L134 132 L66 132 Z' },
      },
      {
        id: 'brim',
        label: 'Brim',
        kind: 'ellipse',
        attrs: { cx: 100, cy: 150, rx: 74, ry: 17 },
      },
    ],
    decor: [
      { kind: 'path', attrs: { d: 'M72 84 Q76 64 100 64', fill: 'none' } },
      { kind: 'circle', attrs: { cx: 126, cy: 98, r: 4, fill: 'none' } },
    ],
  },
  {
    id: 'magnifier',
    title: 'The Magnifier',
    icon: '🔍',
    regions: [
      {
        id: 'rim',
        label: 'Rim',
        kind: 'circle',
        attrs: { cx: 86, cy: 86, r: 48 },
      },
      {
        id: 'lens',
        label: 'Lens',
        kind: 'circle',
        attrs: { cx: 86, cy: 86, r: 36 },
      },
      {
        id: 'handle',
        label: 'Handle',
        kind: 'path',
        attrs: { d: 'M118 118 L134 106 L172 144 L160 160 Z' },
      },
    ],
    decor: [{ kind: 'path', attrs: { d: 'M62 72 Q70 60 88 58', fill: 'none' } }],
  },
  {
    id: 'skyline',
    title: 'The Skyline',
    icon: '🌃',
    regions: [
      { id: 'moon', label: 'Moon', kind: 'circle', attrs: { cx: 162, cy: 38, r: 16 } },
      { id: 'b1', label: 'Building 1', kind: 'rect', attrs: { x: 18, y: 108, width: 30, height: 72 } },
      { id: 'b2', label: 'Building 2', kind: 'rect', attrs: { x: 54, y: 76, width: 36, height: 104 } },
      { id: 'b3', label: 'Building 3', kind: 'rect', attrs: { x: 96, y: 118, width: 28, height: 62 } },
      { id: 'b4', label: 'Building 4', kind: 'rect', attrs: { x: 130, y: 88, width: 34, height: 92 } },
      { id: 'w1', label: 'Window', kind: 'rect', attrs: { x: 60, y: 88, width: 8, height: 10 } },
      { id: 'w2', label: 'Window', kind: 'rect', attrs: { x: 74, y: 88, width: 8, height: 10 } },
      { id: 'w3', label: 'Window', kind: 'rect', attrs: { x: 60, y: 106, width: 8, height: 10 } },
      { id: 'w4', label: 'Window', kind: 'rect', attrs: { x: 136, y: 100, width: 8, height: 10 } },
      { id: 'w5', label: 'Window', kind: 'rect', attrs: { x: 150, y: 100, width: 8, height: 10 } },
      { id: 'w6', label: 'Window', kind: 'rect', attrs: { x: 24, y: 120, width: 8, height: 10 } },
    ],
    decor: [
      { kind: 'path', attrs: { d: 'M10 180 L190 180', fill: 'none' } },
      { kind: 'path', attrs: { d: 'M72 76 L72 58', fill: 'none' } },
    ],
  },
  {
    id: 'rose',
    title: 'The Rose',
    icon: '🌹',
    regions: [
      {
        id: 'petals',
        label: 'Petals',
        kind: 'path',
        attrs: {
          d: 'M100 36 C132 36 148 62 142 94 C137 122 118 136 100 136 C82 136 63 122 58 94 C52 62 68 36 100 36 Z',
        },
      },
      {
        id: 'inner',
        label: 'Inner petals',
        kind: 'path',
        attrs: {
          d: 'M100 58 C120 58 132 74 128 94 C124 112 112 122 100 122 C88 122 76 112 72 94 C68 74 80 58 100 58 Z',
        },
      },
      { id: 'bud', label: 'Bud', kind: 'circle', attrs: { cx: 100, cy: 90, r: 9 } },
      {
        id: 'stem',
        label: 'Stem',
        kind: 'path',
        attrs: { d: 'M96 136 C96 156 94 168 90 186 L100 186 C103 168 104 156 104 136 Z' },
      },
      {
        id: 'leaf1',
        label: 'Leaf',
        kind: 'path',
        attrs: { d: 'M96 156 C78 150 64 154 56 168 C72 172 90 166 96 156 Z' },
      },
      {
        id: 'leaf2',
        label: 'Leaf',
        kind: 'path',
        attrs: { d: 'M104 168 C122 162 136 166 144 180 C128 184 110 178 104 168 Z' },
      },
    ],
    decor: [],
  },
];
