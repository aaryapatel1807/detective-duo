'use client';

/* Snake — solo file. Canvas getaway run: arrows/WASD or swipe to steer.
 * Three speed levels, high score in localStorage, XP on a new record.
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
  COLS,
  ROWS,
  SPEEDS,
  initSnake,
  queueDirection,
  step,
  type SnakeState,
  type SpeedId,
  type Vec,
} from './logic';

const HIGH_KEY = 'dd-solo-snake-high';
const CELL = 20;

const DIRS: Record<string, Vec> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
  W: { x: 0, y: -1 },
  S: { x: 0, y: 1 },
  A: { x: -1, y: 0 },
  D: { x: 1, y: 0 },
};

export default function SnakeGame({ room }: GameProps) {
  const [speed, setSpeed] = useState<SpeedId>('normal');
  const [state, setState] = useState<SnakeState>(() => initSnake());
  const [high, setHigh] = useState(() => readJSON<number>(HIGH_KEY, 0));
  const [paused, setPaused] = useState(false);
  const [newRecord, setNewRecord] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  // Game loop.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (pausedRef.current) return;
      setState((s) => {
        if (s.dead) return s;
        const next = step(s);
        if (next.dead) sounds.paperShuffle();
        else if (next.score > s.score) sounds.pinTap();
        return next;
      });
    }, SPEEDS[speedRef.current].ms);
    return () => window.clearInterval(id);
  }, []);

  const steer = useCallback((d: Vec) => {
    setState((s) => (s.dead ? s : queueDirection(s, d)));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const d = DIRS[e.key];
      if (!d) return;
      e.preventDefault();
      steer(d);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [steer]);

  // Record + XP when the run ends on a new high score.
  useEffect(() => {
    if (!state.dead || state.score <= 0) return;
    setHigh((h) => {
      if (state.score > h) {
        writeJSON(HIGH_KEY, state.score);
        setNewRecord(true);
        awardXP(XP_AWARDS.soloWin);
        syncXpToRoom(room.setShared, room.me.id, room.me.name);
        sounds.xpTick();
        return state.score;
      }
      return h;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.dead]);

  const restart = () => {
    setState(initSnake());
    setPaused(false);
    setNewRecord(false);
    sounds.paperShuffle();
  };

  const changeSpeed = (spd: SpeedId) => {
    setSpeed(spd);
    speedRef.current = spd;
    restart();
  };

  // Render to canvas.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = COLS * CELL;
    const H = ROWS * CELL;
    ctx.fillStyle = '#14100c';
    ctx.fillRect(0, 0, W, H);
    // faint grid
    ctx.strokeStyle = 'rgba(232,163,61,0.07)';
    ctx.lineWidth = 1;
    for (let x = 1; x < COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, H);
      ctx.stroke();
    }
    for (let y = 1; y < ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL);
      ctx.lineTo(W, y * CELL);
      ctx.stroke();
    }
    // food: the evidence dossier
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(state.food.x * CELL + CELL / 2, state.food.y * CELL + CELL / 2, CELL / 2 - 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(232,163,61,0.9)';
    ctx.fillRect(state.food.x * CELL + CELL / 2 - 1.5, state.food.y * CELL + 5, 3, CELL - 10);
    // snake
    state.snake.forEach((seg, i) => {
      const t = 1 - i / Math.max(1, state.snake.length);
      ctx.fillStyle = i === 0 ? '#e8a33d' : `rgba(200,140,50,${0.35 + 0.55 * t})`;
      const pad = i === 0 ? 1 : 2.5;
      ctx.beginPath();
      ctx.roundRect(seg.x * CELL + pad, seg.y * CELL + pad, CELL - pad * 2, CELL - pad * 2, 5);
      ctx.fill();
    });
    if (state.dead) {
      ctx.fillStyle = 'rgba(10,8,6,0.72)';
      ctx.fillRect(0, 0, W, H);
    }
  }, [state]);

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
    steer(
      Math.abs(dx) > Math.abs(dy)
        ? { x: dx > 0 ? 1 : -1, y: 0 }
        : { x: 0, y: dy > 0 ? 1 : -1 },
    );
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4 text-center">
        <Typewriter text="Snake — The Getaway" as="h2" className="text-xl" />
        <p className="mt-1 text-sm text-[var(--ink-dim)]">
          Arrows, WASD, or swipe. Eat the red dossiers (+10). New record = +{XP_AWARDS.soloWin} XP.
        </p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <GlassCard className="p-3 text-center">
          <div className="eyebrow">Score</div>
          <div className="type-heading mt-1 text-3xl">{state.score}</div>
        </GlassCard>
        <GlassCard className="p-3 text-center">
          <div className="eyebrow">High score</div>
          <div className="type-heading mt-1 text-3xl text-[var(--amber-glow)]">{high}</div>
        </GlassCard>
      </div>

      <div className="mb-3 flex flex-wrap justify-center gap-2">
        {(Object.keys(SPEEDS) as SpeedId[]).map((spd) => (
          <button
            key={spd}
            onClick={() => changeSpeed(spd)}
            className={spd === speed ? 'noir-btn !py-2' : 'noir-btn-ghost !py-2'}
          >
            {SPEEDS[spd].label}
          </button>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <GlassCard className="p-3">
          <div
            className="touch-none select-none"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <canvas
              ref={canvasRef}
              width={COLS * CELL}
              height={ROWS * CELL}
              className="mx-auto w-full max-w-[400px] rounded-xl"
            />
          </div>

          {state.dead && (
            <div className="mt-3 text-center">
              <div className="type-heading text-lg">
                🚔 Busted! Final score {state.score}
              </div>
              {newRecord && (
                <p className="mt-1 text-sm text-[var(--amber-glow)]">
                  🏆 New record! +{XP_AWARDS.soloWin} XP filed.
                </p>
              )}
              <div className="mt-3 flex justify-center gap-2">
                <button onClick={() => restart()} className="noir-btn">
                  ↺ Run again
                </button>
              </div>
            </div>
          )}
          {!state.dead && (
            <div className="mt-3 text-center">
              <button onClick={() => setPaused((p) => !p)} className="noir-btn-ghost !py-2">
                {paused ? '▶ Resume' : '⏸ Pause'}
              </button>
            </div>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
}
