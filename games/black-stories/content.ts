/* Black Stories — local bank (10 extra, offline-first).
 * Combined with the 5 imported from lib/content/blackStories.ts → 15 total.
 * Schema: BlackStory { id, title, riddle, solution }
 */

import { BLACK_STORIES as SHARED_STORIES, type BlackStory } from '../../lib/content/blackStories';

export type { BlackStory };

export const LOCAL_STORIES: BlackStory[] = [
  {
    id: 'bsl-1',
    title: 'The Empty Parachute',
    riddle:
      'A man is found dead in a field, still wearing a perfectly intact parachute that never opened. No aircraft is anywhere nearby. What happened?',
    solution:
      'He was never in an aircraft. He jumped from a hot-air balloon at a county fair during a skydive stunt — the static line snapped, and the chute was only a costume prop sewn shut. The balloon drifted miles away before anyone noticed.',
  },
  {
    id: 'bsl-2',
    title: 'Three Light Bulbs',
    riddle:
      'A detective stands before three switches in a windowless basement. One controls a bulb in the locked attic above. He may flip the switches as much as he likes, but he can only climb the stairs once. How does he identify the right switch?',
    solution:
      'He turns switch one ON and waits five minutes, letting the bulb heat up. Then he turns it OFF and turns switch two ON. Upstairs, the lit bulb is switch two, the warm-but-dark bulb is switch one, the cold dark bulb is switch three.',
  },
  {
    id: 'bsl-3',
    title: 'The Alibi of the Clock',
    riddle:
      'A woman claims she was home alone reading when her husband was poisoned across town. The only clock in her house is broken — yet detectives prove she lied using nothing but the clock. How?',
    solution:
      'The broken clock had stopped at the exact minute of the murder. Dust on the face showed it had not run in months — but the time was recent. She had smashed it herself that night to fake an alibi, then set the hands to a wrong time. The smashed second hand was bent exactly at the hour of death.',
  },
  {
    id: 'bsl-4',
    title: 'The Locked Freezer',
    riddle:
      'A butcher is found frozen to death inside his own walk-in freezer. The door locks only from the outside, and there are no footprints in the frost except his own. His business partner swears the freezer was never opened that night. What really happened?',
    solution:
      'There was no intruder — the partner had rigged the thermostat to plunge during the night and jammed the interior handle weeks earlier. The "unopened" freezer alibi was true: the partner never opened it, because he controlled the temperature remotely. The butcher went in to fetch stock and could not get out.',
  },
  {
    id: 'bsl-5',
    title: 'The Telegram That Never Came',
    riddle:
      'A man waits every day at the train station for a telegram that never arrives. When it finally does, twenty years late, he smiles, tears it up, and walks home happy. What did it say?',
    solution:
      'It was his own pardon. He had been wrongfully convicted as a young man and escaped before the pardon was signed. Living under a false name, he could never claim it — the telegram simply confirmed the pardon existed, which meant the statute of limitations on his escape had long expired. He was finally free.',
  },
  {
    id: 'bsl-6',
    title: 'The Silent Violin',
    riddle:
      'A world-famous violinist plays a flawless concert to a packed hall, yet not a single person in the audience hears a note. The instruments are real. How?',
    solution:
      'The audience was deaf — it was a charity concert for a school for the deaf. The "music" was felt through the wooden floor and the vibrations of the stage. The reviews the next day praised the most beautiful concert no one had ever heard.',
  },
  {
    id: 'bsl-7',
    title: 'The Confession in the Mirror',
    riddle:
      'A detective arrests a murderer who confessed — but the only evidence is a mirror, and the suspect never spoke a word. How did the mirror extract a confession?',
    solution:
      'The detective placed the suspect in the interrogation room with a two-way mirror and, behind it, an actor silently mouthing the words "I did it" while pointing at the suspect. Convinced his accomplice was betraying him, the suspect panicked and wrote a full confession on the notepad provided — never realizing the mirror showed only his own fear.',
  },
  {
    id: 'bsl-8',
    title: 'The Lighthouse Keeper\'s Log',
    riddle:
      'A lighthouse keeper is found dead at the base of his lighthouse, his logbook open to the final entry: "The light went out at midnight." The lamp is in perfect working order. What killed him?',
    solution:
      'He did not die of the dark — he died of the climb. The generator had failed at midnight and he sprinted up 200 steps with a spare part, tripped on the last landing, and fell down the spiral staircase. The entry was written before he climbed; the "perfect" lamp was fixed by his assistant at dawn.',
  },
  {
    id: 'bsl-9',
    title: 'The Poisoned Ice',
    riddle:
      'Two detectives drink identical whiskey poured from the same bottle. One takes his with ice, the other drinks his neat. The one WITH ice collapses within minutes; the one without is unharmed. The bottle tests clean. Where was the poison?',
    solution:
      'The poison was frozen inside the ice cubes. The neat drinker\'s glass held nothing but clean whiskey — the victim\'s poison arrived only as his cubes melted into the drink, sip by sip. The killer never touched the bottle; they poisoned the ice tray the night before.',
  },
  {
    id: 'bsl-10',
    title: 'The Last Train',
    riddle:
      'A man buys a ticket, boards the last train of the night, and is found dead in his seat at the terminus — with his ticket still punched, his wallet untouched, and no wounds. The conductor swears the man boarded alive and smiling. What happened?',
    solution:
      'He died of a heart attack brought on by relief. He was a fugitive who had just learned, minutes before boarding, that the only witness against him had died. The ticket, the smile, the untouched wallet — he simply sat down, finally safe, and his heart gave out. The conductor\'s testimony was the coroner\'s best clue: a man at peace.',
  },
];

export const ALL_STORIES: BlackStory[] = [...SHARED_STORIES, ...LOCAL_STORIES];

export function getStory(id: string): BlackStory | undefined {
  return ALL_STORIES.find((s) => s.id === id);
}
