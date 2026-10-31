/**
 * How Well Do You Know Me question bank (Duo Corner).
 *
 * Every question is about the couple — us, together, each other —
 * not about one person alone. Questions are tagged light, silly or
 * deep. A game picks six, balanced across tags. Together mode: both
 * players answer privately, then guess each other's answers, then
 * the app reveals them together — including async (answer now,
 * partner answers later, reveal when both are in).
 * Solo mode: the bot persona Pip answers from canned lines, and she
 * guesses Pip's answers.
 *
 * Together mode, self-validation: after the reveal (which shows
 * answers and guesses with NO app verdict), each partner validates
 * only the guesses made about their own answers, once per question.
 * The final score is the count of guesses validated Correct. The
 * Would You Rather section below uses the same flow, with its own
 * state keys so the two sections never collide.
 */

import { rngFromSeed, shuffle } from './rng';

export type KnowTag = 'light' | 'silly' | 'deep';

export interface KnowQuestion {
  id: string;
  text: string;
  tag: KnowTag;
  /** Canned answers for the solo bot persona, Pip. */
  botAnswers: string[];
}

const Q = (
  id: string,
  text: string,
  tag: KnowTag,
  botAnswers: [string, string, string],
): KnowQuestion => ({ id, text, tag, botAnswers });

export const KNOW_QUESTIONS: KnowQuestion[] = [
  // light — everyday us
  Q('us-date', 'Our ideal date, no budget limit', 'light', ['A slow dinner, then a long walk', 'A road trip with no destination', 'Blankets, a film, and no phones']),
  Q('us-cook', 'The dish you would cook for us on a lazy Sunday', 'light', ['Butter noodles, extra cheese', 'Something slow from my grandmother’s book', 'Whatever we can make together']),
  Q('us-song', 'The song that feels like us', 'light', ['Something with a big chorus we sing badly', 'An old song from when we met', 'Whatever was playing on our best day']),
  Q('us-morning', 'Your ideal morning with me', 'light', ['Slow coffee and no alarm', 'A walk before anyone wakes', 'Pancakes, then a nap together']),
  Q('us-place', 'The coziest place we have been together', 'light', ['A corner seat in a cafe', 'Under one blanket, anywhere', 'That walk we still talk about']),
  Q('us-text', 'Who texts first in the morning, you or me', 'light', ['Me, always', 'You, before I wake', 'Whoever misses the other first']),
  Q('us-film', 'The film we should rewatch together', 'light', ['A comfort film we quote', 'Something we fell asleep to', 'The one we argue about loving']),
  Q('us-weekend', 'Our perfect weekend, just us', 'light', ['Nothing planned at all', 'One good walk, one good film', 'Cooking something slow together']),
  Q('us-photo', 'Your favourite photo of us', 'light', ['The silly one, mid-laugh', 'The quiet one, no posing', 'The first one we ever took']),
  Q('us-gift', 'The best gift you could get from me', 'light', ['Something handmade, even badly', 'A day with no plans, just us', 'A letter, not a thing']),
  Q('us-city', 'A city we should visit together', 'light', ['Somewhere by the sea', 'A quiet town with hills', 'Anywhere with good trains']),
  Q('us-smell', 'A smell that feels like home when we are together', 'light', ['Rain on warm pavement', 'Fresh bread', 'Their shampoo']),
  // silly — playful us
  Q('us-blanket', 'Who steals the blanket at night', 'silly', ['Me, and I deny it', 'You, every single night', 'We fight over it fairly']),
  Q('us-snack', 'Who finishes the snacks first', 'silly', ['Me, no contest', 'You, while I am cooking', 'We blame each other']),
  Q('us-alarm', 'Who snoozes the alarm more', 'silly', ['Me, five times minimum', 'You, then I wake you', 'We both pretend not to hear it']),
  Q('us-selfie', 'Who takes more selfies of us', 'silly', ['Me, obviously', 'You, secretly', 'We take turns badly']),
  Q('us-argument', 'Our silliest argument ever', 'silly', ['What to watch tonight', 'Who left the light on', 'The correct way to load the dishwasher']),
  Q('us-petname', 'The pet name you secretly like most', 'silly', ['Something food-related', 'Something tiny and cute', 'I will never admit it']),
  Q('us-driver', 'Who is the better backseat driver', 'silly', ['Me, I navigate loudly', 'You, with full commentary', 'Neither, we trust the map']),
  Q('us-pick', 'Who picks what we watch, really', 'silly', ['Me, after asking you', 'You, I just agree', 'We scroll for an hour']),
  Q('us-sleep', 'Who falls asleep first', 'silly', ['Me, mid-sentence', 'You, instantly', 'Whoever had the longer day']),
  Q('us-dance', 'Our go-to dance move, together', 'silly', ['The awkward shuffle, in sync', 'Dramatic pointing at each other', 'Standing very still, vibing']),
  Q('us-socks', 'Do our socks have to match', 'silly', ['Always, or the day is ruined', 'Never, life is short', 'Only if someone will see them']),
  Q('us-toaster', 'If our toaster had a name', 'silly', ['Sir Crispalot', 'Bready Mercury', 'Just Toaster']),
  // deep — us, honestly
  Q('us-first', 'Your favourite first with me', 'deep', ['Our first walk', 'Our first proper laugh', 'The first time it felt easy']),
  Q('us-proud', 'Something about us you are quietly proud of', 'deep', ['How we show up for each other', 'How far we have come', 'That we still make each other laugh']),
  Q('us-lesson', 'A hard lesson our relationship taught you', 'deep', ['Rest is not laziness', 'Asking for help is strength', 'Small kindnesses still count']),
  Q('us-future', 'Where do you hope we are in five years', 'deep', ['Doing work we love, together', 'Closer, wherever we live', 'Somewhere we chose, not settled for']),
  Q('us-miss', 'What do you miss most when we are apart', 'deep', ['Their laugh, in the room', 'The small daily things', 'Just the quiet company']),
  Q('us-kind', 'The kindest thing I ever did for you', 'deep', ['I just listened', 'I showed up unasked', 'I believed in you first']),
  Q('us-brave', 'When did you last feel brave with me around', 'deep', ['Saying the hard thing', 'Starting something new', 'Admitting I was wrong']),
  Q('us-home', 'What does home mean to you now', 'deep', ['A person, not a place', 'Warmth, laughter, enough', 'Wherever we are, together']),
  Q('us-fear', 'A fear you are working on, that I should know', 'deep', ['Being misunderstood', 'Running out of time', 'Letting you down']),
  Q('us-trip', 'A dream trip for just the two of us', 'deep', ['Japan, slowly, together', 'A cabin, no signal, for a week', 'Everywhere, slowly, just us']),
  Q('us-change', 'One thing you would change about our days', 'deep', ['More time, just us', 'Less worrying, more doing', 'More small adventures']),
  Q('us-advice', 'Advice you would give us on a hard day', 'deep', ['It is okay to be slow', 'We are not behind', 'Take the chance, together']),
];

export const KNOW_TAG_LABEL: Record<KnowTag, string> = {
  light: 'Light',
  silly: 'Silly',
  deep: 'Deep',
};

/** Six questions, two of each tag, seeded. */
export function pickQuestions(seed: string, count = 6): KnowQuestion[] {
  const rng = rngFromSeed(seed);
  const byTag: Record<KnowTag, KnowQuestion[]> = { light: [], silly: [], deep: [] };
  for (const q of KNOW_QUESTIONS) byTag[q.tag].push(q);
  const tags: KnowTag[] = ['light', 'silly', 'deep'];
  const out: KnowQuestion[] = [];
  let ti = 0;
  while (out.length < count) {
    const tag = tags[ti % tags.length];
    ti++;
    const pool = byTag[tag].filter((q) => !out.includes(q));
    if (!pool.length) continue;
    out.push(pool[Math.floor(rng() * pool.length)]);
    if (out.length >= KNOW_QUESTIONS.length) break;
  }
  return shuffle(out, rng);
}

/** Pip's canned answer to one question (seeded). */
export function botAnswer(q: KnowQuestion, seed: string): string {
  const rng = rngFromSeed(`${seed}|${q.id}`);
  return q.botAnswers[Math.floor(rng() * q.botAnswers.length)];
}

/** Matches between guesses and true answers (case/space-insensitive). */
export function countMatches(
  guesses: Record<string, string>,
  answers: Record<string, string>,
): number {
  const norm = (s: string) => s.trim().toLowerCase();
  let n = 0;
  for (const [qid, g] of Object.entries(guesses)) {
    const a = answers[qid];
    if (a !== undefined && g.trim() !== '' && norm(g) === norm(a)) n++;
  }
  return n;
}

export const BOT_NAME = 'Pip';

/* ------------------------------------------------ Would You Rather ---- */

/**
 * A Would You Rather pair, written for Sachi: two cosy, couple-friendly
 * options, nothing copied from any other app. A player's own pick and
 * their partner's pick are both one of 'A' | 'B', so a guess is always
 * exactly comparable — but in together mode the owner still validates
 * it, exactly like the main questions.
 */
export interface KnowWyr {
  id: string;
  optionA: string;
  optionB: string;
}

export type KnowWyrChoice = 'A' | 'B';

const WYR = (id: string, optionA: string, optionB: string): KnowWyr => ({
  id,
  optionA,
  optionB,
});

export const KNOW_WYR: KnowWyr[] = [
  WYR('wyr-rain', 'A slow rainy day in, blankets and films', 'A sunny day out, walking somewhere new'),
  WYR('wyr-food', 'Cook a long dinner together from scratch', 'Order in and eat it on the floor like a picnic'),
  WYR('wyr-trip', 'A quiet cabin with no signal for a week', 'A busy city break, one new place every day'),
  WYR('wyr-morning', 'Lie in with no alarm and nowhere to be', 'Get up early and watch the sunrise together'),
  WYR('wyr-film', 'Rewatch a comfort film you both quote', 'Watch something neither of you has ever seen'),
  WYR('wyr-music', 'Dance badly in the kitchen to a loud song', 'Slow dance in the living room to a quiet one'),
  WYR('wyr-gift', 'A handmade gift, even a wonky one', 'A whole day planned just for the two of you'),
  WYR('wyr-sea', 'Live by the sea, rain and all', 'Live in the hills, quiet and green'),
  WYR('wyr-pets', 'Adopt a sleepy cat that sits on everything', 'Adopt a bouncy dog that drags you out walking'),
  WYR('wyr-story', 'Read the same book at the same time and argue about it', 'Watch the same series, one episode a night, no spoilers'),
  WYR('wyr-party', 'A tiny dinner with just the two of you', 'A big noisy gathering with all your favourite people'),
  WYR('wyr-future', 'Save up for one big dream trip', 'Spend little and often on small adventures all year'),
];

/** Six Would You Rather pairs, seeded and shuffled. */
export function pickWyr(seed: string, count = 6): KnowWyr[] {
  const rng = rngFromSeed(seed);
  return shuffle([...KNOW_WYR], rng).slice(0, Math.min(count, KNOW_WYR.length));
}

/** Pip's canned Would You Rather pick (seeded, always 'A' or 'B'). */
export function botWyrChoice(w: KnowWyr, seed: string): KnowWyrChoice {
  const rng = rngFromSeed(`${seed}|${w.id}`);
  return rng() < 0.5 ? 'A' : 'B';
}

/* ------------------------------------------- Partner self-validation ---- */

/**
 * One partner's verdict on a guess about their own answer: 'correct'
 * means "yes, that guess really is what I said/meant", 'incorrect'
 * means "no, that is not it". Only the answer's owner may record a
 * verdict for a question, and only once per question (the record is
 * keyed by owner uid + question id, so a second tap overwrites rather
 * than adding a second vote — the UI disables the buttons after the
 * first tap).
 */
export type KnowValidation = 'correct' | 'incorrect';

/** Validations keyed by answer-owner uid, then question/pair id. */
export type KnowValidations = Record<string, Record<string, KnowValidation>>;

/**
 * How many of the guesses about one owner's answers that owner marked
 * Correct. Entries keyed by any other uid are ignored — only the
 * owner's own validations count for their answers.
 */
export function validatedCorrectCount(
  validations: KnowValidations | undefined,
  ownerUid: string,
): number {
  const mine = validations?.[ownerUid] ?? {};
  return Object.values(mine).filter((v) => v === 'correct').length;
}

/** True when every listed owner has validated every listed question. */
export function validationsComplete(
  validations: KnowValidations | undefined,
  ownerUids: string[],
  questionIds: string[],
): boolean {
  return ownerUids.every((uid) =>
    questionIds.every((qid) => (validations?.[uid]?.[qid] ?? null) !== null),
  );
}
