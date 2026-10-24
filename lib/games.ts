import type { LucideIcon } from 'lucide-react';
import {
  BookOpenText,
  Flashlight,
  Grid3x3,
  Grip,
  Heart,
  KeyRound,
  DoorOpen,
  LayoutGrid,
  Lock,
  MessagesSquare,
  Pencil,
  Search,
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
    id: 'escape-rooms',
    name: 'Escape Rooms',
    tagline: 'One room, a chain of locks.',
    icon: DoorOpen,
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
  return GAMES.find((g) => g.id === id) ?? DUO_GAMES.find((g) => g.id === id);
}

/**
 * Duo Corner (Phase 5): lighter, quicker games made for two. Every one
 * works solo too — each solo page plays against a bot (Sketch the Clue
 * solo is the toy guesser), so Surprise me can pick any of them.
 */
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
    id: 'lantern-map',
    name: 'Lantern and Map',
    tagline: 'Walk the dark maze; the guide whispers.',
    icon: Flashlight,
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
