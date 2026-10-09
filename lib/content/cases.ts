/* Co-op Crime Mystery case bank.
 *
 * SCHEMA (documented in CONTRACT.md):
 *   CaseFile {
 *     id: string;                 // e.g. 'quiet-vault'
 *     title: string;
 *     difficulty: 'easy' | 'medium' | 'hard';
 *     intro: string;              // read aloud to both players
 *     clues: Clue[];              // asymmetric dealing
 *     suspects: Suspect[];
 *     culprit: string;            // must equal one suspect's name
 *     solution: string;           // revealed after the vote
 *   }
 *   Clue { id, text, split: 'a' | 'b' | 'both' }
 *     'a'    -> only player A sees it
 *     'b'    -> only player B sees it
 *     'both' -> both see it
 *   Suspect { name, motive, alibi, secret }
 *
 * Fair-play rule: the culprit must be uniquely deducible from the UNION
 * of all clues + suspects. Splits force the talking; 'both' clues carry
 * the shared facts.
 */

export type ClueSplit = 'a' | 'b' | 'both';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Clue {
  id: string;
  text: string;
  split: ClueSplit;
}

export interface Suspect {
  name: string;
  motive: string;
  alibi: string;
  secret: string;
}

export interface CaseFile {
  id: string;
  title: string;
  difficulty: Difficulty;
  intro: string;
  clues: Clue[];
  suspects: Suspect[];
  culprit: string;
  solution: string;
}

/** Returns a list of schema violations (empty = valid). */
export function validateCaseFile(c: CaseFile): string[] {
  const errors: string[] = [];
  if (!c.id) errors.push('missing id');
  if (!c.title) errors.push('missing title');
  if (!['easy', 'medium', 'hard'].includes(c.difficulty))
    errors.push(`bad difficulty: ${c.difficulty}`);
  if (!c.intro) errors.push('missing intro');
  if (!c.solution) errors.push('missing solution');
  if (!c.clues?.length) errors.push('no clues');
  for (const cl of c.clues ?? []) {
    if (!['a', 'b', 'both'].includes(cl.split))
      errors.push(`clue ${cl.id}: bad split ${cl.split}`);
    if (!cl.text) errors.push(`clue ${cl.id}: empty text`);
  }
  const ids = (c.clues ?? []).map((cl) => cl.id);
  if (new Set(ids).size !== ids.length) errors.push('duplicate clue ids');
  if (!c.suspects?.length) errors.push('no suspects');
  for (const s of c.suspects ?? []) {
    if (!s.name || !s.motive || !s.alibi || !s.secret)
      errors.push(`suspect ${s.name || '?'}: missing motive/alibi/secret`);
  }
  if (!(c.suspects ?? []).some((s) => s.name === c.culprit))
    errors.push(`culprit "${c.culprit}" is not a suspect`);
  const aCount = (c.clues ?? []).filter((cl) => cl.split === 'a').length;
  const bCount = (c.clues ?? []).filter((cl) => cl.split === 'b').length;
  if (aCount === 0 || bCount === 0)
    errors.push('needs at least one a-only and one b-only clue for asymmetric dealing');
  return errors;
}

/** Clues visible to one side: own split + 'both'. */
export function cluesFor(c: CaseFile, side: 'a' | 'b'): Clue[] {
  return c.clues.filter((cl) => cl.split === side || cl.split === 'both');
}

export const CASES: CaseFile[] = [
  {
    id: 'quiet-vault',
    title: 'The Quiet Vault',
    difficulty: 'easy',
    intro:
      'Meridian Bank, 8:04 AM. The night vault stands open, the alarm never sounded, and ₹40 lakh in old notes is gone. Three people had the vault room key that night. Nobody forced the door.',
    clues: [
      {
        id: 'qv-1',
        text: 'The vault door shows no scratches or tool marks — it was opened with the correct 6-digit code.',
        split: 'both',
      },
      {
        id: 'qv-2',
        text: 'The security log shows the vault opened at 2:47 AM and closed at 2:53 AM — six minutes total.',
        split: 'a',
      },
      {
        id: 'qv-3',
        text: 'A half-eaten sandwich from "Midnight Bites" (closes 1 AM) was found on the vault room table.',
        split: 'b',
      },
      {
        id: 'qv-4',
        text: 'The code is changed weekly; only the branch manager knew this week\'s code.',
        split: 'a',
      },
      {
        id: 'qv-5',
        text: 'The IT technician\'s laptop has a keylogger report dated last month — it captured keystrokes on the manager\'s office PC.',
        split: 'b',
      },
      {
        id: 'qv-6',
        text: 'The cleaner\'s shift ended at midnight; the biometric log shows she left the building at 12:03 AM and never re-entered.',
        split: 'both',
      },
    ],
    suspects: [
      {
        name: 'Rhea Malhotra',
        motive: 'Branch manager; drowning in gambling debt, but she reported the theft herself.',
        alibi: 'Home asleep, confirmed by her spouse and phone location.',
        secret: 'She wrote the new vault code on a sticky note under her keyboard last Monday.',
      },
      {
        name: 'Devang Shah',
        motive: 'IT technician; was passed over for a promotion twice this year.',
        alibi: 'Claims he was home gaming; no one can confirm.',
        secret: 'He installed the "keylogger report" tool himself during a routine maintenance visit.',
      },
      {
        name: 'Meera Bai',
        motive: 'Night cleaner; her son needs an expensive surgery.',
        alibi: 'Biometric log proves she left at 12:03 AM.',
        secret: 'She saw the sticky note once but cannot read English numerals.',
      },
    ],
    culprit: 'Devang Shah',
    solution:
      'Devang Shah captured the vault code with his own keylogger on the manager\'s PC, entered at 2:47 AM, and bought a sandwich before the shop closed at 1 AM — proving he was near the bank all night. Six quiet minutes, no force, no alarm. The sticky note was a red herring; the code came through the keyboard.',
  },
  {
    id: 'midnight-express',
    title: 'Midnight Express',
    difficulty: 'medium',
    intro:
      'The 23:40 Deccan Queen pulls into Vadodara with a dead man in berth B-14 and a missing briefcase of diamonds. The train never stopped between Surat and Vadodara. Four people shared that coach — one of them is a killer.',
    clues: [
      {
        id: 'mx-1',
        text: 'The victim, Seth Rustomji, was poisoned — bitter-almond smell on the glass of water by his berth.',
        split: 'both',
      },
      {
        id: 'mx-2',
        text: 'The berth B-14 water glass has TWO sets of prints: the victim\'s and the ticket collector\'s.',
        split: 'a',
      },
      {
        id: 'mx-3',
        text: 'A torn half of a first-class ticket (Surat → Vadodara) was found in the victim\'s shoe.',
        split: 'b',
      },
      {
        id: 'mx-4',
        text: 'The diamond briefcase is gone, but a single loose diamond was caught in the coach door seal.',
        split: 'both',
      },
      {
        id: 'mx-5',
        text: 'The perfume heiress\'s bag contains a prescription for heart medicine — digitalis, which smells of bitter almonds in overdose.',
        split: 'a',
      },
      {
        id: 'mx-6',
        text: 'The ticket collector\'s punch log shows he checked berth B-14 at 23:05 — and again at 00:20, off his route.',
        split: 'b',
      },
      {
        id: 'mx-7',
        text: 'The retired colonel\'s flask is full of untouched whisky; he claims he never left his berth.',
        split: 'a',
      },
      {
        id: 'mx-8',
        text: 'The torn ticket half in the shoe matches the stub the "diamond courier" flashed at Surat — he was never booked on this coach.',
        split: 'b',
      },
    ],
    suspects: [
      {
        name: 'Ava D\'Souza',
        motive: 'Perfume heiress; Rustomji was about to expose her counterfeit diamond line.',
        alibi: 'In the dining car from 23:00 to 00:30, vouched by the waiter.',
        secret: 'Her digitalis prescription is real — she takes it daily and would never waste it.',
      },
      {
        name: 'Col. Arjun Rathore (retd.)',
        motive: 'Old army friend of the victim; owed ₹10 lakh he could never repay.',
        alibi: 'Claims he slept the whole way; no witness.',
        secret: 'His flask is full because he quit drinking a year ago — the "whisky" alibi is staged.',
      },
      {
        name: 'Imran Qureshi',
        motive: 'Ticket collector; his brother\'s shop was ruined by Rustomji\'s loan terms.',
        alibi: 'On duty, checking tickets — but twice at B-14, once off-route.',
        secret: 'He carried the water glass to B-14 at the victim\'s request at 23:05.',
      },
      {
        name: 'Kabir "K" Anand',
        motive: 'Self-styled diamond courier; the diamonds were his consignment — now they\'re his retirement.',
        alibi: 'Says he boarded at Surat with a valid ticket; the coach manifest disagrees.',
        secret: 'He slipped into the coach at Surat during the crowd and hid in the lavatory until midnight.',
      },
    ],
    culprit: 'Kabir "K" Anand',
    solution:
      'Kabir boarded ticketless at Surat and hid until the coach slept. He poisoned Rustomji\'s water with digitalis stolen from Ava\'s bag during dinner, took the briefcase, and lost one diamond in the door seal on his way out at Vadodara. The torn ticket half in the victim\'s shoe was Kabir\'s — Rustomji caught him and pocketed it as leverage before he died.',
  },
];

export function getCase(id: string): CaseFile | undefined {
  return CASES.find((c) => c.id === id);
}
