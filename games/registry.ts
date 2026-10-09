/* Game registry.
 *
 * Game agents: register your game here with register(meta, loader).
 * The loader keeps game bundles split so /play/[game] only loads one.
 */

import type { GameComponent, GameMeta } from './types';

interface Entry {
  meta: GameMeta;
  loader: () => Promise<{ default: GameComponent }>;
}

const entries = new Map<string, Entry>();

export function register(meta: GameMeta, loader: () => Promise<{ default: GameComponent }>) {
  if (entries.has(meta.slug)) {
    throw new Error(`game slug already registered: ${meta.slug}`);
  }
  entries.set(meta.slug, { meta, loader });
}

export function getGame(slug: string): Entry | undefined {
  return entries.get(slug);
}

export function listGames(): GameMeta[] {
  return [...entries.values()].map((e) => e.meta);
}

export function gamesFor(mode: GameMeta['players']): GameMeta[] {
  return listGames().filter((m) => m.players === mode);
}

export function categories(): string[] {
  return [...new Set(listGames().map((m) => m.category))];
}

// ---- built-in registrations ----
import { meta as tapDuelMeta } from './sample-tap/meta';

register(tapDuelMeta, () => import('./sample-tap/Game'));

export type { GameComponent, GameMeta, GameProps, PlayerMode } from './types';
