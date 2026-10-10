import type { CaseFile } from '../../../lib/content/cases';
import ART_PORTRAITS_OLDER_WOMAN from '../../../lib/content/crime-art/older_woman';
import ART_PORTRAITS_SCARF_WOMAN from '../../../lib/content/crime-art/scarf_woman';
import ART_PORTRAITS_SUIT_MAN from '../../../lib/content/crime-art/suit_man';
import ART_PORTRAITS_WORKER_MAN from '../../../lib/content/crime-art/worker_man';

/* ---------------- CASE 4 — easy, 6 clues ---------------- — split from cases.ts for transport; do not edit structure. */
const CASE_4: CaseFile = {
    id: 'the-midnight-baker',
    title: 'The Midnight Baker',
    difficulty: 'easy',
    location: 'Crumb & Craft Bakery, MG Road',
    intro:
      '3:12 AM. "Crumb & Craft" bakery is a blackened shell. The fire brigade calls it arson — kerosene, poured by the flour storeroom. The owner swears it was an accident. Four people had keys to the back door. One of them wanted the building gone.',
    clues: [
      {
        id: 'mb-1',
        text: 'Kerosene traces by the flour storeroom — the fire was set deliberately, around 3:00 AM.',
        split: 'both',
        card: 'report',
        label: 'THE FIRE',
      },
      {
        id: 'mb-2',
        text: 'The fire insurance was doubled six weeks ago. Only the two partners could authorize it — and Sanna says she never signed.',
        split: 'a',
        card: 'note',
        label: 'THE INSURANCE',
      },
      {
        id: 'mb-3',
        text: 'Rahul claims he was at a 24-hour gym all night. His keycard shows no entry — the alibi is a lie.',
        split: 'b',
        card: 'note',
        label: 'THE GYM LIE',
      },
      {
        id: 'mb-4',
        text: 'Size-11 floury footprints lead from the storeroom to the back door. Rahul wears size 11; Asha wears size 6.',
        split: 'a',
        card: 'report',
        label: 'THE FOOTPRINTS',
      },
      {
        id: 'mb-5',
        text: 'The back-door deadbolt was locked from the inside after the fire started — someone locked up behind themselves, with a key.',
        split: 'b',
        card: 'note',
        label: 'THE DEADBOLT',
      },
      {
        id: 'mb-6',
        text: 'Asha\'s call-center supervisor confirms she was on live calls from 1:00 to 4:00 AM.',
        split: 'both',
        card: 'note',
        label: 'THE ALIBI',
      },
    ],
    suspects: [
      {
        name: 'Sanna Qureshi',
        motive: 'Head baker and co-owner. None — the bakery was her life\'s work.',
        alibi: 'Home asleep; husband confirms, phone never left the house.',
        secret: 'The ovens were due a safety refit she couldn\'t afford — she feared an inspection.',
        portrait: ART_PORTRAITS_OLDER_WOMAN,
        descriptor: 'FEMALE · 40s · HEAD BAKER',
      },
      {
        name: 'Rahul Mehta',
        motive: 'Business partner. Wanted to sell the building to developers for ₹4 crore; Sanna refused to sign.',
        alibi: 'Claims the 24-hour gym — keycard records say otherwise.',
        secret: 'His phone pings him two streets from the bakery at 2:40 AM.',
        portrait: ART_PORTRAITS_SUIT_MAN,
        descriptor: 'MALE · 40s · PARTNER',
      },
      {
        name: 'Asha Devi',
        motive: 'Ex-employee, fired last month after a shouting match; swore revenge.',
        alibi: 'Night shift at a call center — supervisor-confirmed, 1:00–4:00 AM.',
        secret: 'She never returned her spare back-door key.',
        portrait: ART_PORTRAITS_SCARF_WOMAN,
        descriptor: 'FEMALE · 30s · EX-EMPLOYEE',
      },
      {
        name: 'Kabir Anand',
        motive: 'Delivery driver. Sanna docked his pay twice — petty, hardly arson-sized.',
        alibi: 'On his delivery route; van GPS logs him across town at 3:00 AM.',
        secret: 'He naps in his van behind the bakery between runs — and heard nothing that night.',
        portrait: ART_PORTRAITS_WORKER_MAN,
        descriptor: 'MALE · 30s · DRIVER',
      },
    ],
    culprit: 'Rahul Mehta',
    solution:
      'Rahul Mehta doubled the insurance without Sanna\'s signature (mb-2), lied about the gym — no keycard entry (mb-3) — left size-11 footprints from the storeroom (mb-4), and locked the deadbolt behind him with his partner\'s key (mb-5). Asha has a supervisor-confirmed alibi (mb-6); Kabir\'s van was across town. A partner who wanted to sell, an insurance payout, and flour on his shoes.',
};

export default CASE_4;
