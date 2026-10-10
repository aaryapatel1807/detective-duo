'use client';

/* Solo files — single-player games from the registry (players: 'solo').
 * Solo game agents will fill the registry; this page renders whatever it finds.
 */

import Link from 'next/link';
import { useMemo } from 'react';
import { GlassCard } from '../../components/GlassCard';
import { Typewriter } from '../../components/Typewriter';
import { gamesFor } from '../../games/all';
import { sounds } from '../../lib/sound';

const COMING_SOON = ['2048', 'Wordle', 'Minesweeper', 'Snake', 'Memory Match', 'Daily Puzzle'];

export default function SoloPage() {
  const games = useMemo(() => gamesFor('solo'), []);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <Typewriter text="Solo Files" as="h1" className="text-2xl" />
        <p className="mt-1 text-sm text-[var(--ink-dim)]">
          For when your partner is off the case. No uplink needed.
        </p>
      </div>

      {games.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <div className="text-5xl">🔎</div>
          <p className="font-type mt-4 text-sm tracking-[0.12em] uppercase">
            The solo files are still being dusted for prints.
          </p>
          <p className="mt-2 text-sm text-[var(--ink-dim)]">
            Solo games (2048, Wordle, Minesweeper, Snake, Memory Match, Daily Puzzle…)
            land here as the game agents file them.
          </p>
        </GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((g) => (
            <Link
              key={g.slug}
              href={`/play/${g.slug}`}
              onClick={() => sounds.paperShuffle()}
              className="glass-card block p-5 transition-transform hover:-translate-y-1"
            >
              <div className="text-4xl">{g.icon}</div>
              <div className="font-type mt-3 text-sm font-bold uppercase tracking-[0.1em]">
                {g.title}
              </div>
              <div className="mt-1 text-xs text-[var(--ink-dim)]">{g.blurb}</div>
            </Link>
          ))}
        </div>
      )}

      <GlassCard className="p-5">
        <div className="eyebrow mb-3">On the docket</div>
        <div className="flex flex-wrap gap-2">
          {COMING_SOON.map((t) => (
            <span
              key={t}
              className="rounded-full border border-[var(--glass-border)] px-3 py-1 font-type text-[0.7rem] uppercase tracking-[0.14em] text-[var(--ink-dim)]"
            >
              {t} · sealed
            </span>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
