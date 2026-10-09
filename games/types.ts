/* Game module contract types.
 *
 * Each game lives in games/<slug>/ and exports:
 *   - `meta`: GameMeta (below)
 *   - default: React component receiving GameProps { room }
 *
 * Register the game in your workstream's games/register-<workstream>.ts fragment
 * (see games/REGISTRATION.md) with register(meta, loader).
 * The play shell at /play/[game] looks the game up via getGame(slug)
 * and renders it inside a case-folder frame.
 */

import type { ComponentType } from 'react';
import type { RoomApi } from '../lib/realtime/useRoom';

export type PlayerMode = 'duo' | 'coop' | 'solo';

export interface GameMeta {
  /** URL-safe id, also the folder name: games/<slug>/ */
  slug: string;
  title: string;
  /** duo = versus, coop = cooperative, solo = single player */
  players: PlayerMode;
  /** Hub category shown on the corkboard */
  category: string;
  /** emoji shown on the pin card */
  icon: string;
  blurb: string;
}

export interface GameProps {
  room: RoomApi;
}

export type GameComponent = ComponentType<GameProps>;
