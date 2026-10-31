import type { LucideIcon } from 'lucide-react';
import {
  BookOpenText,
  Brain,
  Dices,
  Eye,
  Fence,
  Footprints,
  Grid3x3,
  Grip,
  Hand,
  Hash,
  Heart,
  KeyRound,
  Layers,
  LayoutGrid,
  Lock,
  MessagesSquare,
  MousePointerClick,
  Pencil,
  Route,
  Search,
  Ship,
  UserSearch,
  Smile,
  Type,
  Zap,
} from 'lucide-react';

export interface GameMeta {
  id: string;
  name: string;
  tagline: string;
  icon: LucideIcon;
  live: boolean;
  arrivesIn?: string;
}

export const GAMES: GameMeta[] = [
  {
    id: 'case-files',
    name: 'Case Files',
    tagline: 'Short mysteries with one culprit.',
    icon: BookOpenText,
    live: true,
  },
  {
    id: 'logic-grids',
    name: 'Logic Grids',
    tagline: 'Who sits where, and with what.',
    icon: Grid3x3,
    live: true,
  },
  {
    id: 'cipher-desk',
    name: 'Cipher Desk',
    tagline: 'Decode the intercepted notes.',
    icon: KeyRound,
    live: true,
  },
  {
    id: 'escape-maze',
    name: 'Escape the Maze',
    tagline: 'Find the way out, level by level.',
    icon: Footprints,
    live: true,
  },
  {
    id: 'monopoly',
    name: 'Monopoly',
    tagline: 'Buy, build, bankrupt the bot — or a friend.',
    icon: Dices,
    live: true,
  },
  {
    id: 'nonograms',
    name: 'Nonograms',
    tagline: 'Quiet picture logic.',
    icon: LayoutGrid,
    live: true,
  },
  {
    id: 'word-search',
    name: 'Word Search',
    tagline: 'A gentle daily rummage.',
    icon: Search,
    live: true,
  },
];

export function gameById(id: string): GameMeta | undefined {
  return (
    GAMES.find((g) => g.id === id) ??
    DUO_GAMES.find((g) => g.id === id) ??
    QUICK_GAMES.find((g) => g.id === id)
  );
}

/**
 * Quick games: quick, self-contained games that play solo against a bot.
 * Replaced over time: Guess the Person, Hangman, GK Quiz and Tic Tac Toe
 * took Quoridor, The Bridge, Snake Arena and Vibe Check's board spots;
 * Sea Battle was appended. Ten quick games in total.
 */
export const QUICK_GAMES: GameMeta[] = [
  {
    id: 'guess-person',
    name: 'Guess the Person',
    tagline: 'Ask yes-no questions, unmask the person.',
    icon: UserSearch,
    live: true,
  },
  {
    id: 'checkbox-race',
    name: 'Checkbox Race',
    tagline: 'Hunt the called number, fill your boxes first.',
    icon: Hash,
    live: true,
  },
  {
    id: 'hangman',
    name: 'Hangman',
    tagline: 'Guess the word, letter by letter.',
    icon: Type,
    live: true,
  },
  {
    id: 'jinx',
    name: 'Jinx',
    tagline: 'Same letters, shared words score nobody.',
    icon: Type,
    live: true,
  },
  {
    id: 'spot-emoji',
    name: 'Speed Spot-the-Emoji',
    tagline: 'Two cards, one twin picture. Find it first.',
    icon: Eye,
    live: true,
  },
  {
    id: 'dont-press-purple',
    name: "Don't Press Purple",
    tagline: 'Tap teal, hold still on violet.',
    icon: MousePointerClick,
    live: true,
  },
  {
    id: 'quiz-gk',
    name: 'GK Quiz',
    tagline: 'General knowledge, head to head.',
    icon: Brain,
    live: true,
  },
  {
    id: 'uno-slap',
    name: 'Uno Slap',
    tagline: 'Count to ten, slap on the match.',
    icon: Hand,
    live: true,
  },
  {
    id: 'tic-tac-toe',
    name: 'Tic Tac Toe',
    tagline: 'Three in a row beats the bot — or a friend.',
    icon: Grid3x3,
    live: true,
  },
  {
    id: 'sea-battle',
    name: 'Sea Battle',
    tagline: 'Sink the fleet before yours goes down.',
    icon: Ship,
    live: true,
  },
];
export const DUO_GAMES: GameMeta[] = [
  {
    id: 'dots-boxes',
    name: 'Dots and Boxes',
    tagline: 'Draw lines, close boxes, beat the bot.',
    icon: Grip,
    live: true,
  },
  {
    id: 'safe-cracker',
    name: 'Safe Cracker',
    tagline: 'Crack the code in fewer guesses than the bot.',
    icon: Lock,
    live: true,
  },
  {
    id: 'memory',
    name: 'Memory',
    tagline: 'Flip two cards, find the pair, keep the turn.',
    icon: Layers,
    live: true,
  },
  {
    id: 'sketch-clue',
    name: 'Sketch the Clue',
    tagline: 'Draw it, and see what the guesser thinks.',
    icon: Pencil,
    live: true,
  },
  {
    id: 'spot-liar',
    name: 'Spot the Liar',
    tagline: 'Three statements, one lie, notes to check.',
    icon: MessagesSquare,
    live: true,
  },
  {
    id: 'know-me',
    name: 'How Well Do You Know Me',
    tagline: 'Answer, guess, reveal — together.',
    icon: Heart,
    live: true,
  },
];
