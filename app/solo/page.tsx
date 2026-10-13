'use client';

/* Solo files — single-player games from the registry (players: 'solo').
 * Solo game agents will fill the registry; this page renders whatever it finds.
 */

import Link from 'next/link';
import { useMemo } from 'react';
import { GlassCard } from '../../components/GlassCard';
import { Typewriter } from '../../components/Typewriter';
import { Pin } from '../../components/Pin';
import { gamesFor } from '../../games/all';
import type { GameMeta } from '../../games/types';
import { sounds } from '../../lib/sound';
import '../../components/hub-noir.css';

const COMING_SOON = ['2048', 'Wordle', 'Minesweeper', 'Snake', 'Memory Match', 'Daily Puzzle'];

const DIFFICULTY_CLASS: Record<string, string> = {
  easy: 'hub-pill-easy',
  medium: 'hub-pill-medium',
  hard: 'hub-pill-hard',
};

function SoloCaseCard({ g }: { g: GameMeta }) {
  return (
    <Link
      href={`/play/${g.slug}`}
      onClick={() => sounds.paperShuffle()}
      className="hub-game-card"
    >
      <div className="hub-cover">
        <div className="hub-cover-icon" aria-hidden>
          {g.icon}
        </div>
        <div className="hub-display hub-cover-title">{g.title}</div>
        <div className="hub-cover-cat">{g.category}</div>
      </div>
      <div className="hub-card-body">
        <div className="hub-card-blurb">{g.blurb}</div>
        <div className="hub-card-meta">
          <span className="hub-badge">Solo</span>
          {g.difficulty && (
            <span className={`hub-badge ${DIFFICULTY_CLASS[g.difficulty]}`}>
              {g.difficulty}
            </span>
          )}
        </div>
        <span className="hub-open-file">Open file →</span>
      </div>
    </Link>
  );
}

export default function SoloPage() {
  const games = useMemo(() => gamesFor('solo'), []);

  return (
    <div className="hub-page">
      <div className="mx-auto max-w-5xl space-y-5">
        <div>
          <Typewriter text="Solo Files" as="h1" className="hub-page-title" />
          <p className="hub-sub">
            For when your partner is off the case. No uplink needed.
          </p>
        </div>

        {games.length === 0 ? (
          <GlassCard className="relative p-8 text-center">
            <Pin className="absolute -top-2 left-10" />
            <div className="text-5xl" aria-hidden>
              🔎
            </div>
            <p className="hub-display mt-4 text-sm">
              The solo files are still being dusted for prints.
            </p>
            <p className="mt-2 text-sm text-[var(--hub-ink-dim)]">
              Solo games (2048, Wordle, Minesweeper, Snake, Memory Match, Daily
              Puzzle…) land here as the game agents file them.
            </p>
          </GlassCard>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {games.map((g) => (
              <SoloCaseCard key={g.slug} g={g} />
            ))}
          </div>
        )}

        <GlassCard className="p-5">
          <div className="hub-eyebrow mb-3">On the docket</div>
          <div className="flex flex-wrap gap-2">
            {COMING_SOON.map((t) => (
              <span key={t} className="hub-badge">
                {t} · sealed
              </span>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
