'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, MailOpen, Play, Sparkles, Users } from 'lucide-react';
import { GAMES, DUO_GAMES, gameById, type GameMeta } from '@/lib/games';
import {
  getGameProgress,
  loadLocalProgress,
  syncProgress,
  type ProgressMap,
} from '@/lib/progress';
import { useTheme } from '@/components/ThemeProvider';
import { useMe } from '@/components/together/useMe';
import HomeArt from '@/components/ThemeArt';
import { listLeftCases, type LeftCase } from '@/lib/together/leftCases';
import { ALL_CASES } from '@/lib/cases/bank';
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

function Tiles({ games, progress }: { games: GameMeta[]; progress: ProgressMap }) {
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      {games.map((g) => {
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
  );
}

const ALL_GAMES = [...GAMES, ...DUO_GAMES];

export default function HomePage() {
  const { userId } = useTheme();
  const me = useMe();
  const [progress, setProgress] = useState<ProgressMap>({});
  const [leftCases, setLeftCases] = useState<LeftCase[]>([]);
  const [surprise, setSurprise] = useState(GAMES[1]);

  useEffect(() => {
    setProgress(loadLocalProgress());
  }, []);

  useEffect(() => {
    if (userId) {
      void syncProgress(loadLocalProgress()).then(setProgress);
    }
  }, [userId]);

  useEffect(() => {
    if (!me) return;
    void listLeftCases(me.uid).then(setLeftCases);
  }, [me]);

  useEffect(() => {
    setSurprise(ALL_GAMES[Math.floor(Math.random() * ALL_GAMES.length)]);
  }, []);

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
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Good to see you, detective.</h1>
            <p className="mt-1 text-[var(--ink-dim)]">
              Pick up where you left off, or try something gentle.
            </p>
          </div>
          <div className="home-art" aria-hidden>
            <HomeArt />
          </div>
        </div>
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
          <Link href={`/play/${surprise.id}`} className="btn">
            <Sparkles size={18} aria-hidden /> Surprise me
          </Link>
          <Link href="/together" className="btn">
            <Users size={18} aria-hidden /> Play together
          </Link>
        </div>
        <p className="mt-3 text-sm text-[var(--ink-dim)]">
          Surprise me picks from all twelve games, at your level in whichever one it lands
          on. Every Duo Corner game works alone too, against a bot.
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
                  : 'No case today — the cipher and nonogram below are ready, and a fresh case arrives tomorrow.',
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
        {(() => {
          const first = leftCases[0];
          const leftCase = first ? ALL_CASES.find((c) => c.id === first.caseId) : undefined;
          if (!first || !leftCase) {
            return (
              <div className="panel flex items-center gap-3 p-4">
                <MailOpen size={22} aria-hidden className="shrink-0" />
                <div>
                  <p className="font-semibold">Left for you</p>
                  <p className="text-sm text-[var(--ink-dim)]">
                    Nothing here yet. When your partner leaves you a case, it will wait in
                    this spot.
                  </p>
                  <Link href="/together/leave" className="btn mt-2">
                    Leave one for your partner
                  </Link>
                </div>
              </div>
            );
          }
          return (
            <Link href={`/play/case-files?case=${leftCase.id}`} className="panel flex items-center gap-3 p-4">
              <MailOpen size={22} aria-hidden className="shrink-0" />
              <div>
                <p className="font-semibold">
                  Left for you{leftCases.length > 1 ? ` · ${leftCases.length} waiting` : ''}
                </p>
                <p className="text-sm">
                  {leftCase.title}
                  {first.note ? ` — “${first.note}”` : ''}
                </p>
                <p className="text-sm text-[var(--ink-dim)]">From your partner · tap to open</p>
              </div>
            </Link>
          );
        })()}
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-bold">Games</h2>
        <Tiles games={GAMES} progress={progress} />
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-bold">Duo Corner</h2>
        <p className="mt-1 text-sm text-[var(--ink-dim)]">
          Lighter, quicker games made for two — and every one of them plays fine alone,
          against a bot.
        </p>
        <Tiles games={DUO_GAMES} progress={progress} />
      </section>
    </main>
  );
}
