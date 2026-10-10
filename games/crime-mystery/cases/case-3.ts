import type { CaseFile } from '../../../lib/content/cases';
import ART_PORTRAITS_BEANIE_MAN from '../../../lib/content/crime-art/beanie_man';
import ART_PORTRAITS_OLDER_WOMAN from '../../../lib/content/crime-art/older_woman';
import ART_PORTRAITS_SCARF_WOMAN from '../../../lib/content/crime-art/scarf_woman';
import ART_PORTRAITS_YOUNG_MAN from '../../../lib/content/crime-art/young_man';

/* ---------------- CASE 3 — easy, 5 clues ---------------- — split from cases.ts for transport; do not edit structure. */
const CASE_3: CaseFile = {
    id: 'the-painted-alibi',
    title: 'The Painted Alibi',
    difficulty: 'easy',
    location: 'Kala Ghoda Gallery',
    intro:
      'Kala Ghoda Gallery, 11:40 PM. At the closing of the winter gala, Marco Reyes\' "Monsoon Bride" — insured for ₹2 crore — is gone from the east wall. No alarms, no broken glass, no forced entry. Four people stayed late. One of them carried a ₹2 crore canvas out of the loading dock.',
    clues: [
      {
        id: 'pa-1',
        text: 'No forced entry anywhere — the loading-dock door was opened with the correct keypad code.',
        split: 'both',
        card: 'note',
        label: 'NO FORCED ENTRY',
      },
      {
        id: 'pa-2',
        text: 'The dock code was changed that very morning. Only the curator received the new code — she told no one.',
        split: 'a',
        card: 'report',
        label: 'THE NEW CODE',
      },
      {
        id: 'pa-3',
        text: 'A wine glass with fresh lipstick abandoned on the loading dock. The artist never wears makeup — and the donor left the gala at 20:00, her driver confirms.',
        split: 'b',
        card: 'note',
        label: 'THE WINE GLASS',
      },
      {
        id: 'pa-4',
        text: 'The cameras went dark 21:10–21:25. The guard\'s log reads "all clear, 21:15" — written from the monitor room, where he was found asleep.',
        split: 'a',
        card: 'note',
        label: 'THE DARK CAMERAS',
      },
      {
        id: 'pa-5',
        text: 'Cadmium-red flakes — the stolen painting\'s signature pigment — found on the curator\'s gala shoes.',
        split: 'b',
        card: 'report',
        label: 'THE PAINT FLAKES',
      },
    ],
    suspects: [
      {
        name: 'Vera Kaur',
        motive: 'Curator. Quietly drowning in gambling debt; the insurance paperwork was already on her desk.',
        alibi: 'In her office doing inventory 21:00–21:30 — no witness.',
        secret: 'She changed the dock code herself that morning and told no one the new number.',
        portrait: ART_PORTRAITS_OLDER_WOMAN,
        descriptor: 'FEMALE · 50s · CURATOR',
      },
      {
        name: 'Marco Reyes',
        motive: 'The artist. Furious the gallery won\'t return his early works; once threatened to "take back what\'s mine."',
        alibi: 'At the bar with patrons 21:00–22:00 — a dozen witnesses.',
        secret: 'He never learned the dock code, old or new.',
        portrait: ART_PORTRAITS_YOUNG_MAN,
        descriptor: 'MALE · 20s · ARTIST',
      },
      {
        name: 'Tommy Briggs',
        motive: 'Night guard. Three months behind on rent; the gallery just cut his overtime.',
        alibi: 'Logged "all clear" at 21:15 — from the monitor room, where he was napping.',
        secret: 'He disabled the camera loop himself to nap in peace — then lied about it.',
        portrait: ART_PORTRAITS_BEANIE_MAN,
        descriptor: 'MALE · 30s · GUARD',
      },
      {
        name: 'Helena Voss',
        motive: 'Wealthy donor. None anyone can find — she adored the painting.',
        alibi: 'Left at 20:00; driver and valet confirm.',
        secret: 'She\'s been quietly buying Marco\'s early works for years.',
        portrait: ART_PORTRAITS_SCARF_WOMAN,
        descriptor: 'FEMALE · 60s · DONOR',
      },
    ],
    culprit: 'Vera Kaur',
    solution:
      'Vera Kaur is the only person who knew the new dock code — changed that morning, told to no one (pa-2). The lipstick glass on the dock is hers: Marco never wears makeup, Helena left at 20:00 (pa-3). Cadmium-red flakes from the stolen canvas were on her gala shoes (pa-5). Tommy\'s camera blackout was a napping guard\'s cover-up, not a conspiracy (pa-4). Means, opportunity, and paint on her shoes.',
};

export default CASE_3;
