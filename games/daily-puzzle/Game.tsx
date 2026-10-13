'use client';

/* Daily Puzzle — solo file. A date-seeded 5×5 word search that resets at
 * local midnight. Tap a start cell, then an end cell, to claim a word.
 * Streak persists in localStorage; XP on completion.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameProps } from '../types';
import { GlassCard } from '../../components/GlassCard';
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
import '../ui-kit/kit.css';
import '../ui-kit/realism.css';
import './daily-puzzle.css';
import { ProgressBar, TimerChip } from '../ui-kit';

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
  const countdown = Math.max(0, Math.floor(msUntilMidnight(new Date(now)) / 1000));

  return (
    <div className="gk-root mx-auto max-w-md">
      <div className="mb-4 flex items-center justify-center gap-3">
        <span className="font-type text-xs tracking-[0.18em] uppercase text-[var(--ink-dim)]">
          🔥 streak {streak.streak}
        </span>
        <TimerChip seconds={countdown} label="Next case" />
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="dp-page">
          <div className="dp-masthead">
            <div className="dp-masthead__brand">The Daily Dossier</div>
            <div className="dp-masthead__date">{today} · Puzzle page</div>
            <div className="dp-masthead__rule">
              Find the {puzzle.words.length} hidden words — tap a start cell, then an end cell.
            </div>
          </div>

          <div className="mb-4">
            <ProgressBar
              label="WORDS ON FILE"
              value={found.length}
              max={puzzle.words.length}
              showNumbers={false}
            />
          </div>

          <div className="dp-grid" role="grid" aria-label="Word search grid">
            {puzzle.letters.map((ch, i) => {
              const isFound = foundCells.has(i);
              const isAnchor = anchor === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => tapCell(i)}
                  aria-label={`Cell ${i + 1}, letter ${ch}`}
                  className={`dp-cell ${isFound ? 'dp-cell--found' : isAnchor ? 'dp-cell--anchor' : ''}`}
                >
                  {ch}
                </button>
              );
            })}
          </div>

          {flash && !allFound && (
            <p className="dp-flash">{flash}</p>
          )}

          <div className="mt-4">
            <div className="dp-masthead__date mb-2">Words on file ({found.length}/{puzzle.words.length})</div>
            <div className="dp-words">
              {puzzle.words.map((w) => (
                <span
                  key={w.word}
                  className={`dp-word ${found.includes(w.word) ? 'dp-word--found' : ''}`}
                >
                  {w.word}
                </span>
              ))}
            </div>
          </div>

          {allFound && (
            <div className="dp-complete">
              <div className="dp-complete__head">
                🎉 Case closed — streak at {streak.streak}!
              </div>
              <p className="dp-complete__sub">
                +{XP_AWARDS.soloWin} XP filed. Fresh puzzle in {formatCountdown(msUntilMidnight(new Date(now)))}.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
