'use client';

/* Minesweeper — solo file. Two difficulties, first click always safe.
 * Flags via right-click (desktop) or long-press (touch). Timer + best times.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameProps } from '../types';
import { GlassCard } from '../../components/GlassCard';
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
import '../ui-kit/kit.css';
import '../ui-kit/realism.css';
import './game.css';
import {
  DifficultyBadge,
  DifficultySelect,
  GameButton,
  ResultModal,
  ScoreHUD,
  SectionTitle,
  TimerChip,
  type Difficulty as KitDifficulty,
} from '../ui-kit';

const BEST_KEY = 'dd-solo-minesweeper-best';

/* Classic Windows number colors. */
const NUM_COLORS = [
  '',
  'ms-num-1',
  'ms-num-2',
  'ms-num-3',
  'ms-num-4',
  'ms-num-5',
  'ms-num-6',
  'ms-num-7',
  'ms-num-8',
];

/* Map the two sweep difficulties onto the kit's easy/medium/hard scale. */
function toKitDiff(d: Difficulty): KitDifficulty {
  return d.id === 'rookie' ? 'easy' : 'medium';
}
function fromKitDiff(k: KitDifficulty): Difficulty {
  return k === 'easy' ? DIFFICULTIES[0] : DIFFICULTIES[1];
}

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

  const cellSize = diff.cols > 9 ? 'ms-cell--sm' : 'ms-cell--lg';
  const minesLeft = board ? diff.mines - countFlags(board) : diff.mines;
  const bestForDiff = best[diff.id as keyof SweepBest];

  return (
    <div className="gk-root gk-modal-scope mx-auto max-w-xl">
      <div className="mb-4 text-center">
        <SectionTitle eyebrow="BOMB SQUAD" title="Minesweeper" />
        <p className="mt-2 text-sm text-[var(--ink-dim)]">
          Left-click to sweep, right-click or long-press to flag. First click is always safe.
        </p>
      </div>

      <div className="mb-4">
        <DifficultySelect
          options={[
            { value: 'easy', label: 'Rookie', hint: '9×9 · 10 mines' },
            { value: 'medium', label: 'Sleuth', hint: '16×16 · 40 mines' },
          ]}
          value={toKitDiff(diff)}
          onChange={(k) => reset(fromKitDiff(k))}
        />
      </div>

      <div className="mb-3">
        <ScoreHUD
          leftLabel="FLAGS"
          leftValue={minesLeft}
          rightLabel="BEST"
          rightValue={bestForDiff ?? 0}
          record="none"
        />
      </div>
      <div className="mb-4 flex items-center justify-center gap-3">
        <TimerChip seconds={seconds} label="TIME" />
        <DifficultyBadge difficulty={toKitDiff(diff)} label={diff.id === 'rookie' ? 'ROOKIE' : 'SLEUTH'} />
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <GlassCard className="p-4">
          <div className="ms-panel mb-3" aria-hidden="true">
            <div className="text-center">
              <div className="ms-panel-label">Mines</div>
              <div className="ms-lcd">{String(minesLeft).padStart(3, '0')}</div>
            </div>
            <div className="ms-panel-label text-center">
              Grid — {diff.rows}×{diff.cols}
              <br />
              minefield scan
            </div>
            <div className="text-center">
              <div className="ms-panel-label">Time</div>
              <div className="ms-lcd">{String(Math.min(999, seconds)).padStart(3, '0')}</div>
            </div>
          </div>

          <div className="flex justify-center overflow-x-auto">
            <div
              className="ms-bed grid gap-1"
              style={{ gridTemplateColumns: `repeat(${diff.cols}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: diff.rows * diff.cols }, (_, i) => {
                const cell = board?.[i];
                const isOpen = cell?.open ?? false;
                let face: React.ReactNode = null;
                if (isOpen && cell) {
                  if (cell.mine) face = <span className="ms-face">{i === exploded ? '💥' : '💣'}</span>;
                  else if (cell.adj > 0)
                    face = <span className={NUM_COLORS[cell.adj]}>{cell.adj}</span>;
                } else if (cell?.mark === 'flag') {
                  face = <span className="ms-face">🚩</span>;
                } else if (cell?.mark === 'question') {
                  face = <span className="ms-num-q">?</span>;
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
                    aria-label={`Cell ${i + 1}`}
                    className={`ms-cell ${cellSize} ${isOpen ? 'ms-cell--open' : ''} ${i === exploded ? 'ms-cell--boom' : ''}`}
                  >
                    {face}
                  </button>
                );
              })}
            </div>
          </div>

          {(status === 'won' || status === 'lost') && (
            <div className="mt-4 text-center">
              <GameButton variant="ghost" size="sm" onClick={() => reset(diff)}>
                ↺ Sweep again
              </GameButton>
            </div>
          )}
        </GlassCard>
      </motion.div>

      <ResultModal
        open={status === 'won'}
        eyebrow="BOMB SQUAD"
        headline="Field Cleared"
        tone="win"
        stat={`CLEARED IN ${seconds}S · ${diff.label} · +${XP_AWARDS.soloWin} XP`}
        primaryLabel="Sweep again"
        onPrimary={() => reset(diff)}
      />

      <ResultModal
        open={status === 'lost'}
        eyebrow="BOMB SQUAD"
        headline="Detonated"
        tone="lose"
        stat={`${diff.label} · THE MINEFIELD WINS THIS ROUND`}
        primaryLabel="Sweep again"
        onPrimary={() => reset(diff)}
      />
    </div>
  );
}
