/* Two hand-authored escape rooms.
 *
 * OFFICE chain: desk drawer (memo) -> bookshelf (certificate: 1951) ->
 * painting (reveals safe) -> safe [1951] -> exit key.
 * (Coat rack holds a confirming sticky note.)
 *
 * ARCHIVE chain: card catalog (12 drawers + index card) -> shelf (box 7
 * empty, "moved to strongbox") -> strongbox [0012] -> film reel ->
 * microfilm reader -> third drawer revealed -> exit key.
 */
import type { EscapeRoomDef } from './types';

export const ESCAPE_TIME_MS = 20 * 60 * 1000;

export const ESCAPE_ROOMS: EscapeRoomDef[] = [
  {
    id: 'office',
    title: 'The Detective Office',
    blurb: 'Locked in at midnight. The exit key is hidden somewhere in this office.',
    intro:
      'The door clicked shut behind you. Somewhere in this office is the exit key — and the old safe behind the founder\'s portrait has been waiting decades for someone clever.',
    timeMs: ESCAPE_TIME_MS,
    hotspots: [
      {
        id: 'drawer',
        name: 'Desk drawer',
        icon: '🗄️',
        desc: 'A mahogany desk drawer, slightly ajar. Inside: a torn memo in the boss\'s handwriting.',
        note: {
          id: 'memo',
          title: 'Torn memo',
          text: '"New protocol: the safe code is the year our FIRST CASE CLOSED. The framed certificate hangs where the boss keeps his books."',
        },
        pos: { x: 12, y: 58 },
      },
      {
        id: 'bookshelf',
        name: 'Bookshelf',
        icon: '📚',
        desc: 'Dusty case files — and a framed certificate hung with pride between the shelves.',
        note: {
          id: 'certificate',
          title: 'Framed certificate',
          text: '"BLACKWOOD & VANE DETECTIVE AGENCY — FIRST CASE CLOSED 1951."',
        },
        pos: { x: 78, y: 22 },
      },
      {
        id: 'coat',
        name: 'Coat rack',
        icon: '🧥',
        desc: 'A rain-damp trench coat. Something crinkles in the pocket.',
        note: {
          id: 'sticky',
          title: 'Sticky note',
          text: '"The code is NOT 1234. It\'s the year on the certificate, genius. — V."',
        },
        pos: { x: 88, y: 58 },
      },
      {
        id: 'painting',
        name: 'Painting',
        icon: '🖼️',
        desc: 'A stern portrait of the founder. It hangs crooked — as if swung aside recently…',
        reveals: ['safe'],
        pos: { x: 45, y: 14 },
      },
      {
        id: 'safe',
        name: 'Wall safe',
        icon: '🔐',
        desc: 'A cast-iron wall safe behind the portrait. Four digits, worn brass dial.',
        hidden: true,
        lock: { code: '1951', hint: 'The year the first case closed — check the certificate on the bookshelf.' },
        inside: { id: 'exit-key', name: 'Exit key', icon: '🗝️', exitKey: true },
        pos: { x: 45, y: 34 },
      },
      {
        id: 'door',
        name: 'Office door',
        icon: '🚪',
        desc: 'Locked from the outside. The exit key must be around here somewhere.',
        pos: { x: 5, y: 22 },
      },
    ],
  },
  {
    id: 'archive',
    title: 'The Archive',
    blurb: 'A basement of cold cases. Twelve drawers, one missing reel, one way out.',
    intro:
      'The archive door bolted behind you. Somewhere among the card catalogs and film cans is the exit key — and the microfilm reader hums like it knows something.',
    timeMs: ESCAPE_TIME_MS,
    hotspots: [
      {
        id: 'catalog',
        name: 'Card catalog',
        icon: '🗃️',
        desc: 'A cabinet of twelve narrow drawers, labeled A through Z.',
        note: {
          id: 'index-card',
          title: 'Index card (drawer M)',
          text: '"MIDNIGHT EXPRESS — shelf 3, box 7."',
        },
        pos: { x: 15, y: 30 },
      },
      {
        id: 'shelf',
        name: 'Storage shelf',
        icon: '📦',
        desc: 'Shelf 3. Box 7 sits empty.',
        note: {
          id: 'box-label',
          title: 'Box 7 label',
          text: '"Reel moved to the strongbox."',
        },
        pos: { x: 70, y: 35 },
      },
      {
        id: 'strongbox',
        name: 'Strongbox',
        icon: '🗝️',
        desc: 'A steel strongbox with a 4-digit combination lock.',
        lock: { code: '0012', hint: 'The number of drawers in the card catalog.' },
        inside: { id: 'reel', name: 'Film reel', icon: '🎞️' },
        pos: { x: 45, y: 62 },
      },
      {
        id: 'microfilm',
        name: 'Microfilm reader',
        icon: '📽️',
        desc: 'A humming microfilm reader. The take-up reel is empty.',
        requires: 'reel',
        requiresHint: 'The reader needs a film reel — box 7\'s reel was moved to the strongbox.',
        note: {
          id: 'projection',
          title: 'Projected frame',
          text: 'The projector flickers: "…the exit key is taped under the THIRD drawer of the card catalog…"',
        },
        reveals: ['drawer3'],
        pos: { x: 28, y: 66 },
      },
      {
        id: 'drawer3',
        name: 'Third catalog drawer',
        icon: '🗝️',
        desc: 'The third drawer of the card catalog. Something glints, taped underneath.',
        hidden: true,
        item: { id: 'exit-key', name: 'Exit key', icon: '🗝️', exitKey: true },
        pos: { x: 15, y: 52 },
      },
      {
        id: 'clock',
        name: 'Wall clock',
        icon: '🕰️',
        desc: 'Stopped at 11:47 — the night the archive flooded. Probably nothing. Probably.',
        pos: { x: 86, y: 12 },
      },
      {
        id: 'adoor',
        name: 'Archive door',
        icon: '🚪',
        desc: 'Bolted from the outside. The exit key must be around here somewhere.',
        pos: { x: 5, y: 62 },
      },
    ],
  },
];

export function getRoomDef(id: string | undefined): EscapeRoomDef {
  return ESCAPE_ROOMS.find((r) => r.id === id) ?? ESCAPE_ROOMS[0];
}
