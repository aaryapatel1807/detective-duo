import type { CaseFile } from '../../../lib/content/cases';
import ART_EVIDENCE_EMPTY_THEATER from '../../../lib/content/crime-art/empty_theater';
import ART_PORTRAITS_FLATCAP_MAN from '../../../lib/content/crime-art/flatcap_man';
import ART_PORTRAITS_SCARF_WOMAN from '../../../lib/content/crime-art/scarf_woman';
import ART_PORTRAITS_SUIT_MAN from '../../../lib/content/crime-art/suit_man';
import ART_PORTRAITS_WORKER_MAN from '../../../lib/content/crime-art/worker_man';

/* ---------------- CASE 9 — hard, 12 clues ---------------- — split from cases.ts for transport; do not edit structure. */
const CASE_9: CaseFile = {
    id: 'the-final-reel',
    title: 'The Final Reel',
    cover: ART_EVIDENCE_EMPTY_THEATER,
    difficulty: 'hard',
    location: 'Film City · Night Shoot',
    intro:
      'Night shoot, Film City. Director Vikram "Vicky" Malhotra insisted on doing his own stunt for the "authentic shot" — and the stunt wire snapped at 23:05, cut 80% through with a serrated blade. Four people wanted him gone. The wire was cut between the 21:00 safety check and the 23:00 call time.',
    clues: [
      {
        id: 'fr-1',
        text: 'The stunt wire was cut 80% through with a serrated blade; it snapped at 23:05 under the director\'s weight.',
        split: 'both',
        card: 'report',
        label: 'THE WIRE',
      },
      {
        id: 'fr-2',
        text: 'The stunt coordinator logged a safety inspection of rig A at 21:00 — "all clear". The cut was made between 21:30 and 22:30.',
        split: 'a',
        card: 'note',
        label: 'THE INSPECTION',
      },
      {
        id: 'fr-3',
        text: 'Only the stunt team carries serrated rigging knives, signed out per person — the coordinator\'s knife was signed out all day.',
        split: 'b',
        card: 'report',
        label: 'THE KNIFE',
      },
      {
        id: 'fr-4',
        text: 'The lead actress\'s trailer door camera shows her entering at 22:05 and not leaving until 23:10.',
        split: 'a',
        card: 'note',
        label: 'THE TRAILER',
      },
      {
        id: 'fr-5',
        text: 'The producer\'s LA call logs show one continuous studio call 22:30–23:15 — verified by the studio end.',
        split: 'b',
        card: 'note',
        label: 'THE CALL',
      },
      {
        id: 'fr-6',
        text: 'The cinematographer was at camera village 21:45–23:10 reviewing dailies — the DIT confirms, with timestamps.',
        split: 'both',
        card: 'note',
        label: 'THE DAILIES',
      },
      {
        id: 'fr-7',
        text: 'The call sheet sent the junior AD off-site for coffee at 22:15 — eleven witnesses at the café confirm she never returned before 23:00.',
        split: 'a',
        card: 'note',
        label: 'THE COFFEE RUN',
      },
      {
        id: 'fr-8',
        text: 'The coordinator told two crew he was "checking rig B" from 21:30 to 22:30 — but rig B\'s log shows no inspection entry that night.',
        split: 'b',
        card: 'note',
        label: 'THE LIE',
      },
      {
        id: 'fr-9',
        text: 'Metal shavings matching the cut wire were found in the cuff of the coordinator\'s jacket.',
        split: 'a',
        card: 'report',
        label: 'THE SHAVINGS',
      },
      {
        id: 'fr-10',
        text: 'The cut was made from above — the cutter stood on the lighting rig, which needs the stunt team\'s harness key. The deputy\'s key never left its locker; only the coordinator\'s was in play.',
        split: 'b',
        card: 'report',
        label: 'THE HARNESS KEY',
      },
      {
        id: 'fr-11',
        text: 'The unsigned replacement contract was still in Vicky\'s trailer — the lead actress had motive, but the door camera clears her.',
        split: 'both',
        card: 'note',
        label: 'THE CONTRACT',
      },
      {
        id: 'fr-12',
        text: 'The coordinator\'s brother died in a Vicky-film stunt accident six years ago; he kept the newspaper clipping in his kit — and his kit was open beside rig A at 23:00.',
        split: 'a',
        card: 'note',
        label: 'THE CLIPPING',
      },
    ],
    suspects: [
      {
        name: 'Rhea Kapoor',
        motive: 'Lead actress. Vicky was replacing her — the unsigned contract sat in his trailer.',
        alibi: 'In her trailer 22:05–23:10 — door camera.',
        secret: 'Hired a lawyer to break her contract — she was going to walk, not kill.',
        portrait: ART_PORTRAITS_SCARF_WOMAN,
        descriptor: 'FEMALE · 30s · ACTRESS',
      },
      {
        name: 'Karan Bedi',
        motive: 'Stunt coordinator. Vicky cut his safety budget and mocked him — and six years ago, Vicky\'s corner-cutting killed Karan\'s brother.',
        alibi: 'Claims he was checking rig B 21:30–22:30 — rig B\'s log shows no such inspection.',
        secret: 'He inspected rig A himself at 21:00 and logged "all clear" — the last hands on the wire.',
        portrait: ART_PORTRAITS_WORKER_MAN,
        descriptor: 'MALE · 40s · COORDINATOR',
      },
      {
        name: 'Sameer Joshi',
        motive: 'Producer. The film was catastrophically over budget; Vicky\'s death triggers the completion-bond insurance.',
        alibi: 'On a continuous studio call 22:30–23:15 — verified at both ends.',
        secret: 'Quietly doubled the production insurance three weeks ago.',
        portrait: ART_PORTRAITS_SUIT_MAN,
        descriptor: 'MALE · 50s · PRODUCER',
      },
      {
        name: 'Nikhil Rao',
        motive: 'Cinematographer. Vicky stole credit for his signature shot; screaming row that morning.',
        alibi: 'At camera village reviewing dailies 21:45–23:10 — DIT-confirmed.',
        secret: 'Told Vicky on set: "you\'ll pay for that." He meant at the awards.',
        portrait: ART_PORTRAITS_FLATCAP_MAN,
        descriptor: 'MALE · 40s · CINEMATOGRAPHER',
      },
    ],
    culprit: 'Karan Bedi',
    solution:
      'Karan Bedi is the only suspect who survives elimination: Rhea\'s door camera (fr-4), Sameer\'s verified call (fr-5), Nikhil\'s timestamped dailies (fr-6) clear the others. Karan\'s "rig B" alibi has no log entry (fr-8), wire shavings were in his cuff (fr-9), his rigging knife was signed out all day (fr-3), the cut came from above where only his harness key could go (fr-10), and his dead brother\'s clipping sat in his open kit beside rig A (fr-12). He logged the wire "all clear" at 21:00 (fr-2) — then made sure it wasn\'t.',
};

export default CASE_9;
