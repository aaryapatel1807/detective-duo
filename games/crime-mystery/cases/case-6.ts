import type { CaseFile } from '../../../lib/content/cases';
import ART_EVIDENCE_RAINY_ALLEY from '../../../lib/content/crime-art/rainy_alley';
import ART_PORTRAITS_BEANIE_MAN from '../../../lib/content/crime-art/beanie_man';
import ART_PORTRAITS_FLATCAP_MAN from '../../../lib/content/crime-art/flatcap_man';
import ART_PORTRAITS_OLDER_WOMAN from '../../../lib/content/crime-art/older_woman';
import ART_PORTRAITS_SCARF_WOMAN from '../../../lib/content/crime-art/scarf_woman';

/* ---------------- CASE 6 — medium, 8 clues ---------------- — split from cases.ts for transport; do not edit structure. */
const CASE_6: CaseFile = {
    id: 'the-lighthouse-keeper',
    title: 'The Lighthouse Keeper',
    cover: ART_EVIDENCE_RAINY_ALLEY,
    difficulty: 'medium',
    location: 'Blackrock Island Lighthouse',
    intro:
      'Dawn on Blackrock Island. Old keeper Elias Vane is found at the foot of the lighthouse stairs, neck broken. A storm raged from 23:00 to 04:00 — no boat could land after midnight. Four people were on the island. The stairs don\'t lie, but people do.',
    clues: [
      {
        id: 'lh-1',
        text: 'Elias died in a fall down the lighthouse stairs. The storm raged 23:00–04:00 — no boat could land after midnight.',
        split: 'both',
        card: 'report',
        label: 'THE FALL',
      },
      {
        id: 'lh-2',
        text: 'The lamp-room log shows entries in the assistant\'s handwriting until 02:00 — yet she claims she slept in her cottage from midnight.',
        split: 'a',
        card: 'note',
        label: 'THE LOG',
      },
      {
        id: 'lh-3',
        text: 'The ornithologist\'s time-lapse shows the lamp room empty 01:00–03:00 — and a figure on the gallery stairs at 02:10.',
        split: 'b',
        card: 'report',
        label: 'THE TIME-LAPSE',
      },
      {
        id: 'lh-4',
        text: 'The captain\'s deckhand — his own nephew — admits he was below deck asleep 01:00–04:00. The captain\'s alibi has a three-hour hole.',
        split: 'a',
        card: 'note',
        label: 'THE NEPHEW',
      },
      {
        id: 'lh-5',
        text: 'The estranged son\'s rowboat was found swamped on the far beach — he rowed over and left before the storm peaked, ~23:30.',
        split: 'b',
        card: 'note',
        label: 'THE ROWBOAT',
      },
      {
        id: 'lh-6',
        text: 'Elias\'s oilskin coat hung dry in the lamp room — he never went out into the storm that night.',
        split: 'both',
        card: 'note',
        label: 'THE COAT',
      },
      {
        id: 'lh-7',
        text: 'A woman\'s hair ribbon — the assistant wears one every day — snagged on the stair rail at the top of the fatal flight.',
        split: 'a',
        card: 'report',
        label: 'THE RIBBON',
      },
      {
        id: 'lh-8',
        text: 'The "birdseed" crates held untaxed liquor — the captain\'s smuggling secret — but the customs seals were intact: never opened that night.',
        split: 'b',
        card: 'note',
        label: 'THE CRATES',
      },
    ],
    suspects: [
      {
        name: 'Mara Voss',
        motive: 'Assistant keeper. Skimming supply money for a year; Elias had found the shortfall and was going to report her.',
        alibi: 'Claims she slept in her cottage from midnight — the lamp log disagrees.',
        secret: 'The "midnight relief" log entries are in her handwriting, not Elias\'s.',
        portrait: ART_PORTRAITS_SCARF_WOMAN,
        descriptor: 'FEMALE · 30s · ASSISTANT',
      },
      {
        name: 'Capt. Henrik Dahl',
        motive: 'Supply-boat captain. Elias threatened to report his liquor smuggling.',
        alibi: 'On his anchored boat — but his only witness slept 01:00–04:00.',
        secret: 'The "birdseed" crates are untaxed liquor.',
        portrait: ART_PORTRAITS_FLATCAP_MAN,
        descriptor: 'MALE · 50s · CAPTAIN',
      },
      {
        name: 'Dr. Lena Petrova',
        motive: 'Ornithologist. None — she argued with Elias about the light disturbing terns, once, loudly.',
        alibi: 'In her cottage; field notes timestamped hourly.',
        secret: 'Her time-lapse photographed the lighthouse all night — she didn\'t realize what it caught.',
        portrait: ART_PORTRAITS_OLDER_WOMAN,
        descriptor: 'FEMALE · 40s · ORNITHOLOGIST',
      },
      {
        name: 'Jonas Pike',
        motive: 'Elias\'s estranged son. Stood to inherit the keeper\'s cottage and land.',
        alibi: 'Claims he never came — his swamped rowboat says otherwise.',
        secret: 'He rowed over to reconcile; they argued, and he left before the storm peaked.',
        portrait: ART_PORTRAITS_BEANIE_MAN,
        descriptor: 'MALE · 20s · SON',
      },
    ],
    culprit: 'Mara Voss',
    solution:
      'Mara Voss lied about sleeping — her handwriting fills the lamp log until 02:00 (lh-2), her daily ribbon snagged at the top of the fatal stairs (lh-7), and the time-lapse caught a figure there at 02:10 while the lamp room stood empty (lh-3). Jonas left before the storm peaked (lh-5); the captain\'s crates stayed sealed (lh-8). Elias confronted her about the skimmed money — and she pushed him down the stairs she tended.',
};

export default CASE_6;
