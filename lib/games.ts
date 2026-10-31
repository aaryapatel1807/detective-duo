import type { LucideIcon } from 'lucide-react';
import {
  BookOpenText,
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
 * Quick games (Phase 6): nine more two-player games from the crisskross
 * extract. Each is quick, self-contained, and plays solo against a bot.
 */
export const QUICK_GAMES: GameMeta[] = [
  {
    id: 'quoridor',
    name: 'Quoridor',
    tagline: 'Race across the board, fences in the way.',
    icon: Fence,
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
    id: 'the-bridge',
    name: 'The Bridge',
    tagline: 'A word-ladder bridge between two words.',
    icon: Route,
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
    id: 'snake-arena',
    name: 'Snake Arena',
    tagline: 'Real-time snakes, fruit, stars, shields.',
    icon: Zap,
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
    id: 'vibe-check',
    name: 'Vibe Check',
    tagline: 'Guess Who with personality questions.',
    icon: Smile,
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
