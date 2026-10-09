/* Spot the Liar — 12 prompt cards. Each round the liar writes 3 statements
 * (2 true, 1 false) about the prompt; the interrogator cross-examines, then calls the lie.
 */

export interface PromptCard {
  id: string;
  prompt: string;
  hint: string;
}

export const PROMPT_CARDS: PromptCard[] = [
  { id: 'p1', prompt: 'Your most embarrassing childhood moment', hint: 'The wilder, the harder to spot the lie.' },
  { id: 'p2', prompt: 'A place you have traveled to', hint: 'Details are the interrogator\'s weapon.' },
  { id: 'p3', prompt: 'Something you are secretly good at', hint: 'Talents nobody suspects.' },
  { id: 'p4', prompt: 'Your first crush', hint: 'Names, places, years — pick your poison.' },
  { id: 'p5', prompt: 'A food you cannot stand', hint: 'Disgust is easy to fake. Or is it?' },
  { id: 'p6', prompt: 'The strangest dream you remember', hint: 'Dreams are already lies. Perfect cover.' },
  { id: 'p7', prompt: 'A rule you broke as a kid', hint: 'Confess two, invent one.' },
  { id: 'p8', prompt: 'Your dream job as a child', hint: 'Astronaut? Spy? Liar?' },
  { id: 'p9', prompt: 'A celebrity you have "met"', hint: 'Air quotes encouraged.' },
  { id: 'p10', prompt: 'Your biggest fear', hint: 'Vulnerability makes great camouflage.' },
  { id: 'p11', prompt: 'Something you have never told anyone', hint: 'Two truths, one beautiful fabrication.' },
  { id: 'p12', prompt: 'The best gift you ever received', hint: 'Sentiment is a smokescreen.' },
];

export function getPromptCard(id: string): PromptCard | undefined {
  return PROMPT_CARDS.find((c) => c.id === id);
}

export function drawPrompt(usedIds: string[]): PromptCard {
  const pool = PROMPT_CARDS.filter((c) => !usedIds.includes(c.id));
  const source = pool.length > 0 ? pool : PROMPT_CARDS;
  return source[Math.floor(Math.random() * source.length)];
}
