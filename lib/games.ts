import type { LucideIcon } from 'lucide-react';
import {
  BookOpenText,
  Grid3x3,
  KeyRound,
  DoorOpen,
  LayoutGrid,
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
    live: false,
    arrivesIn: 'Phase 2',
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
    live: false,
    arrivesIn: 'Phase 2',
  },
  {
    id: 'escape-rooms',
    name: 'Escape Rooms',
    tagline: 'One room, a chain of locks.',
    icon: DoorOpen,
    live: false,
    arrivesIn: 'Phase 2',
  },
  {
    id: 'nonograms',
    name: 'Nonograms',
    tagline: 'Quiet picture logic.',
    icon: LayoutGrid,
    live: false,
    arrivesIn: 'Phase 2',
  },
  {
    id: 'word-search',
    name: 'Word Search',
    tagline: 'A gentle daily rummage.',
    icon: Search,
    live: false,
    arrivesIn: 'Phase 2',
  },
];

export function gameById(id: string): GameMeta | undefined {
  return GAMES.find((g) => g.id === id);
}
