/* Trivia Battle bank.
 *
 * Schema:
 *   TriviaQuestion { id, category, question, options: [4 strings], answer: 0..3 }
 *   CustomTrivia   { question, answer }   // "about each other" questions from Settings
 *
 * Custom questions (Settings page, stored in localStorage 'dd-custom-trivia')
 * are merged in by the game via getAllTrivia().
 */

export interface TriviaQuestion {
  id: string;
  category: string;
  question: string;
  options: [string, string, string, string];
  answer: number; // index into options
}

export interface CustomTrivia {
  question: string;
  answer: string;
}

export const CUSTOM_TRIVIA_KEY = 'dd-custom-trivia';

export const TRIVIA: TriviaQuestion[] = [
  {
    id: 't-1',
    category: 'Detective Lore',
    question: 'Which detective lives at 221B Baker Street?',
    options: ['Hercule Poirot', 'Sherlock Holmes', 'Philip Marlowe', 'Sam Spade'],
    answer: 1,
  },
  {
    id: 't-2',
    category: 'Detective Lore',
    question: 'Who created the detective Hercule Poirot?',
    options: ['Arthur Conan Doyle', 'Agatha Christie', 'Raymond Chandler', 'Dashiell Hammett'],
    answer: 1,
  },
  {
    id: 't-3',
    category: 'Forensics',
    question: 'What does a forensic scientist study in dactyloscopy?',
    options: ['Blood types', 'Fingerprints', 'Handwriting', 'Bite marks'],
    answer: 1,
  },
  {
    id: 't-4',
    category: 'Forensics',
    question: 'Luminol is used at crime scenes to detect traces of…',
    options: ['Gunpowder', 'Blood', 'Poison', 'Fibers'],
    answer: 1,
  },
  {
    id: 't-5',
    category: 'Codes',
    question: 'In a Caesar cipher with shift 3, "D" becomes…',
    options: ['A', 'G', 'Z', 'E'],
    answer: 1,
  },
  {
    id: 't-6',
    category: 'Heists',
    question: 'In which city is the famous 2003 Antwerp diamond heist set?',
    options: ['Amsterdam', 'Antwerp', 'Paris', 'Zurich'],
    answer: 1,
  },
  {
    id: 't-7',
    category: 'Noir Cinema',
    question: 'The 1941 film "The Maltese Falcon" stars which detective?',
    options: ['Philip Marlowe', 'Sam Spade', 'Mike Hammer', 'Nick Charles'],
    answer: 1,
  },
  {
    id: 't-8',
    category: 'Logic',
    question: 'A man looks at a portrait and says: "Brothers and sisters I have none, but that man\'s father is my father\'s son." Who is in the portrait?',
    options: ['His father', 'His son', 'Himself', 'His uncle'],
    answer: 1,
  },
  {
    id: 't-9',
    category: 'India',
    question: 'Which Indian city is home to the Gateway of India?',
    options: ['Delhi', 'Mumbai', 'Chennai', 'Kolkata'],
    answer: 1,
  },
  {
    id: 't-10',
    category: 'Wordplay',
    question: 'What 5-letter word becomes shorter when you add two letters to it?',
    options: ['Small', 'Short', 'Brief', 'Tiny'],
    answer: 1,
  },
];

export function readCustomTrivia(): CustomTrivia[] {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(CUSTOM_TRIVIA_KEY) : null;
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((q) => q?.question && q?.answer) : [];
  } catch {
    return [];
  }
}

export function saveCustomTrivia(list: CustomTrivia[]): void {
  try {
    window.localStorage.setItem(CUSTOM_TRIVIA_KEY, JSON.stringify(list));
  } catch {}
}
