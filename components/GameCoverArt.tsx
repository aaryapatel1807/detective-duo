'use client';

/* GameCoverArt — real cover art per game (generated noir series, data URIs).
 * Renders as a full-bleed image inside the hub card cover; the parent
 * supplies positioning via className (.coverArt / .featArt in home.module.css).
 *
 * Usage (app/page.tsx):
 *   <GameCoverArt slug={game.slug} className={s.coverArt} />
 */

import { GAME_COVERS } from '../lib/content/game-covers';

export function GameCoverArt({ slug, className = '' }: { slug: string; className?: string }) {
  const src = GAME_COVERS[slug];
  if (!src) return null;
  return (
    <span className={className} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" draggable={false} />
    </span>
  );
}
