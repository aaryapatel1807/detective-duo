/**
 * Spot the Liar banks (Duo Corner).
 *
 * Together mode: one player writes three statements about themselves
 * (two true, one false) and marks the lie in secret; the other asks up
 * to three yes/no questions, then picks the lie. PROMPTS keep the round
 * from ever feeling blank.
 *
 * Solo mode: the bot presents three statements about a made-up suspect
 * next to that suspect's case notes. Exactly one statement contradicts
 * a note — that is the lie. Higher levels show more notes to cross-check.
 */

import { rngFromSeed, shuffle } from './rng';

export const LIAR_PROMPTS: string[] = [
  'A place I have hidden something',
  'The bravest thing I have done',
  'A food I secretly dislike',
  'My most embarrassing school memory',
  'A skill I pretend to have',
  'The furthest I have travelled',
  'Something I collect',
  'A time I got properly lost',
  'My first job, real or imagined',
  'A fear I would rather not admit',
  'The best gift I ever received',
  'A habit I have never broken',
  'Something I believed as a child',
  'A sport I am terrible at',
  'My dream house, in one line',
  'A song I know all the words to',
  'The strangest thing in my bag right now',
  'A rule I always break',
  'My favourite way to spend a rainy day',
  'Something I have never told anyone here',
  'A meal I could eat every day',
  'The last thing that made me laugh out loud',
  'A place I would move to tomorrow',
  'My hidden talent',
];

interface SuspectTemplate {
  name: string;
  role: string;
  notes: string[];
  fillerNotes: string[];
  trueStatements: [string, string];
  falseStatement: string;
  contradictedNote: string;
}

const SUSPECTS: SuspectTemplate[] = [
  {
    name: 'Mara',
    role: 'lighthouse keeper',
    notes: ['Mara is afraid of deep water.', 'Mara cannot swim.'],
    fillerNotes: [
      'Mara drinks tea at dawn, every day.',
      'Mara owns a grey cat called Fog.',
      'Mara has kept the lighthouse for nine years.',
      'Mara writes letters she never sends.',
    ],
    trueStatements: [
      'I have kept this lighthouse for nine years.',
      'I am afraid of deep water.',
    ],
    falseStatement: 'I swim in the sea every morning.',
    contradictedNote: 'Mara cannot swim.',
  },
  {
    name: 'Theo',
    role: 'baker',
    notes: ['Theo is allergic to almonds.', 'Theo has never left the town.'],
    fillerNotes: [
      'Theo wakes at 4am to bake.',
      'Theo whistles while kneading dough.',
      'Theo owns three aprons, all floury.',
      'Theo names his sourdough starters.',
    ],
    trueStatements: ['I wake at 4am to bake.', 'I have never left this town.'],
    falseStatement: 'My almond cake won a prize in the city.',
    contradictedNote: 'Theo is allergic to almonds.',
  },
  {
    name: 'June',
    role: 'gardener',
    notes: ['June is allergic to bees.', 'June grows roses.'],
    fillerNotes: [
      'June talks to her plants.',
      'June’s favourite season is autumn.',
      'June wears gloves with holes in them.',
      'June saves seeds in paper envelopes.',
    ],
    trueStatements: ['I grow roses.', 'Autumn is my favourite season.'],
    falseStatement: 'I keep bees in the garden.',
    contradictedNote: 'June is allergic to bees.',
  },
  {
    name: 'Sam',
    role: 'sailor',
    notes: ['Sam gets seasick.', 'Sam cannot read maps.'],
    fillerNotes: [
      'Sam owns a red boat.',
      'Sam collects shells from every harbour.',
      'Sam sings while mending nets.',
      'Sam is afraid of thunderstorms.',
    ],
    trueStatements: ['I own a red boat.', 'Maps confuse me.'],
    falseStatement: 'I never get seasick.',
    contradictedNote: 'Sam gets seasick.',
  },
  {
    name: 'Ada',
    role: 'librarian',
    notes: ['Ada is scared of the dark.', 'Ada has a cat named Pepper.'],
    fillerNotes: [
      'Ada reads about a book a week.',
      'Ada shelves books by colour at home.',
      'Ada drinks cocoa while reading.',
      'Ada hums when she reshelves.',
    ],
    trueStatements: ['I read about a book a week.', 'My cat is called Pepper.'],
    falseStatement: 'I love walking home through the dark woods.',
    contradictedNote: 'Ada is scared of the dark.',
  },
  {
    name: 'Finn',
    role: 'clockmaker',
    notes: ['Finn is deaf in one ear.', 'Finn hates loud noises.'],
    fillerNotes: [
      'Finn fixes clocks of every size.',
      'Finn winds the town hall clock on Sundays.',
      'Finn keeps a drawer of spare hands.',
      'Finn prefers quiet rooms and ticking sounds.',
    ],
    trueStatements: ['I fix clocks.', 'Loud noises bother me.'],
    falseStatement: 'I play drums in a band.',
    contradictedNote: 'Finn hates loud noises.',
  },
];

export interface LiarRound {
  suspect: string;
  role: string;
  notes: string[];
  statements: string[];
  lieIndex: number;
  explanation: string;
}

/** Notes shown per tier: more notes to cross-check as levels climb. */
export function notesForLevel(level: number): number {
  if (level <= 10) return 3;
  if (level <= 30) return 4;
  if (level <= 60) return 5;
  return 6;
}

export function generateLiarRound(seed: string, level: number): LiarRound {
  const rng = rngFromSeed(seed);
  const t = SUSPECTS[Math.floor(rng() * SUSPECTS.length)];
  const want = notesForLevel(level);
  const fillers = shuffle(t.fillerNotes, rng);
  const notes = [...t.notes];
  for (const f of fillers) {
    if (notes.length >= want) break;
    notes.push(f);
  }
  const shown = shuffle(notes, rng);
  const statements = shuffle(
    [t.trueStatements[0], t.trueStatements[1], t.falseStatement],
    rng,
  );
  const lieIndex = statements.indexOf(t.falseStatement);
  return {
    suspect: t.name,
    role: t.role,
    notes: shown,
    statements,
    lieIndex,
    explanation: `The notes say “${t.contradictedNote}”, so “${t.falseStatement}” cannot be true.`,
  };
}
