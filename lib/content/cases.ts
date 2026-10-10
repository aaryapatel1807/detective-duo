/* Co-op Crime Mystery case bank.
 *
 * SCHEMA (documented in CONTRACT.md):
 *   CaseFile {
 *     id: string;                 // e.g. 'quiet-vault'
 *     title: string;
 *     difficulty: 'easy' | 'medium' | 'hard';
 *     intro: string;              // read aloud to both players
 *     location?: string;          // shown in the case panel
 *     cover?: string;             // noir cover art for the file picker
 *     clues: Clue[];              // asymmetric dealing
 *     suspects: Suspect[];
 *     culprit: string;            // must equal one suspect's name
 *     solution: string;           // revealed after the vote
 *   }
 *   Clue { id, text, split: 'a' | 'b' | 'both', card?, art?, label? }
 *     'a'    -> only player A sees it
 *     'b'    -> only player B sees it
 *     'both' -> both see it
 *     card: 'polaroid' | 'note' | 'report' — how it renders on the board
 *     art: evidence image path for polaroids
 *     label: short pin label for the board
 *   Suspect { name, motive, alibi, secret, portrait?, descriptor? }
 *
 * Fair-play rule: the culprit must be uniquely deducible from the UNION
 * of all clues + suspects. Splits force the talking; 'both' clues carry
 * the shared facts. Every case carries at least one red herring that the
 * clues themselves defuse.
 */

export type ClueSplit = 'a' | 'b' | 'both';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type ClueCard = 'polaroid' | 'note' | 'report';

export interface Clue {
  id: string;
  text: string;
  split: ClueSplit;
  /** board card style — defaults to 'note' */
  card?: ClueCard;
  /** evidence image for polaroids, e.g. '/crime-mystery/evidence/empty-theater.webp' */
  art?: string;
  /** short label pinned above the card */
  label?: string;
}

export interface Suspect {
  name: string;
  motive: string;
  alibi: string;
  secret: string;
  /** noir portrait, e.g. '/crime-mystery/portraits/trench-man.webp' */
  portrait?: string;
  /** one-line lineup descriptor, e.g. 'MALE · 35-45 YRS · TRENCH COAT' */
  descriptor?: string;
}

export interface CaseFile {
  id: string;
  title: string;
  difficulty: Difficulty;
  intro: string;
  location?: string;
  cover?: string;
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
    if (cl.card && !['polaroid', 'note', 'report'].includes(cl.card))
      errors.push(`clue ${cl.id}: bad card ${cl.card}`);
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
    title: 'The Empty Theater',
    difficulty: 'easy',
    location: 'The Grand Regal Theater',
    cover: '/crime-mystery/evidence/empty-theater.webp',
    intro:
      'The Grand Regal Theater, 11:20 PM. Minutes after the final curtain of "The Glass Key", owner Marcus Hale is found dead at the rear alley exit — a single blow to the head. The cast is still in costume. Four people stayed late. One of them is a killer.',
    clues: [
      {
        id: 'qv-1',
        text: 'A torn comp ticket — Section 12, Row C, issued in Victor Kane\'s name — was redeemed at 21:58. Victor swears he never came to the theater that night.',
        split: 'both',
        card: 'polaroid',
        art: '/crime-mystery/evidence/torn-ticket.webp',
        label: 'TORN THEATER TICKET',
      },
      {
        id: 'qv-2',
        text: 'Marcus Hale\'s wristwatch, smashed in the struggle, stopped at 23:12. The stage manager confirms the second act ended at 23:05 — the killer struck minutes after.',
        split: 'a',
        card: 'polaroid',
        art: '/crime-mystery/evidence/broken-watch.webp',
        label: 'BROKEN WATCH',
      },
      {
        id: 'qv-3',
        text: 'Blue wool fibers on the victim\'s coat match the ushers\' uniforms exactly. The head usher swears Tommy Riggs never left the lobby all night.',
        split: 'b',
        card: 'note',
        label: 'BLUE FABRIC FIBER',
      },
      {
        id: 'qv-4',
        text: 'A 22:40 cash receipt from the café across the street. The barista remembers a man in a trench coat buying black coffee — "in a terrible hurry."',
        split: 'a',
        card: 'polaroid',
        art: '/crime-mystery/evidence/coffee-receipt.webp',
        label: 'COFFEE SHOP RECEIPT',
      },
      {
        id: 'qv-5',
        text: 'Fresh gouges around the rear exit lock — clumsy, amateur work. The department\'s locksmith says a professional would never leave marks like these.',
        split: 'b',
        card: 'polaroid',
        art: '/crime-mystery/evidence/lockpick-marks.webp',
        label: 'LOCKPICK MARKS',
      },
      {
        id: 'qv-6',
        text: 'The victim\'s phone shows a 40-second call at 22:47 from an unknown number — a prepaid burner bought with cash that same afternoon.',
        split: 'both',
        card: 'note',
        label: 'PHONE CALL LOG',
      },
    ],
    suspects: [
      {
        name: 'Victor Kane',
        motive: 'Marcus\'s younger brother and co-owner. Owes Marcus ₹30 lakh from a failed restaurant — and Marcus was done waiting.',
        alibi: 'Claims he was home alone all evening, reading. No witness.',
        secret: 'Bought a prepaid burner phone with cash at 16:20 on the day of the murder.',
        portrait: '/crime-mystery/portraits/trench-man.webp',
        descriptor: 'MALE · 35-45 YRS · TRENCH COAT',
      },
      {
        name: 'Lena Voss',
        motive: 'Lead actress. Marcus was replacing her next season — she found out at dinner.',
        alibi: 'On stage from 21:00 to 23:05 — two hundred witnesses. VERIFIED.',
        secret: 'She was planning to quit anyway — a film offer in Mumbai.',
        portrait: '/crime-mystery/portraits/scarf-woman.webp',
        descriptor: 'FEMALE · 25-35 YRS · SCARF',
      },
      {
        name: 'Tommy Riggs',
        motive: 'Usher. Fired last month for pocketing tips; Marcus refused to rehire him.',
        alibi: 'Lobby CCTV shows him at his post 22:00–23:30.',
        secret: 'The head usher rehired him off the books that very night — he\'s terrified of being found out.',
        portrait: '/crime-mystery/portraits/beanie-man.webp',
        descriptor: 'MALE · 28-38 YRS · BEANIE',
      },
      {
        name: 'Sam Okafor',
        motive: 'Stagehand. Three months\' back pay owed — Marcus kept "forgetting."',
        alibi: 'With the stage crew striking the set until 23:30 — three crew confirm.',
        secret: 'Ex-con. Did two years for burglary — as a locksmith. He hates that everyone knows.',
        portrait: '/crime-mystery/portraits/flatcap-man.webp',
        descriptor: 'MALE · 40-50 YRS · FLAT CAP',
      },
    ],
    culprit: 'Victor Kane',
    solution:
      'Victor Kane\'s alibi collapses three ways: his comp ticket was redeemed at 21:58, a trench-coated man bought coffee across the street at 22:40, and a cash-bought burner made the 22:47 luring call. The smashed watch fixes the murder at ~23:12, minutes after the second act. The lockpick gouges are amateur staging — a pro like Sam would never — and Tommy\'s fiber is intermission contact; he never left the lobby on camera. Lena was on stage before two hundred witnesses. Only Victor lied about being there, only Victor had ₹30 lakh of motive, and only Victor needed Marcus silent about the debt.',
  },
  {
    id: 'midnight-express',
    title: 'Midnight Express',
    difficulty: 'medium',
    location: 'Deccan Express · Berth B-14',
    cover: '/crime-mystery/evidence/rainy-alley.webp',
    intro:
      'The 23:40 Deccan Express pulls into Vadodara with diamond merchant Seth Rustomji dead in berth B-14 — locked from the inside — and his briefcase of diamonds gone. The train never stopped between Surat and Vadodara. Four people shared that coach. One of them committed the perfect locked-room murder. It wasn\'t perfect.',
    clues: [
      {
        id: 'mx-1',
        text: 'Seth Rustomji, dead in berth B-14, locked from the inside. The doctor on board calls it cyanide — bitter almonds on his breath.',
        split: 'both',
        card: 'report',
        label: 'THE BODY',
      },
      {
        id: 'mx-2',
        text: 'The porter served Rustomji tea at 22:00. The conductor saw him alive and drinking it at 22:30 — so the tea wasn\'t poisoned.',
        split: 'a',
        card: 'note',
        label: 'THE TEA',
      },
      {
        id: 'mx-3',
        text: 'Cyanide residue lines the berth\'s ventilator grille. The poison drifted in as vapor through the vent — not through the tea.',
        split: 'b',
        card: 'report',
        label: 'THE VENT',
      },
      {
        id: 'mx-4',
        text: 'A silk scarf, monogrammed A.D., found stuffed inside the ventilator shaft — as if to block it, or to be found.',
        split: 'both',
        card: 'note',
        label: 'THE SCARF',
      },
      {
        id: 'mx-5',
        text: 'Dr. Sen\'s bag holds cyanide antidote kits. He spent 22:15 treating an asthma attack two berths down — witnessed by the patient\'s wife.',
        split: 'a',
        card: 'note',
        label: 'THE DOCTOR',
      },
      {
        id: 'mx-6',
        text: 'The conductor\'s master-key log shows the ventilator access panel opened at 22:15. Only the conductor carries that key.',
        split: 'b',
        card: 'report',
        label: 'THE ACCESS PANEL',
      },
      {
        id: 'mx-7',
        text: 'Ava D\'Souza was in the dining car 22:00–23:00 — the waiter and three passengers confirm. She never returned to the coach.',
        split: 'a',
        card: 'note',
        label: 'THE HEIRESS',
      },
      {
        id: 'mx-8',
        text: 'A thread on the ventilator screws matches the porter\'s uniform — but his work log shows he serviced that vent at 21:00, legitimately.',
        split: 'b',
        card: 'note',
        label: 'THE THREAD',
      },
    ],
    suspects: [
      {
        name: 'Ava D\'Souza',
        motive: 'Perfume heiress. Rustomji was about to expose her counterfeit diamond line.',
        alibi: 'Dining car 22:00–23:00 — waiter plus three passengers.',
        secret: 'Her monogrammed scarf was stolen from her berth that evening — she reported it to no one, afraid of scandal.',
        portrait: '/crime-mystery/portraits/scarf-woman.webp',
        descriptor: 'FEMALE · 30s · HEIRESS',
      },
      {
        name: 'Imran Qureshi',
        motive: 'Porter. Rustomji\'s company sacked his father — a small, old grudge.',
        alibi: 'Serving the next coach 22:00–23:00 — the attendant confirms.',
        secret: 'He pockets lost-and-found cash. Small thefts — never anything like this.',
        portrait: '/crime-mystery/portraits/young-man.webp',
        descriptor: 'MALE · 20s · PORTER',
      },
      {
        name: 'Dr. Arvind Sen',
        motive: 'Doctor. Rustomji\'s testimony once cost him a hospital post.',
        alibi: 'Treating an asthma attack at 22:15 — witnessed.',
        secret: 'He carries cyanide antidote because he once failed to save a poisoning victim. Guilt, not guilt.',
        portrait: '/crime-mystery/portraits/suit-man.webp',
        descriptor: 'MALE · 50s · DOCTOR',
      },
      {
        name: 'R. Yadav',
        motive: 'Conductor. Rustomji\'s freight company denied his injury claim — his pension died with the paperwork.',
        alibi: '"On rounds," he says — no one can place him 22:00–22:30.',
        secret: 'He lifted Ava\'s scarf from her berth at 21:30 — to plant it in the vent.',
        portrait: '/crime-mystery/portraits/worker-man.webp',
        descriptor: 'MALE · 40s · CONDUCTOR',
      },
    ],
    culprit: 'R. Yadav',
    solution:
      'The poison came through the vent as vapor (mx-3), and the vent panel was opened at 22:15 with the master key only the conductor carries (mx-6). The scarf was planted to frame Ava — but she sat in the dining car all evening (mx-7), and it had been stolen from her berth (secret). The porter\'s thread is innocent — logged maintenance at 21:00 (mx-8). The doctor was witnessed saving a life at 22:15 (mx-5), and the tea was drunk safely at 22:30 (mx-2), ruling the tea out entirely. Only Yadav had the key, the window, and a motive written in denied paperwork.',
  },
];

export function getCase(id: string): CaseFile | undefined {
  return CASES.find((c) => c.id === id);
}
