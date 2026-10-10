import type { CaseFile } from '../../../lib/content/cases';
import ART_PORTRAITS_OLDER_WOMAN from '../../../lib/content/crime-art/older_woman';
import ART_PORTRAITS_SCARF_WOMAN from '../../../lib/content/crime-art/scarf_woman';
import ART_PORTRAITS_SUIT_MAN from '../../../lib/content/crime-art/suit_man';
import ART_PORTRAITS_YOUNG_MAN from '../../../lib/content/crime-art/young_man';

/* ---------------- CASE 8 — hard, 11 clues ---------------- — split from cases.ts for transport; do not edit structure. */
const CASE_8: CaseFile = {
    id: 'the-clockmakers-last-tick',
    title: "The Clockmaker's Last Tick",
    difficulty: 'hard',
    location: "Zaveri's Clock Workshop",
    intro:
      'Master clockmaker Ghanshyam "Guru" Zaveri is found slumped over his workbench at 22:40, surrounded by a hundred ticking clocks. Aconite poisoning — absorbed through the skin around his right eye. His loupe is the only poisoned object in the shop. Four people knew his nightly ritual.',
    clues: [
      {
        id: 'cm-1',
        text: 'Guru died of aconite poisoning around 22:00 — absorbed through the skin around his right eye.',
        split: 'both',
        card: 'report',
        label: 'THE POISONING',
      },
      {
        id: 'cm-2',
        text: 'His loupe\'s eyecup tested positive for aconite paste — the only poisoned object in the entire shop.',
        split: 'a',
        card: 'report',
        label: 'THE LOUPE',
      },
      {
        id: 'cm-3',
        text: 'Guru\'s iron ritual: loupe inspection at 21:30 sharp, chai at 21:45. Everyone in the shop knew it by heart.',
        split: 'b',
        card: 'note',
        label: 'THE RITUAL',
      },
      {
        id: 'cm-4',
        text: 'The apprentice returned at 21:02 for forgotten tools; the bell log shows entry 21:02, exit 21:09. The paste was still tacky at 22:30 — applied between 21:30 and 22:00, after she left.',
        split: 'a',
        card: 'note',
        label: 'THE APPRENTICE',
      },
      {
        id: 'cm-5',
        text: 'The rival was at a dealers\' dinner 19:00–23:00 — twelve witnesses, plus a timestamped photo toasting at 21:05.',
        split: 'b',
        card: 'note',
        label: 'THE RIVAL',
      },
      {
        id: 'cm-6',
        text: 'Guru\'s 21:45 chai sat untouched and cold — he never got past the 21:30 loupe ritual.',
        split: 'both',
        card: 'note',
        label: 'THE CHAI',
      },
      {
        id: 'cm-7',
        text: 'The wife was at her sister\'s 19:00–22:30 — sister-confirmed, doorbell camera agrees.',
        split: 'a',
        card: 'note',
        label: 'THE WIFE',
      },
      {
        id: 'cm-8',
        text: 'The son\'s Pune train ticket — his whole alibi — is dated the day AFTER the murder. Fabricated.',
        split: 'b',
        card: 'report',
        label: 'THE TICKET',
      },
      {
        id: 'cm-9',
        text: 'Aconite grows wild behind the Zaveri family farmhouse, where the son grew up and still visits monthly.',
        split: 'a',
        card: 'note',
        label: 'THE ACONITE',
      },
      {
        id: 'cm-10',
        text: 'The workbench drawer where the loupe was kept had been wiped clean — only the drawer, not the surrounding tools.',
        split: 'both',
        card: 'report',
        label: 'THE DRAWER',
      },
      {
        id: 'cm-11',
        text: 'The son\'s fingerprints are on the wiped workbench drawer — though he claims he hasn\'t visited the shop in months.',
        split: 'b',
        card: 'report',
        label: 'THE PRINTS',
      },
    ],
    suspects: [
      {
        name: 'Priya Nair',
        motive: 'Apprentice. Guru refused to name her successor and threatened to blacklist her.',
        alibi: 'Left 18:00, back 21:02–21:09 for tools — bell-logged, before the paste was applied.',
        secret: 'Took a secret commission behind Guru\'s back — and he found out.',
        portrait: ART_PORTRAITS_SCARF_WOMAN,
        descriptor: 'FEMALE · 20s · APPRENTICE',
      },
      {
        name: 'Farhan Sheikh',
        motive: 'Rival clockmaker. Guru\'s forgery-case testimony destroyed his reputation.',
        alibi: 'Dealers\' dinner 19:00–23:00 — twelve witnesses, 21:05 photograph.',
        secret: 'Wrote Guru a threatening letter: "your hands will shake too, one day".',
        portrait: ART_PORTRAITS_SUIT_MAN,
        descriptor: 'MALE · 50s · RIVAL',
      },
      {
        name: 'Lata Zaveri',
        motive: 'Wife. The workshop\'s insurance and the house — but she loved him, by every account.',
        alibi: 'At her sister\'s 19:00–22:30 — sister + doorbell camera.',
        secret: 'Found her son\'s cigarette case in the workroom bin last week — said nothing.',
        portrait: ART_PORTRAITS_OLDER_WOMAN,
        descriptor: 'FEMALE · 60s · WIFE',
      },
      {
        name: 'Arjun Mehta',
        motive: 'Estranged son. Fought bitterly over selling the workshop to developers — the inheritance dies with a sale.',
        alibi: 'Claims he was in Pune — on a ticket dated the day after the murder.',
        secret: 'Still visits the family farmhouse monthly — where the aconite grows wild.',
        portrait: ART_PORTRAITS_YOUNG_MAN,
        descriptor: 'MALE · 20s · SON',
      },
    ],
    culprit: 'Arjun Mehta',
    solution:
      'Arjun Mehta\'s alibi is a ticket for the wrong day (cm-8); his fingerprints are on the wiped drawer he claims not to have touched in months (cm-11); aconite grows wild at the farmhouse he visits monthly (cm-9). The paste was applied 21:30–22:00 — after the apprentice\'s logged 21:09 exit (cm-4) — timed for the 21:30 loupe ritual the whole shop knew (cm-3); his untouched chai confirms he never got past it (cm-6). The rival was photographed toasting at 21:05 (cm-5), the wife on a doorbell camera (cm-7). A son who knew the ritual, the drawer, and the poison.',
};

export default CASE_8;
