'use client';

/* Snake — solo file. Canvas getaway run: arrows/WASD or swipe to steer.
 * Three speed levels, high score in localStorage, XP on a new record.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameProps } from '../types';
import { GlassCard } from '../../components/GlassCard';
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
import '../ui-kit/kit.css';
import '../ui-kit/realism.css';
import './game.css';
import {
  DifficultySelect,
  GameButton,
  ResultModal,
  ScoreHUD,
  SectionTitle,
  type Difficulty as KitDifficulty,
} from '../ui-kit';

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

/* Map the three run speeds onto the kit's easy/medium/hard scale. */
function toKitSpeed(s: SpeedId): KitDifficulty {
  return s === 'slow' ? 'easy' : s === 'normal' ? 'medium' : 'hard';
}
function fromKitSpeed(k: KitDifficulty): SpeedId {
  return k === 'easy' ? 'slow' : k === 'medium' ? 'normal' : 'fast';
}

const SPEED_OPTIONS = (Object.keys(SPEEDS) as SpeedId[]).map((spd) => {
  const [name, pace] = SPEEDS[spd].label.split(' · ');
  return {
    value: toKitSpeed(spd),
    label: name,
    hint: (pace ?? '').toUpperCase(),
  };
});

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
    ctx.fillStyle = '#0b0e0a';
    ctx.fillRect(0, 0, W, H);
    // faint grid
    ctx.strokeStyle = 'rgba(120,200,120,0.09)';
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
    // food: the classic red apple, glowing
    const fx = state.food.x * CELL + CELL / 2;
    const fy = state.food.y * CELL + CELL / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(255,64,40,0.95)';
    ctx.shadowBlur = 18;
    const glow = ctx.createRadialGradient(fx, fy, 1, fx, fy, CELL / 2 - 2);
    glow.addColorStop(0, '#ff7a5e');
    glow.addColorStop(0.55, '#d63d28');
    glow.addColorStop(1, '#8e1f12');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(fx, fy, CELL / 2 - 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(fx - 3, fy - 3, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // snake — glossy classic green segments with a top highlight
    state.snake.forEach((seg, i) => {
      const t = 1 - i / Math.max(1, state.snake.length);
      ctx.fillStyle = i === 0 ? '#9ccc65' : `rgba(104,159,56,${0.4 + 0.6 * t})`;
      const pad = i === 0 ? 1 : 2.5;
      const sx = seg.x * CELL + pad;
      const sy = seg.y * CELL + pad;
      const ss = CELL - pad * 2;
      ctx.beginPath();
      ctx.roundRect(sx, sy, ss, ss, 5);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.20)';
      ctx.beginPath();
      ctx.roundRect(sx + 3, sy + 2.5, ss - 6, Math.max(2, ss * 0.22), 3);
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
    <div className="gk-root gk-modal-scope mx-auto max-w-md">
      <div className="mb-4 text-center">
        <SectionTitle eyebrow="THE GETAWAY" title="Snake" />
        <p className="mt-2 text-sm text-[var(--ink-dim)]">
          Arrows, WASD, or swipe. Eat the red apples (+10). New record = +{XP_AWARDS.soloWin} XP.
        </p>
      </div>

      <div className="mb-4">
        <ScoreHUD
          leftLabel="SCORE"
          leftValue={state.score}
          rightLabel="HIGH"
          rightValue={high}
          record={state.score > high && state.score > 0 ? 'left' : 'none'}
        />
      </div>

      <div className="mb-4">
        <DifficultySelect
          options={SPEED_OPTIONS}
          value={toKitSpeed(speed)}
          onChange={(k) => changeSpeed(fromKitSpeed(k))}
          label="RUN SPEED"
        />
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <GlassCard className="p-3">
          <div
            className={`snk-frame touch-none select-none${state.dead ? ' snk-frame--dead' : ''}`}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <canvas
              ref={canvasRef}
              width={COLS * CELL}
              height={ROWS * CELL}
              className="snk-canvas mx-auto w-full max-w-[400px]"
            />
          </div>

          {!state.dead && (
            <div className="mt-3 text-center">
              <GameButton variant="ghost" size="sm" onClick={() => setPaused((p) => !p)}>
                {paused ? '▶ Resume' : '⏸ Pause'}
              </GameButton>
            </div>
          )}
        </GlassCard>
      </motion.div>

      <ResultModal
        open={state.dead}
        eyebrow="THE GETAWAY"
        headline="Busted"
        tone="lose"
        stat={`FINAL SCORE ${state.score}${newRecord ? ` · NEW RECORD · +${XP_AWARDS.soloWin} XP` : ''}`}
        primaryLabel="Run again"
        onPrimary={restart}
      />
    </div>
  );
}
