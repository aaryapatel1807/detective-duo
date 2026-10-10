import type { CaseFile } from '../../../lib/content/cases';
import ART_EVIDENCE_EMPTY_THEATER from '../../../lib/content/crime-art/empty_theater';
import ART_PORTRAITS_OLDER_WOMAN from '../../../lib/content/crime-art/older_woman';
import ART_PORTRAITS_SCARF_WOMAN from '../../../lib/content/crime-art/scarf_woman';
import ART_PORTRAITS_YOUNG_MAN from '../../../lib/content/crime-art/young_man';

/* ---------------- CASE 7 — hard, 10 clues ---------------- — split from cases.ts for transport; do not edit structure. */
const CASE_7: CaseFile = {
    id: 'the-masquerade-murder',
    title: 'The Masquerade Murder',
    cover: ART_EVIDENCE_EMPTY_THEATER,
    difficulty: 'hard',
    location: 'Raheja Masquerade Ball',
    intro:
      'Midnight at the Raheja masquerade ball. Industrialist Vikram Raheja raises his champagne for the toast — and never lowers it. Cyanide in the flute, and only his flute. Two hundred masked guests, four people with reason to want him quiet, and a killer who knew exactly which glass he would take.',
    clues: [
      {
        id: 'mm-1',
        text: 'Vikram died of cyanide in his champagne between 23:15 and 23:30. His was the only poisoned glass on the tray.',
        split: 'both',
        card: 'report',
        label: 'THE TOAST',
      },
      {
        id: 'mm-2',
        text: 'The poisoned flute had a small fresh chip on its base — the killer marked it. Cut within hours of the ball.',
        split: 'a',
        card: 'report',
        label: 'THE CHIP',
      },
      {
        id: 'mm-3',
        text: 'Vikram always took the leftmost flute from any tray — a habit everyone in the family knew.',
        split: 'b',
        card: 'note',
        label: 'THE HABIT',
      },
      {
        id: 'mm-4',
        text: 'The wife\'s dance partner confirms they danced 23:00–23:40 — but she slipped away to the champagne table alone at 23:05.',
        split: 'a',
        card: 'note',
        label: 'THE DANCE',
      },
      {
        id: 'mm-5',
        text: 'The son\'s terrace friends confirm him there 23:00–23:30, and his phone location agrees to the minute.',
        split: 'b',
        card: 'note',
        label: 'THE TERRACE',
      },
      {
        id: 'mm-6',
        text: 'The event planner\'s fireworks crew confirm she was on the east lawn from 22:50 until midnight — never came inside.',
        split: 'a',
        card: 'note',
        label: 'THE FIREWORKS',
      },
      {
        id: 'mm-7',
        text: 'The champagne was poured tableside — the head waiter confirms the toast tray was assembled at 23:10, AFTER the wife\'s 23:05 visit to the table.',
        split: 'b',
        card: 'note',
        label: 'THE TRAY',
      },
      {
        id: 'mm-8',
        text: 'The secretary stayed at the coat check all night, attendant-confirmed — and the spare mask in her bag is clean.',
        split: 'both',
        card: 'note',
        label: 'THE COAT CHECK',
      },
      {
        id: 'mm-9',
        text: 'A torn corner of the wife\'s masquerade invitation was found in the catering crate with the chipped flutes.',
        split: 'a',
        card: 'report',
        label: 'THE INVITATION',
      },
      {
        id: 'mm-10',
        text: 'The wife was seen at the catering setup at 16:00, "choosing the champagne" — hours before any guest arrived.',
        split: 'b',
        card: 'note',
        label: 'THE SETUP',
      },
    ],
    suspects: [
      {
        name: 'Anaya Raheja',
        motive: 'Wife. A divorce would leave her nothing; a widow inherits everything — and Vikram\'s lawyers were drafting papers.',
        alibi: 'Dancing 23:00–23:40 — except one slip to the champagne table at 23:05.',
        secret: 'Affair with the event planner — Vikram had hired a photographer to prove it.',
        portrait: ART_PORTRAITS_SCARF_WOMAN,
        descriptor: 'FEMALE · 40s · WIFE',
      },
      {
        name: 'Kabir Raheja',
        motive: 'Son. Cut out of the will last month after a blazing row.',
        alibi: 'Terrace with friends 23:00–23:30 — three witnesses plus phone location.',
        secret: 'Hired a PI to follow his father — the file is full of the affair.',
        portrait: ART_PORTRAITS_YOUNG_MAN,
        descriptor: 'MALE · 20s · SON',
      },
      {
        name: 'Saira Khan',
        motive: 'Event planner — and Anaya\'s lover. Vikram threatened to expose the affair and ruin her business.',
        alibi: 'Running midnight fireworks on the east lawn 22:50–midnight — crew confirms.',
        secret: 'The affair with Anaya — Vikram\'s leverage over both of them.',
        portrait: ART_PORTRAITS_OLDER_WOMAN,
        descriptor: 'FEMALE · 40s · PLANNER',
      },
      {
        name: 'Meera Krishnan',
        motive: 'Secretary. Discovered Vikram forging documents; was going to be fired Friday for "asking questions."',
        alibi: 'At the coat check all night — attendant confirms.',
        secret: 'Pocketed Vikram\'s spare "Raven" mask as a souvenir. It\'s clean.',
        portrait: ART_PORTRAITS_SCARF_WOMAN,
        descriptor: 'FEMALE · 30s · SECRETARY',
      },
    ],
    culprit: 'Anaya Raheja',
    solution:
      'Anaya Raheja marked a flute at the afternoon setup (her invitation corner in the chipped-flute crate — mm-9; seen "choosing the champagne" at 16:00 — mm-10), knew Vikram would take the leftmost glass — a family habit (mm-3) — and slipped the cyanide in during her 23:05 absence from the dance floor (mm-4), before the tray was assembled at 23:10 (mm-7). Kabir was on the terrace (mm-5), Saira on the east lawn (mm-6), Meera at coat check (mm-8) — every other suspect pinned to a witnessed alibi. A marked glass, a known habit, and five unwitnessed minutes.',
};

export default CASE_7;
