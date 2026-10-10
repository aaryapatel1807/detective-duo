'use client';

/* Daily Puzzle — solo file. A date-seeded 5×5 word search that resets at
 * local midnight. Tap a start cell, then an end cell, to claim a word.
 * Streak persists in localStorage; XP on completion.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameProps } from '../types';
import { GlassCard } from '../../components/GlassCard';
import { Typewriter } from '../../components/Typewriter';
import { awardXP, syncXpToRoom, XP_AWARDS } from '../../lib/xp';
import { readJSON, writeJSON } from '../../lib/store';
import { sounds } from '../../lib/sound';
import {
  cellsOnLine,
  dateKey,
  formatCountdown,
  generateDaily,
  msUntilMidnight,
  type DailyPuzzle,
} from './logic';
import type { DailyStreak } from './types';

const STREAK_KEY = 'dd-daily-streak';
const DONE_KEY = 'dd-daily-done';

function yesterdayKey(today: string): string {
  const d = new Date(`${today}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return dateKey(d);
}

export default function DailyPuzzleGame({ room }: GameProps) {
  const today = dateKey();
  const [puzzle] = useState<DailyPuzzle>(() => generateDaily(today));
  const [found, setFound] = useState<string[]>(() => {
    const doneFor = readJSON<string>(DONE_KEY, '');
    return doneFor === today ? puzzle.words.map((w) => w.word) : [];
  });
  const [anchor, setAnchor] = useState<number | null>(null);
  const [streak, setStreak] = useState<DailyStreak>(() => readJSON<DailyStreak>(STREAK_KEY, { last: '', streak: 0 }));
  const [now, setNow] = useState(() => Date.now());
  const [flash, setFlash] = useState('');
  const awardedRef = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const complete = useCallback(() => {
    if (awardedRef.current) return;
    awardedRef.current = true;
    writeJSON(DONE_KEY, today);
    setStreak((s) => {
      const next: DailyStreak =
        s.last === today
          ? s
          : s.last === yesterdayKey(today)
            ? { last: today, streak: s.streak + 1 }
            : { last: today, streak: 1 };
      writeJSON(STREAK_KEY, next);
      return next;
    });
    awardXP(XP_AWARDS.soloWin);
    syncXpToRoom(room.setShared, room.me.id, room.me.name);
    sounds.stampThud();
  }, [room, today]);

  const tapCell = (idx: number) => {
    if (found.length >= puzzle.words.length) return;
    if (anchor === null) {
      setAnchor(idx);
      sounds.pinTap();
      return;
    }
    if (anchor === idx) {
      setAnchor(null);
      return;
    }
    const line = cellsOnLine(puzzle.size, anchor, idx);
    setAnchor(null);
    if (!line) {
      setFlash('Not a straight line, detective.');
      return;
    }
    const word = line.map((i) => puzzle.letters[i]).join('');
    const hit = puzzle.words.find((w) => w.word === word && !found.includes(w.word));
    if (hit) {
      sounds.typewriterClick();
      const next = [...found, hit.word];
      setFound(next);
      setFlash('');
      if (next.length >= puzzle.words.length) complete();
    } else {
      setFlash(`"${word}" isn't in the file.`);
      sounds.paperShuffle();
    }
  };

  const foundCells = new Set<number>();
  puzzle.words.forEach((w) => {
    if (found.includes(w.word)) w.cells.forEach((c) => foundCells.add(c));
  });

  const allFound = found.length >= puzzle.words.length;

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4 text-center">
        <Typewriter text={`Daily Puzzle — ${today}`} as="h2" className="text-xl" />
        <p className="mt-1 text-sm text-[var(--ink-dim)]">
          Find the {puzzle.words.length} hidden words. Tap a start cell, then an end cell.
        </p>
        <p className="mt-1 font-type text-xs tracking-[0.14em] uppercase text-[var(--ink-dim)]">
          🔥 streak {streak.streak} · next case in {formatCountdown(msUntilMidnight(new Date(now)))}
        </p>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <GlassCard className="p-4">
          <div className="grid grid-cols-5 gap-1.5 select-none">
            {puzzle.letters.map((ch, i) => {
              const isFound = foundCells.has(i);
              const isAnchor = anchor === i;
              return (
                <button
                  key={i}
                  onClick={() => tapCell(i)}
                  className={`flex aspect-square items-center justify-center rounded-lg border text-xl font-bold ${
                    isFound
                      ? 'border-[var(--amber-glow)] bg-[rgba(232,163,61,0.3)] text-[var(--ink)]'
                      : isAnchor
                        ? 'border-[var(--blood)] bg-[rgba(160,40,40,0.3)] text-[var(--ink)]'
                        : 'border-[var(--glass-border)] bg-[rgba(0,0,0,0.25)] text-[var(--ink)] hover:bg-[rgba(232,163,61,0.15)]'
                  }`}
                >
                  {ch}
                </button>
              );
            })}
          </div>

          {flash && !allFound && (
            <p className="mt-2 text-center text-sm text-[var(--blood-bright)]">{flash}</p>
          )}

          <div className="mt-4">
            <div className="eyebrow mb-2">Words on file ({found.length}/{puzzle.words.length})</div>
            <div className="flex flex-wrap gap-2">
              {puzzle.words.map((w) => (
                <span
                  key={w.word}
                  className={`rounded-full border px-3 py-1 font-type text-xs tracking-[0.12em] ${
                    found.includes(w.word)
                      ? 'border-[var(--amber-glow)] text-[var(--amber-glow)] line-through'
                      : 'border-[var(--glass-border)] text-[var(--ink-dim)]'
                  }`}
                >
                  {w.word}
                </span>
              ))}
            </div>
          </div>

          {allFound && (
            <div className="mt-4 rounded-xl border border-[var(--amber-glow)] bg-[rgba(232,163,61,0.1)] p-4 text-center">
              <div className="type-heading text-lg text-[var(--amber-glow)]">
                🎉 Case closed — streak at {streak.streak}!
              </div>
              <p className="mt-1 text-sm text-[var(--ink-dim)]">
                +{XP_AWARDS.soloWin} XP filed. Fresh puzzle at midnight.
              </p>
            </div>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
}
