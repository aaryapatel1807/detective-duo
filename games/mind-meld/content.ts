/* 8 hand-authored themed round sets. Each round both detectives type ONE
 * word for the theme; a miss turns the next round's theme into
 * "WORD_A + WORD_B" — the next words must relate to BOTH.
 */

export interface MindTheme {
  id: string;
  label: string;
  /** the prompt word shown to both players */
  prompt: string;
  hint: string;
}

export const MIND_THEMES: MindTheme[] = [
  { id: 'noir', label: 'Noir', prompt: 'NOIR', hint: 'Trench coats, rain-slick streets, a dame with a secret…' },
  { id: 'city', label: 'City', prompt: 'CITY', hint: 'What does every city have? Think landmarks, noise, crowds.' },
  { id: 'food', label: 'Food', prompt: 'FOOD', hint: 'Midnight cravings. What would you both order?' },
  { id: 'animals', label: 'Animals', prompt: 'ANIMAL', hint: 'Fur, feathers or scales — pick the obvious one.' },
  { id: 'cinema', label: 'Cinema', prompt: 'MOVIE', hint: 'The film you could both quote line for line.' },
  { id: 'music', label: 'Music', prompt: 'SONG', hint: 'The track that plays in your shared montage.' },
  { id: 'travel', label: 'Travel', prompt: 'JOURNEY', hint: 'Planes, trains, or one long road — where to?' },
  { id: 'mystery', label: 'Mystery', prompt: 'CLUE', hint: 'Every good case starts with one of these.' },
];
