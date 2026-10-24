/**
 * How Well Do You Know Me question bank (Duo Corner).
 *
 * Questions are tagged light, silly or deep. A game picks six, balanced
 * across tags. Together mode: both players answer privately, then guess
 * each other's answers, then the app reveals them together — including
 * async (answer now, partner answers later, reveal when both are in).
 * Solo mode: the bot persona Pip answers from canned lines, and she
 * guesses Pip's answers.
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
  // light
  Q('food', 'Your favourite food, no thinking', 'light', ['Butter noodles', 'Roast potatoes', 'Mango sticky rice']),
  Q('laugh', 'The last thing that made you laugh', 'light', ['A cat falling off a sofa', 'My own typo in a serious email', 'A pigeon stealing chips']),
  Q('morning', 'Your ideal morning', 'light', ['Slow coffee and no alarm', 'A walk before anyone wakes', 'Pancakes, then a nap']),
  Q('season', 'Your favourite season, and why in five words', 'light', ['Autumn, crunchy leaves everywhere', 'Winter, blankets and soup', 'Summer, long light evenings']),
  Q('song', 'A song you never skip', 'light', ['Something with a big chorus', 'An old song from school days', 'Whatever is stuck in my head']),
  Q('place-home', 'The coziest place you know', 'light', ['My grandmother’s kitchen', 'A corner seat in a cafe', 'Under a blanket, anywhere']),
  Q('drink', 'Tea, coffee, or something else', 'light', ['Tea, strong, with milk', 'Coffee, black, no fuss', 'Hot chocolate with cream']),
  Q('weekend', 'Your perfect weekend', 'light', ['Nothing planned at all', 'One good walk, one good film', 'Cooking something slow']),
  Q('book', 'A book you would press into someone’s hands', 'light', ['A mystery with a twist', 'A book of poems', 'The one I reread yearly']),
  Q('smell', 'A smell that feels like home', 'light', ['Rain on warm pavement', 'Fresh bread', 'Old books']),
  Q('city', 'A city you would live in tomorrow', 'light', ['Somewhere by the sea', 'A quiet town with hills', 'Anywhere with good trains']),
  Q('animal', 'If you were an animal for a day', 'light', ['A cat, obviously', 'An otter, for the sliding', 'A sleepy tortoise']),
  // silly
  Q('superpower', 'Your dream superpower, useless division', 'silly', ['Teleporting to the fridge', 'Perfect parallel parking', 'Never queueing again']),
  Q('cereal', 'Cereal: before or after the milk', 'silly', ['Before, like a normal person', 'After, chaos is fine', 'Dry, straight from the box']),
  Q('socks', 'Do socks have to match', 'silly', ['Always, or the day is ruined', 'Never, life is short', 'Only if someone will see them']),
  Q('dance', 'Your go-to dance move', 'silly', ['The awkward shuffle', 'Dramatic pointing', 'Standing very still, vibing']),
  Q('alien', 'First thing you would ask an alien', 'silly', ['Do you have snacks', 'Can I see your ship', 'Is your planet hiring']),
  Q('toaster', 'If your toaster had a name', 'silly', ['Sir Crispalot', 'Bready Mercury', 'Just Toaster']),
  Q('puddle', 'Jump in the puddle or walk around', 'silly', ['Jump, every time', 'Walk around, I have dry socks', 'Jump, but only if no one watches']),
  Q('nap', 'The ideal nap length', 'silly', ['Twenty minutes, precisely', 'Three hours, accidentally', 'Naps are for the weak']),
  Q('ghost', 'If you were a ghost, where would you haunt', 'silly', ['A library, shushing people', 'My own kitchen, for snacks', 'A lighthouse, for the view']),
  Q('hat', 'A hat you would wear every day if you could', 'silly', ['A very large sun hat', 'A detective’s fedora', 'A crown, why not']),
  Q('pickle', 'Pickles: love, hate, or indifferent', 'silly', ['Love, extra pickles', 'Hate, keep them away', 'Indifferent, I eat around them']),
  Q('sneeze', 'Your sneeze style', 'silly', ['One polite achoo', 'A dramatic triple', 'Silent, then red-faced']),
  // deep
  Q('fear', 'A fear you are working on', 'deep', ['Being misunderstood', 'Running out of time', 'Letting people down']),
  Q('trip', 'A dream trip, and who comes with you', 'deep', ['Japan, with my favourite person', 'A cabin, alone, for a week', 'Everywhere, slowly, with family']),
  Q('proud', 'Something you are quietly proud of', 'deep', ['Showing up when it was hard', 'Something I built myself', 'How far I have come']),
  Q('change', 'One thing you would change about your life', 'deep', ['More time with loved ones', 'Less worrying, more doing', 'A braver career move']),
  Q('memory', 'A childhood memory you keep returning to', 'deep', ['Summer evenings outside', 'Cooking with family', 'A long car journey']),
  Q('kind', 'The kindest thing someone did for you', 'deep', ['They just listened', 'They showed up unasked', 'They believed in me first']),
  Q('lesson', 'A hard lesson that turned out useful', 'deep', ['Rest is not laziness', 'Asking for help is strength', 'Small steps still count']),
  Q('future', 'Where do you hope to be in five years', 'deep', ['Doing work I love', 'Closer to the people I love', 'Somewhere I chose, not settled for']),
  Q('miss', 'Who or what do you miss most', 'deep', ['Home, as it used to be', 'A person, always', 'A version of myself']),
  Q('brave', 'When did you last feel brave', 'deep', ['Saying the hard thing', 'Starting something new', 'Admitting I was wrong']),
  Q('enough', 'What does a good life look like to you', 'deep', ['People, warmth, enough', 'Freedom and a full shelf', 'Laughter, daily']),
  Q('advice', 'Advice you would give your younger self', 'deep', ['It is okay to be slow', 'You are not behind', 'Take the chance']),
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
