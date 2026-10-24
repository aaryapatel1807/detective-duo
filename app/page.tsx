'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, MailOpen, Play, Sparkles, Users } from 'lucide-react';
import { GAMES, gameById } from '@/lib/games';
import {
  getGameProgress,
  loadLocalProgress,
  syncProgress,
  type ProgressMap,
} from '@/lib/progress';
import { useTheme } from '@/components/ThemeProvider';
import { getDailySet, getISTDateString } from '@/lib/daily';

function Stars({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span className="chip" aria-label={`${n} of 3 stars`}>
      {'★'.repeat(n)}
      <span className="opacity-40">{'★'.repeat(3 - n)}</span>
    </span>
  );
}

export default function HomePage() {
  const { userId } = useTheme();
  const [progress, setProgress] = useState<ProgressMap>({});

  useEffect(() => {
    setProgress(loadLocalProgress());
  }, []);

  useEffect(() => {
    if (userId) {
      void syncProgress(loadLocalProgress()).then(setProgress);
    }
  }, [userId]);

  const lastPlayed = useMemo(() => {
    let best: { game: string; at: string } | null = null;
    for (const [game, p] of Object.entries(progress)) {
      if (p.lastPlayedAt && (!best || p.lastPlayedAt > best.at)) {
        best = { game, at: p.lastPlayedAt };
      }
    }
    return best ? gameById(best.game) : undefined;
  }, [progress]);

  const lastProgress = lastPlayed ? getGameProgress(progress, lastPlayed.id) : null;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16">
      <section className="card mt-2 p-5 sm:p-6">
        <h1 className="text-3xl font-bold">Good to see you, detective.</h1>
        <p className="mt-1 text-[var(--ink-dim)]">
          Pick up where you left off, or try something gentle.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {lastPlayed && lastProgress ? (
            <Link href={`/play/${lastPlayed.id}`} className="btn btn-primary">
              <Play size={18} aria-hidden /> Continue {lastPlayed.name} · Level{' '}
              {lastProgress.currentLevel}
            </Link>
          ) : (
            <Link href="/play/logic-grids" className="btn btn-primary">
              <Play size={18} aria-hidden /> Start with Logic Grids
            </Link>
          )}
          <Link href="/play/logic-grids" className="btn">
            <Sparkles size={18} aria-hidden /> Surprise me
          </Link>
          <button type="button" className="btn" disabled title="Together mode arrives in Phase 3">
            <Users size={18} aria-hidden /> Play together · Phase 3
          </button>
        </div>
        <p className="mt-3 text-sm text-[var(--ink-dim)]">
          Surprise me opens Logic Grids at your level for now.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <CalendarDays size={20} aria-hidden /> Today
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {(() => {
            const daily = getDailySet(getISTDateString());
            const slots = [
              {
                name: 'Daily Case',
                detail: daily.dailyCase
                  ? daily.dailyCase.title
                  : 'Arrives with the case bank — cipher and nonogram are ready.',
                href: '/daily#case',
              },
              {
                name: 'Daily Cipher',
                detail: 'A fresh coded note to decode.',
                href: '/daily#cipher',
              },
              {
                name: 'Daily Nonogram',
                detail: 'A fresh little picture to fill in.',
                href: '/daily#nonogram',
              },
            ];
            return slots.map((slot) => (
              <Link key={slot.name} href={slot.href} className="panel p-4">
                <p className="font-semibold">{slot.name}</p>
                <p className="mt-1 text-sm text-[var(--ink-dim)]">{slot.detail}</p>
              </Link>
            ));
          })()}
        </div>
      </section>

      <section className="mt-6">
        <div className="panel flex items-center gap-3 p-4">
          <MailOpen size={22} aria-hidden className="shrink-0" />
          <div>
            <p className="font-semibold">Left for you</p>
            <p className="text-sm text-[var(--ink-dim)]">
              Nothing here yet. When he leaves you a case, it will wait in this spot.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-bold">Games</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {GAMES.map((g) => {
            const p = getGameProgress(progress, g.id);
            const starsEarned = Object.values(p.stars).reduce((s, n) => s + n, 0);
            const Icon = g.icon;
            const inner = (
              <>
                <span className={`tile-icon ${g.live ? '' : 'alt'}`}>
                  <Icon size={24} aria-hidden />
                </span>
                <span className="font-display text-lg font-bold">{g.name}</span>
                <span className="text-sm text-[var(--ink-dim)]">{g.tagline}</span>
                <span className="mt-1 flex flex-wrap items-center gap-2">
                  {g.live ? (
                    <>
                      <span className="chip">Level {p.currentLevel}</span>
                      <Stars n={Math.min(3, starsEarned)} />
                    </>
                  ) : (
                    <span className="chip">Coming in {g.arrivesIn}</span>
                  )}
                </span>
              </>
            );
            return g.live ? (
              <Link key={g.id} href={`/play/${g.id}`} className="game-tile">
                {inner}
              </Link>
            ) : (
              <div key={g.id} className="game-tile" aria-disabled>
                {inner}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
