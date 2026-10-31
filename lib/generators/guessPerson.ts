/**
 * Guess the Person — Duo Corner.
 *
 * One player holds a secret person; the guesser asks yes/no trait
 * questions to eliminate candidates from a roster, then taps one
 * persona to guess. A correct guess wins; a wrong guess loses, and
 * running out of questions without guessing loses too.
 *
 * All 24 personas are original fictional characters invented for this
 * game (names and trait combinations only — no faces, no copied
 * artwork, nothing taken from Guess Who or any other game). Every
 * persona has a distinct trait combination, so questions can always
 * narrow the field down to the secret.
 *
 * Pure logic, no React: the page drives questions and guesses turn by
 * turn and tests can replay exact games. Solo plays against Cosy Bot,
 * which secretly picks the person; two-player is pass-and-play, where
 * one player picks the secret on a hidden screen and passes the device.
 */
import { rngFromSeed, shuffle } from './rng';

export type HairColour = 'black' | 'brown' | 'blonde' | 'red' | 'grey' | 'bald';
export type FacialHair = 'none' | 'beard' | 'moustache' | 'goatee';

export const HAIR_COLOURS: HairColour[] = ['black', 'brown', 'blonde', 'red', 'grey', 'bald'];
export const FACIAL_HAIR: FacialHair[] = ['none', 'beard', 'moustache', 'goatee'];

export interface Persona {
  name: string;
  glasses: boolean;
  hat: boolean;
  hair: HairColour;
  facialHair: FacialHair;
  /** True = smiling, false = serious expression. */
  smile: boolean;
}

/** Original roster of 24 fictional personas, each with a unique trait mix. */
export const ROSTER: Persona[] = [
  { name: 'Amara Quinn', glasses: true, hat: false, hair: 'black', facialHair: 'none', smile: true },
  { name: 'Basil Hart', glasses: false, hat: true, hair: 'brown', facialHair: 'beard', smile: false },
  { name: 'Cleo Marsh', glasses: true, hat: false, hair: 'blonde', facialHair: 'none', smile: true },
  { name: 'Dario Fox', glasses: false, hat: false, hair: 'black', facialHair: 'moustache', smile: true },
  { name: 'Elif Noor', glasses: true, hat: true, hair: 'brown', facialHair: 'none', smile: false },
  { name: 'Farah Lind', glasses: false, hat: false, hair: 'red', facialHair: 'none', smile: true },
  { name: 'Gideon Cole', glasses: true, hat: false, hair: 'grey', facialHair: 'beard', smile: false },
  { name: 'Hana Reyes', glasses: false, hat: true, hair: 'black', facialHair: 'none', smile: true },
  { name: 'Idris Khan', glasses: false, hat: false, hair: 'bald', facialHair: 'beard', smile: false },
  { name: 'Juno Park', glasses: true, hat: false, hair: 'red', facialHair: 'none', smile: false },
  { name: 'Kofi Mensah', glasses: false, hat: false, hair: 'black', facialHair: 'goatee', smile: true },
  { name: 'Lila Snow', glasses: false, hat: true, hair: 'blonde', facialHair: 'none', smile: true },
  { name: 'Milo Grant', glasses: true, hat: false, hair: 'brown', facialHair: 'moustache', smile: false },
  { name: 'Nadia Frost', glasses: false, hat: false, hair: 'grey', facialHair: 'none', smile: true },
  { name: 'Otto Weber', glasses: true, hat: true, hair: 'bald', facialHair: 'beard', smile: true },
  { name: 'Priya Nair', glasses: false, hat: false, hair: 'black', facialHair: 'none', smile: false },
  { name: 'Quincy Bell', glasses: true, hat: false, hair: 'brown', facialHair: 'goatee', smile: true },
  { name: 'Rosa Diaz', glasses: false, hat: true, hair: 'red', facialHair: 'none', smile: false },
  { name: 'Silas Reed', glasses: false, hat: false, hair: 'grey', facialHair: 'moustache', smile: false },
  { name: 'Tara Singh', glasses: true, hat: false, hair: 'blonde', facialHair: 'none', smile: false },
  { name: 'Uma Rao', glasses: false, hat: false, hair: 'black', facialHair: 'none', smile: true },
  { name: 'Victor Hale', glasses: true, hat: false, hair: 'bald', facialHair: 'none', smile: false },
  { name: 'Wren Adler', glasses: false, hat: false, hair: 'brown', facialHair: 'none', smile: true },
  { name: 'Yuki Tanaka', glasses: true, hat: true, hair: 'black', facialHair: 'none', smile: false },
];

/** Roster shown grows with level; the question budget shrinks. */
export function rosterSizeForLevel(level: number): number {
  if (level <= 10) return 12;
  if (level <= 30) return 16;
  if (level <= 60) return 20;
  return 24;
}

export function budgetForLevel(level: number): number {
  if (level <= 10) return 8;
  if (level <= 30) return 6;
  if (level <= 60) return 5;
  return 4;
}

export type TraitKey = 'glasses' | 'hat' | 'hair' | 'facialHair' | 'smile';

export interface TraitQuestion {
  id: string;
  label: string;
  trait: TraitKey;
  /** The value the question asks about; answer is whether the secret matches it. */
  value: boolean | HairColour | FacialHair;
}

function traitValue(persona: Persona, trait: TraitKey): boolean | HairColour | FacialHair {
  return persona[trait];
}

/** One yes/no question per trait value (booleans ask about "yes"). */
export const QUESTIONS: TraitQuestion[] = [
  { id: 'glasses', label: 'Wearing glasses?', trait: 'glasses', value: true },
  { id: 'hat', label: 'Wearing a hat?', trait: 'hat', value: true },
  { id: 'smile', label: 'Smiling?', trait: 'smile', value: true },
  ...HAIR_COLOURS.map((hair) => ({
    id: `hair-${hair}`,
    label: hair === 'bald' ? 'Bald?' : `Hair ${hair}?`,
    trait: 'hair' as TraitKey,
    value: hair,
  })),
  ...FACIAL_HAIR.map((facialHair) => ({
    id: `facial-${facialHair}`,
    label:
      facialHair === 'none'
        ? 'No facial hair?'
        : facialHair === 'beard'
          ? 'A beard?'
          : facialHair === 'moustache'
            ? 'A moustache?'
            : 'A goatee?',
    trait: 'facialHair' as TraitKey,
    value: facialHair,
  })),
];

export function questionById(id: string): TraitQuestion | undefined {
  return QUESTIONS.find((q) => q.id === id);
}

/** The honest yes/no answer for a secret persona. */
export function answerQuestion(secret: Persona, question: TraitQuestion): boolean {
  return traitValue(secret, question.trait) === question.value;
}

/** Keep exactly the candidates whose answer matches the given answer. */
export function applyAnswer(
  candidates: Persona[],
  question: TraitQuestion,
  answer: boolean,
): Persona[] {
  return candidates.filter((p) => answerQuestion(p, question) === answer);
}

/** A question is useful only if it splits the field (both sides non-empty). */
export function splitsCandidates(candidates: Persona[], question: TraitQuestion): boolean {
  const yes = candidates.filter((p) => answerQuestion(p, question)).length;
  return yes > 0 && yes < candidates.length;
}

export interface AskedQuestion {
  question: TraitQuestion;
  answer: boolean;
}

export interface GuessPersonState {
  /** Candidates shown at the start of the round (shuffled). */
  roster: Persona[];
  secret: Persona;
  remaining: Persona[];
  asked: AskedQuestion[];
  questionsUsed: number;
  budget: number;
  finished: boolean;
  won: boolean;
}

export function generateGuessPerson(seed: string, level: number): GuessPersonState {
  const size = rosterSizeForLevel(level);
  const rng = rngFromSeed(`guess-person|${seed}|${level}`);
  const roster = shuffle(ROSTER, rng).slice(0, size);
  const secret = roster[Math.floor(rng() * roster.length)]!;
  return {
    roster,
    secret,
    remaining: [...roster],
    asked: [],
    questionsUsed: 0,
    budget: budgetForLevel(level),
    finished: false,
    won: false,
  };
}

/** Ask a question: the secret answers, non-matching candidates leave. No-ops when finished, over budget, or already asked. */
export function askQuestion(state: GuessPersonState, questionId: string): GuessPersonState {
  if (state.finished || state.questionsUsed >= state.budget) return state;
  const question = questionById(questionId);
  if (!question || state.asked.some((a) => a.question.id === questionId)) return state;
  const answer = answerQuestion(state.secret, question);
  const remaining = applyAnswer(state.remaining, question, answer);
  const questionsUsed = state.questionsUsed + 1;
  // Spending the last question without guessing loses the round.
  const finished = questionsUsed >= state.budget;
  return {
    ...state,
    remaining,
    asked: [...state.asked, { question, answer }],
    questionsUsed,
    finished,
    won: false,
  };
}

/** Guess a persona. Correct = win; wrong = loss. No-op when finished. */
export function makeGuess(state: GuessPersonState, name: string): GuessPersonState {
  if (state.finished) return state;
  const won = state.secret.name === name;
  return { ...state, finished: true, won };
}

/** Short trait chips for a persona card (no artwork, text only). */
export function traitChips(persona: Persona): string[] {
  const chips = [
    persona.glasses ? 'Glasses' : 'No glasses',
    persona.hat ? 'Hat' : 'No hat',
    persona.hair === 'bald' ? 'Bald' : `${persona.hair[0]!.toUpperCase()}${persona.hair.slice(1)} hair`,
    persona.facialHair === 'none'
      ? 'Clean-shaven'
      : `${persona.facialHair[0]!.toUpperCase()}${persona.facialHair.slice(1)}`,
    persona.smile ? 'Smiling' : 'Serious',
  ];
  return chips;
}
