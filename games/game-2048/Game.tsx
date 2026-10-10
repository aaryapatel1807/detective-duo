'use client';

/* 2048 — solo file. Arrow keys / WASD / swipe to slide the evidence tiles.
 * Best score persists in localStorage; 2048 tile awards solo XP once.
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
  emptyGrid,
  hasWon,
  isGameOver,
  move,
  spawnTile,
  type Direction,
  type Grid,
} from './logic';

const BEST_KEY = 'dd-solo-2048-best';

function freshGrid(): Grid {
  let g = emptyGrid();
  g = spawnTile(g).grid;
  g = spawnTile(g).grid;
  return g;
}

const TILE_BG: Record<number, string> = {
  2: 'rgba(217,201,163,0.14)',
  4: 'rgba(217,201,163,0.24)',
  8: 'rgba(232,163,61,0.30)',
  16: 'rgba(232,163,61,0.42)',
  32: 'rgba(232,163,61,0.55)',
  64: 'rgba(200,120,40,0.65)',
  128: 'rgba(190,90,50,0.72)',
  256: 'rgba(178,60,55,0.78)',
  512: 'rgba(160,45,50,0.84)',
  1024: 'rgba(150,35,48,0.9)',
  2048: 'rgba(232,163,61,0.95)',
};

function tileStyle(v: number): React.CSSProperties {
  if (v === 0) return {};
  const bg = TILE_BG[v] ?? 'rgba(232,163,61,1)';
  const fg = v >= 8 ? '#1c1410' : 'var(--ink)';
  return { background: bg, color: fg, fontWeight: 700 };
}

export default function Game2048({ room }: GameProps) {
  const [grid, setGrid] = useState<Grid>(() => freshGrid());
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => readJSON<number>(BEST_KEY, 0));
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);
  const [keepGoing, setKeepGoing] = useState(false);
  const awardedRef = useRef(false);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const stateRef = useRef({ grid, score, over });
  stateRef.current = { grid, score, over };

  const awardWin = useCallback(() => {
    if (awardedRef.current) return;
    awardedRef.current = true;
    awardXP(XP_AWARDS.soloWin);
    syncXpToRoom(room.setShared, room.me.id, room.me.name);
    sounds.xpTick();
  }, [room]);

  const doMove = useCallback(
    (dir: Direction) => {
      const { grid: g, score: s, over: isOver } = stateRef.current;
      if (isOver) return;
      const r = move(g, dir);
      if (!r.moved) return;
      sounds.typewriterClick();
      const spawned = spawnTile(r.grid);
      const nextScore = s + r.gained;
      setGrid(spawned.grid);
      setScore(nextScore);
      setBest((b) => {
        const nb = Math.max(b, nextScore);
        if (nb !== b) writeJSON(BEST_KEY, nb);
        return nb;
      });
      if (hasWon(spawned.grid) && !won) {
        setWon(true);
        awardWin();
        sounds.stampThud();
      }
      if (isGameOver(spawned.grid)) {
        setOver(true);
        sounds.paperShuffle();
      }
    },
    [awardWin, won],
  );

  const newGame = useCallback(() => {
    awardedRef.current = false;
    setGrid(freshGrid());
    setScore(0);
    setOver(false);
    setWon(false);
    setKeepGoing(false);
    sounds.paperShuffle();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Direction> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
        w: 'up',
        s: 'down',
        a: 'left',
        d: 'right',
        W: 'up',
        S: 'down',
        A: 'left',
        D: 'right',
      };
      const dir = map[e.key];
      if (!dir) return;
      e.preventDefault();
      doMove(dir);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doMove]);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    doMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
  };

  const showWin = won && !keepGoing && !over;

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4 text-center">
        <Typewriter text="2048 — Evidence Merge" as="h2" className="text-xl" />
        <p className="mt-1 text-sm text-[var(--ink-dim)]">
          Arrow keys, WASD, or swipe. Merge matching tiles to file the 2048.
        </p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <GlassCard className="p-3 text-center">
          <div className="eyebrow">Score</div>
          <div className="type-heading mt-1 text-3xl">{score}</div>
        </GlassCard>
        <GlassCard className="p-3 text-center">
          <div className="eyebrow">Best</div>
          <div className="type-heading mt-1 text-3xl text-[var(--amber-glow)]">{best}</div>
        </GlassCard>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <GlassCard className="p-3">
          <div
            className="grid touch-none grid-cols-4 gap-2 select-none"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {grid.map((v, i) => (
              <div
                key={i}
                className="flex aspect-square items-center justify-center rounded-xl border border-[var(--glass-border)] bg-[rgba(0,0,0,0.25)]"
                style={tileStyle(v)}
              >
                {v > 0 && (
                  <span className={v >= 1024 ? 'text-lg' : v >= 128 ? 'text-xl' : 'text-2xl'}>
                    {v}
                  </span>
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {showWin && (
        <GlassCard className="mt-4 border-[var(--amber-glow)] p-5 text-center">
          <div className="type-heading text-xl text-[var(--amber-glow)]">🎉 Case cracked — 2048 filed!</div>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">+{XP_AWARDS.soloWin} XP logged to your detective record.</p>
          <button onClick={() => setKeepGoing(true)} className="noir-btn mt-4">
            Keep merging
          </button>
        </GlassCard>
      )}

      {over && (
        <GlassCard className="mt-4 p-5 text-center">
          <div className="type-heading text-xl">🗃️ Case cold — no moves left</div>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">Final score {score}. The evidence room awaits.</p>
          <button onClick={newGame} className="noir-btn mt-4">
            Open new case
          </button>
        </GlassCard>
      )}

      {!over && !showWin && (
        <div className="mt-4 text-center">
          <button onClick={newGame} className="noir-btn-ghost">
            ↺ New case
          </button>
        </div>
      )}
    </div>
  );
}
