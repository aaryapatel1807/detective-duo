'use client';

/* 2048 — solo file. Arrow keys / WASD / swipe to slide the evidence tiles.
 * Best score persists in localStorage; 2048 tile awards solo XP once.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameProps } from '../types';
import { GlassCard } from '../../components/GlassCard';
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
import '../ui-kit/kit.css';
import '../ui-kit/realism.css';
import './game.css';
import { GameButton, ResultModal, ScoreHUD, SectionTitle } from '../ui-kit';

const BEST_KEY = 'dd-solo-2048-best';

function freshGrid(): Grid {
  let g = emptyGrid();
  g = spawnTile(g).grid;
  g = spawnTile(g).grid;
  return g;
}

/* Value tier → beveled tile class (game.css). Values past 2048 share the max tier. */
function tileClass(v: number): string {
  if (v === 0) return 'x48-empty';
  const tier = v <= 2048 && (v & (v - 1)) === 0 ? `x48-t${v}` : 'x48-tmax';
  return `x48-tile ${tier}`;
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
    <div className="gk-root gk-modal-scope mx-auto max-w-md">
      <div className="mb-4 text-center">
        <SectionTitle eyebrow="NOIR DETECTIVE" title="2048 · Evidence Merge" />
        <p className="mt-2 text-sm text-[var(--gk-ink-dim)]">
          Arrow keys, WASD, or swipe. Merge matching tiles to file the 2048.
        </p>
      </div>

      <div className="mb-4">
        <ScoreHUD leftLabel="SCORE" leftValue={score} rightLabel="BEST" rightValue={best} />
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <GlassCard className="p-3">
          <div
            className="x48-board grid touch-none grid-cols-4 gap-2 select-none"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {grid.map((v, i) => (
              <div key={i} className={`flex aspect-square items-center justify-center ${tileClass(v)}`}>
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

      {!over && !showWin && (
        <div className="mt-4 text-center">
          <GameButton variant="ghost" size="sm" onClick={newGame}>
            ↺ New case
          </GameButton>
        </div>
      )}

      <ResultModal
        open={showWin}
        eyebrow="2048 · NOIR DETECTIVE"
        headline="Case Cracked"
        tone="win"
        stat={`SCORE ${score} · BEST ${best} · +${XP_AWARDS.soloWin} XP`}
        primaryLabel="Keep merging"
        onPrimary={() => setKeepGoing(true)}
        secondaryLabel="New case"
        onSecondary={newGame}
      />

      <ResultModal
        open={over}
        eyebrow="NO MOVES LEFT"
        headline="Case Cold"
        tone="lose"
        stat={`FINAL SCORE ${score} · BEST ${best}`}
        primaryLabel="Open new case"
        onPrimary={newGame}
      />
    </div>
  );
}
