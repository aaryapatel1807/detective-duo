import type { CaseFile } from '../../../lib/content/cases';
import ART_EVIDENCE_TORN_TICKET from '../../../lib/content/crime-art/torn_ticket';
import ART_PORTRAITS_OLDER_WOMAN from '../../../lib/content/crime-art/older_woman';
import ART_PORTRAITS_SCARF_WOMAN from '../../../lib/content/crime-art/scarf_woman';
import ART_PORTRAITS_SUIT_MAN from '../../../lib/content/crime-art/suit_man';
import ART_PORTRAITS_YOUNG_MAN from '../../../lib/content/crime-art/young_man';

/* ---------------- CASE 5 — medium, 7 clues ---------------- — split from cases.ts for transport; do not edit structure. */
const CASE_5: CaseFile = {
    id: 'the-poisoned-podcast',
    title: 'The Poisoned Podcast',
    cover: ART_EVIDENCE_TORN_TICKET,
    difficulty: 'medium',
    location: 'Night Frequency Studio',
    intro:
      'Riya Sen, host of the hit livestream "Night Frequency", collapses 40 minutes into the show — a fast-acting sedative in her water bottle. The studio was locked during broadcast; only four people were inside. The chat watched it happen live.',
    clues: [
      {
        id: 'pp-1',
        text: 'Riya collapsed 40 minutes into the livestream. The hospital found a fast-acting sedative — slipped into her water bottle.',
        split: 'both',
        card: 'report',
        label: 'THE COLLAPSE',
      },
      {
        id: 'pp-2',
        text: 'The control-room camera shows the producer refilling Riya\'s bottle during the ad break at the 25-minute mark.',
        split: 'a',
        card: 'note',
        label: 'THE REFILL',
      },
      {
        id: 'pp-3',
        text: 'The co-host never left his chair — stream video shows him on mic continuously from minute 0 to the collapse.',
        split: 'b',
        card: 'note',
        label: 'THE CO-HOST',
      },
      {
        id: 'pp-4',
        text: 'The sponsor was active in the live chat under his verified handle at the exact minute Riya drank.',
        split: 'a',
        card: 'note',
        label: 'THE SPONSOR',
      },
      {
        id: 'pp-5',
        text: 'The sedative is prescription-only. The producer\'s bag held an empty blister pack with her name on the pharmacy label.',
        split: 'b',
        card: 'report',
        label: 'THE PRESCRIPTION',
      },
      {
        id: 'pp-6',
        text: 'The ex\'s bookshop reading had 40+ attendees and a timestamped signed poster — she was across town all evening.',
        split: 'both',
        card: 'note',
        label: 'THE EX',
      },
      {
        id: 'pp-7',
        text: 'The bottle was Riya\'s own, brought from home — but its cap seal was already broken before the show. Only someone inside the studio could have opened it.',
        split: 'a',
        card: 'note',
        label: 'THE SEAL',
      },
    ],
    suspects: [
      {
        name: 'Dev Khanna',
        motive: 'Co-host. Riya was about to fire him; his contract had a brutal non-compete.',
        alibi: 'On mic the whole stream — visible on camera.',
        secret: 'He\'d already recorded a secret farewell episode.',
        portrait: ART_PORTRAITS_YOUNG_MAN,
        descriptor: 'MALE · 20s · CO-HOST',
      },
      {
        name: 'Nina Rao',
        motive: 'Producer. Riya took credit for her segments for two years; the network just offered Nina Riya\'s slot.',
        alibi: 'In the control room — on camera, refilling the bottle.',
        secret: 'Her sedative prescription is real — post-surgery. She "lost" half the strip last week.',
        portrait: ART_PORTRAITS_SCARF_WOMAN,
        descriptor: 'FEMALE · 30s · PRODUCER',
      },
      {
        name: 'Arjun Sethi',
        motive: 'Sponsor. Riya was going to expose his drink\'s fake clinical trials tomorrow.',
        alibi: 'Typing in live chat from his office — verified handle, IP-confirmed.',
        secret: 'He emailed Riya an hour before: "you\'ll regret this".',
        portrait: ART_PORTRAITS_SUIT_MAN,
        descriptor: 'MALE · 40s · SPONSOR',
      },
      {
        name: 'Tara Iyer',
        motive: 'Ex co-host. Bitter public split last year.',
        alibi: 'Bookshop reading across town — 40 witnesses, timestamped poster.',
        secret: 'She texted Riya "you\'ll regret this" last week — about the split.',
        portrait: ART_PORTRAITS_OLDER_WOMAN,
        descriptor: 'FEMALE · 40s · EX CO-HOST',
      },
    ],
    culprit: 'Nina Rao',
    solution:
      'Nina Rao is the only person with means, motive, and opportunity combined: caught on camera refilling the bottle at the 25-minute mark (pp-2), carrying her own prescription sedative (pp-5), about to inherit Riya\'s slot. Dev never left his chair (pp-3), Arjun was provably typing from his office (pp-4), Tara was across town (pp-6). The broken seal (pp-7) proves the poison went in inside the studio. The "helpful refill" during the ad break was the murder.',
};

export default CASE_5;
