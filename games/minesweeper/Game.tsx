'use client';

/* Minesweeper — solo file. Two difficulties, first click always safe.
 * Flags via right-click (desktop) or long-press (touch). Timer + best times.
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
  DIFFICULTIES,
  countFlags,
  createBoard,
  isWin,
  openCell,
  toggleMark,
  type Cell,
  type Difficulty,
} from './logic';
import type { SweepBest, SweepStatus } from './types';

const BEST_KEY = 'dd-solo-minesweeper-best';

const NUM_COLORS = [
  '',
  'text-blue-400',
  'text-green-400',
  'text-red-400',
  'text-purple-400',
  'text-orange-400',
  'text-teal-400',
  'text-[var(--ink)]',
  'text-[var(--ink-dim)]',
];

export default function MinesweeperGame({ room }: GameProps) {
  const [diff, setDiff] = useState<Difficulty>(DIFFICULTIES[0]);
  const [board, setBoard] = useState<Cell[] | null>(null);
  const [status, setStatus] = useState<SweepStatus>('ready');
  const [seconds, setSeconds] = useState(0);
  const [best, setBest] = useState<SweepBest>(() => readJSON<SweepBest>(BEST_KEY, {}));
  const [exploded, setExploded] = useState<number | null>(null);
  const awardedRef = useRef(false);
  const longPressRef = useRef<number | null>(null);
  const longFiredRef = useRef(false);

  useEffect(() => {
    if (status !== 'playing') return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [status]);

  const awardWin = useCallback(
    (secs: number, d: Difficulty) => {
      if (awardedRef.current) return;
      awardedRef.current = true;
      awardXP(XP_AWARDS.soloWin);
      syncXpToRoom(room.setShared, room.me.id, room.me.name);
      sounds.stampThud();
      setBest((b) => {
        const prev = b[d.id as keyof SweepBest];
        if (prev !== undefined && prev <= secs) return b;
        const next = { ...b, [d.id]: secs };
        writeJSON(BEST_KEY, next);
        return next;
      });
    },
    [room],
  );

  const reset = useCallback(
    (d: Difficulty) => {
      awardedRef.current = false;
      setDiff(d);
      setBoard(null);
      setStatus('ready');
      setSeconds(0);
      setExploded(null);
    },
    [],
  );

  const reveal = (idx: number) => {
    if (status === 'won' || status === 'lost') return;
    let b = board;
    const d = diff;
    if (!b) {
      b = createBoard(d.rows, d.cols, d.mines, idx);
      setStatus('playing');
    }
    const cell = b[idx];
    if (cell.mark !== 'none') return;
    if (cell.mine) {
      setBoard(b.map((c, i) => (c.mine ? { ...c, open: true } : c)));
      setExploded(idx);
      setStatus('lost');
      sounds.paperShuffle();
      return;
    }
    sounds.pinTap();
    const next = openCell(b, d.rows, d.cols, idx);
    setBoard(next);
    if (isWin(next)) {
      setStatus('won');
      awardWin(seconds, d);
    }
  };

  const flag = (idx: number) => {
    if (!board || status === 'won' || status === 'lost') return;
    sounds.typewriterClick();
    setBoard(toggleMark(board, idx));
  };

  const onContextMenu = (e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    flag(idx);
  };

  const onPointerDown = (idx: number) => {
    longFiredRef.current = false;
    if (longPressRef.current) window.clearTimeout(longPressRef.current);
    longPressRef.current = window.setTimeout(() => {
      longFiredRef.current = true;
      flag(idx);
    }, 550);
  };

  const onPointerUp = () => {
    if (longPressRef.current) window.clearTimeout(longPressRef.current);
  };

  const cellSize = diff.cols > 9 ? 'h-6 w-6 text-[0.65rem]' : 'h-9 w-9 text-sm';
  const minesLeft = board ? diff.mines - countFlags(board) : diff.mines;

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 text-center">
        <Typewriter text="Minesweeper — Bomb Squad" as="h2" className="text-xl" />
        <p className="mt-1 text-sm text-[var(--ink-dim)]">
          Left-click to sweep, right-click or long-press to flag. First click is always safe.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap justify-center gap-2">
        {DIFFICULTIES.map((d) => (
          <button
            key={d.id}
            onClick={() => reset(d)}
            className={d.id === diff.id ? 'noir-btn !py-2' : 'noir-btn-ghost !py-2'}
          >
            {d.label}
          </button>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <GlassCard className="p-4">
          <div className="mb-3 flex items-center justify-between font-type text-sm">
            <span>
              💣 <span className="text-[var(--amber-glow)]">{minesLeft}</span>
            </span>
            <span>
              ⏱ <span className="text-[var(--amber-glow)]">{seconds}s</span>
            </span>
            <span className="text-xs text-[var(--ink-dim)]">
              best: {best[diff.id as keyof SweepBest] !== undefined ? `${best[diff.id as keyof SweepBest]}s` : '—'}
            </span>
          </div>

          {status === 'won' && (
            <div className="mb-3 rounded-xl border border-[var(--amber-glow)] bg-[rgba(232,163,61,0.1)] p-3 text-center">
              <div className="type-heading text-lg text-[var(--amber-glow)]">
                🎉 Field cleared in {seconds}s!
              </div>
              <p className="mt-1 text-sm text-[var(--ink-dim)]">+{XP_AWARDS.soloWin} XP filed.</p>
            </div>
          )}
          {status === 'lost' && (
            <div className="mb-3 rounded-xl border border-[var(--blood)] bg-[rgba(160,40,40,0.12)] p-3 text-center">
              <div className="type-heading text-lg">💥 Detonated!</div>
              <p className="mt-1 text-sm text-[var(--ink-dim)]">The minefield wins this round.</p>
            </div>
          )}

          <div className="flex justify-center overflow-x-auto">
            <div
              className="grid gap-0.5"
              style={{ gridTemplateColumns: `repeat(${diff.cols}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: diff.rows * diff.cols }, (_, i) => {
                const cell = board?.[i];
                const isOpen = cell?.open ?? false;
                let face: React.ReactNode = null;
                if (isOpen && cell) {
                  if (cell.mine) face = i === exploded ? '💥' : '💣';
                  else if (cell.adj > 0)
                    face = <span className={NUM_COLORS[cell.adj]}>{cell.adj}</span>;
                } else if (cell?.mark === 'flag') {
                  face = '🚩';
                } else if (cell?.mark === 'question') {
                  face = <span className="text-[var(--amber-glow)]">?</span>;
                }
                return (
                  <button
                    key={i}
                    onClick={() => {
                      if (longFiredRef.current) {
                        longFiredRef.current = false;
                        return;
                      }
                      reveal(i);
                    }}
                    onContextMenu={(e) => onContextMenu(e, i)}
                    onPointerDown={() => onPointerDown(i)}
                    onPointerUp={onPointerUp}
                    onPointerLeave={onPointerUp}
                    className={`flex items-center justify-center rounded border font-bold select-none ${cellSize} ${
                      isOpen
                        ? i === exploded
                          ? 'border-[var(--blood)] bg-[rgba(160,40,40,0.4)]'
                          : 'border-[var(--glass-border)] bg-[rgba(0,0,0,0.35)]'
                        : 'border-[var(--glass-border)] bg-[rgba(255,255,255,0.07)] hover:bg-[rgba(232,163,61,0.2)]'
                    }`}
                  >
                    {face}
                  </button>
                );
              })}
            </div>
          </div>

          {(status === 'won' || status === 'lost') && (
            <div className="mt-4 text-center">
              <button onClick={() => reset(diff)} className="noir-btn">
                ↺ Sweep again
              </button>
            </div>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
}
