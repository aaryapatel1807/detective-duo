/* Black Stories — lateral thinking puzzles.
 * One player hosts (reads the full story), the other asks yes/no questions.
 *
 * Schema: BlackStory { id, title, riddle, solution }
 */

export interface BlackStory {
  id: string;
  title: string;
  /** What the guesser hears */
  riddle: string;
  /** What only the host knows */
  solution: string;
}

export const BLACK_STORIES: BlackStory[] = [
  {
    id: 'bs-1',
    title: 'The Elevator Man',
    riddle:
      'A man lives on the 20th floor. Every morning he takes the elevator to the ground floor. Every evening he takes it to the 10th floor and walks the rest — unless it is raining, when he rides all the way up. Why?',
    solution:
      'He is very short and cannot reach the 20th-floor button — only the 10th. On rainy days he has his umbrella and uses it to press the top button.',
  },
  {
    id: 'bs-2',
    title: 'Dead in the Sawdust',
    riddle:
      'A man is found dead in the middle of a desert, surrounded by sawdust and holding half a matchstick. No footprints lead to or from him. What happened?',
    solution:
      'He was in a hot-air balloon with others, losing altitude over the desert. They threw out everything — then drew matchsticks to decide who would jump to save the rest. He drew the short half.',
  },
  {
    id: 'bs-3',
    title: 'The Music Stopped',
    riddle:
      'A woman hears music, and moments later she dies. The music had been playing for years without harming her. What happened?',
    solution:
      'She was a tightrope walker in a circus; the music was her cue to walk. One night the orchestra played it early by mistake — she stepped off the platform before the net was up.',
  },
  {
    id: 'bs-4',
    title: 'Coffee, No Sugar',
    riddle:
      'A man orders coffee in a restaurant, takes one sip, and immediately shoots the waiter — then himself. The coffee was perfectly normal. Why?',
    solution:
      'He was stranded at sea with the waiter years ago and they survived by eating the dead. The "seagull meat" they ate was actually his wife. The taste of real coffee-free... no — tasting the coffee he finally realized what he had eaten, and took revenge on the waiter who had cooked it.',
  },
  {
    id: 'bs-5',
    title: 'The Window',
    riddle:
      'A man opens a window, and that single act causes the deaths of forty people. The window was in his own home. How?',
    solution:
      'He was the projectionist at a cinema. He opened the projection-room window for air, letting light spill onto the screen during a film. The audience panicked, thinking it was a fire, and forty people died in the stampede.',
  },
];

export function getBlackStory(id: string): BlackStory | undefined {
  return BLACK_STORIES.find((s) => s.id === id);
}
