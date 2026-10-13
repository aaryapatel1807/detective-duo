'use client';

/* Draw & Guess — one detective sketches a secret noir word on canvas while
 * the other guesses. 60 seconds on the clock, then the pencil swaps hands.
 * Live stroke batches travel via room.send actions; finalized strokes persist
 * in shared state for rejoins.
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import '../ui-kit/kit.css';
import {
  GameButton,
  ScoreHUD,
  TurnBanner,
  ResultModal,
  TimerChip,
  SectionTitle,
} from '../ui-kit';
import type { GameProps } from '../types';
import type { DrawShared, Stroke, StrokePoint } from './types';
import { randomWord } from './words';
import {
  DRAW_SECONDS,
  DRAWER_SCORE,
  ROUNDS,
  guesserScore,
  isCorrectGuess,
  secondsLeft,
} from './logic';
import { awardXP, syncXpToRoom, XP_AWARDS } from '../../lib/xp';
import { sounds } from '../../lib/sound';

const W = 600;
const H = 400;
const CHALK = ['#f5f0e6', '#f0b429', '#e5484d']; // chalk, amber, blood
const ACTION = 'draw-guess:stroke';

function paintStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
  if (s.pts.length === 0) return;
  ctx.strokeStyle = s.color;
  ctx.lineWidth = s.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(s.pts[0].x, s.pts[0].y);
  for (const p of s.pts) ctx.lineTo(p.x, p.y);
  ctx.stroke();
}

export default function DrawGuessGame({ room }: GameProps) {
  const gs: DrawShared = room.shared?.games?.['draw-guess'] ?? {};
  const phase = gs.phase ?? 'lobby';
  const round = gs.round ?? 1;
  const drawer = gs.drawer ?? null;
  const guesser = gs.guesser ?? null;
  const word = gs.word ?? '';
  const strokes = gs.strokes ?? [];
  const startedAt = gs.startedAt ?? 0;
  const reason = gs.reason ?? null;
  const roundWinner = gs.roundWinner ?? null;
  const scores = gs.scores ?? {};
  const matchWinner = gs.matchWinner ?? null;
  const me = room.me.id;
  const peer = room.peer;
  const awardedRef = useRef(false);

  const [color, setColor] = useState(CHALK[0]);
  const [guess, setGuess] = useState('');
  const [hint, setHint] = useState('');
  const [tick, setTick] = useState(Date.now());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const curStroke = useRef<{ id: string; pts: StrokePoint[] } | null>(null);
  const strokeN = useRef(0);
  const lastSend = useRef(0);
  const gStrokes = useRef(new Map<string, Stroke>());
  const strokesRef = useRef<Stroke[]>([]);
  const colorRef = useRef(color);
  colorRef.current = color;

  const isDrawer = me === drawer;
  const isGuesser = me === guesser;
  const set = (patch: Partial<DrawShared>) =>
    room.setShared({ games: { 'draw-guess': patch } });

  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  useEffect(() => {
    if (matchWinner && matchWinner === me && !awardedRef.current) {
      awardedRef.current = true;
      awardXP(XP_AWARDS.duoWin);
      syncXpToRoom(room.setShared, me, room.me.name);
      sounds.stampThud();
    }
  }, [matchWinner, me, room]);

  const clearCanvas = () => {
    const c = canvasRef.current;
    const ctx = c?.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, W, H);
  };

  const paintGuesser = () => {
    const c = canvasRef.current;
    const ctx = c?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    for (const s of gStrokes.current.values()) paintStroke(ctx, s);
  };

  // Live stroke batches from the drawer.
  useEffect(() => {
    if (!isGuesser) return;
    return room.onAction(ACTION, (p: unknown) => {
      const msg = p as { round?: number; clear?: boolean; stroke?: Stroke } | null;
      if (!msg || msg.round !== round) return;
      if (msg.clear) {
        gStrokes.current.clear();
        paintGuesser();
        return;
      }
      if (msg.stroke?.id) {
        gStrokes.current.set(msg.stroke.id, msg.stroke);
        paintGuesser();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, isGuesser, round]);

  // Fresh canvas on round / phase changes.
  useEffect(() => {
    gStrokes.current.clear();
    setGuess('');
    setHint('');
    clearCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, phase]);

  // Catch-up from shared strokes (rejoins, finalized strokes).
  useEffect(() => {
    if (!isGuesser) return;
    gStrokes.current = new Map(strokes.map((s) => [s.id, s]));
    paintGuesser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuesser, strokes]);

  // Countdown + timeout.
  useEffect(() => {
    if (phase !== 'drawing') return;
    const t = setInterval(() => setTick(Date.now()), 500);
    return () => clearInterval(t);
  }, [phase]);

  const left = phase === 'drawing' && startedAt > 0 ? secondsLeft(startedAt, tick) : DRAW_SECONDS;

  useEffect(() => {
    if (phase !== 'drawing' || startedAt <= 0 || left > 0) return;
    const done = round >= ROUNDS;
    const mw = done ? ((scores[me] ?? 0) >= (scores[peer?.id ?? ''] ?? 0) ? me : (peer?.id ?? null)) : null;
    set({ phase: 'roundEnd', reason: 'timeout', roundWinner: null, matchWinner: mw });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, phase, startedAt]);

  const nameOf = (pid: string | null): string =>
    pid === null ? '—' : pid === me ? room.me.name : (peer?.name ?? 'Partner');

  const startMatch = () => {
    if (!peer) return;
    const [d, g] = me < peer.id ? [me, peer.id] : [peer.id, me];
    sounds.paperShuffle();
    set({
      phase: 'ready', round: 1, drawer: d, guesser: g, word: randomWord(),
      strokes: [], startedAt: 0, reason: null, roundWinner: null,
      scores: {}, matchWinner: null,
    });
  };

  const beginDrawing = () => {
    sounds.paperShuffle();
    clearCanvas();
    set({ phase: 'drawing', startedAt: Date.now(), strokes: [] });
  };

  const toLocal = (e: React.PointerEvent): StrokePoint => {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    };
  };

  const publish = (partial: boolean) => {
    const cur = curStroke.current;
    if (!cur) return;
    const stroke: Stroke = { id: cur.id, pts: [...cur.pts], color: colorRef.current, width: 4 };
    room.send(ACTION, { stroke, round });
    if (!partial) set({ strokes: [...strokesRef.current, stroke] });
  };

  const onDown = (e: React.PointerEvent) => {
    if (phase !== 'drawing' || !isDrawer) return;
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    const pt = toLocal(e);
    curStroke.current = { id: `${me}-${strokeN.current++}`, pts: [pt] };
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.fillStyle = colorRef.current;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    sounds.typewriterClick();
  };

  const onMove = (e: React.PointerEvent) => {
    const cur = curStroke.current;
    if (!cur || phase !== 'drawing' || !isDrawer) return;
    const pt = toLocal(e);
    const prev = cur.pts[cur.pts.length - 1];
    cur.pts.push(pt);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = colorRef.current;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    }
    const now = Date.now();
    if (now - lastSend.current > 200) {
      lastSend.current = now;
      publish(true);
    }
  };

  const onUp = () => {
    if (!curStroke.current) return;
    publish(false);
    curStroke.current = null;
  };

  const clearBoard = () => {
    if (!isDrawer) return;
    clearCanvas();
    set({ strokes: [] });
    room.send(ACTION, { clear: true, round });
  };

  const submitGuess = () => {
    if (phase !== 'drawing' || !isGuesser || !guess.trim() || !drawer) return;
    if (isCorrectGuess(guess, word)) {
      const ns = {
        ...scores,
        [me]: (scores[me] ?? 0) + guesserScore(left),
        [drawer]: (scores[drawer] ?? 0) + DRAWER_SCORE,
      };
      const done = round >= ROUNDS;
      const mw = done ? (ns[me] >= ns[drawer] ? me : drawer) : null;
      sounds.stampThud();
      set({ phase: 'roundEnd', reason: 'guessed', roundWinner: me, scores: ns, matchWinner: mw });
    } else {
      sounds.typewriterClick();
      setHint('Not quite — study the sketch.');
      setGuess('');
    }
  };

  const nextRound = () => {
    sounds.paperShuffle();
    set({
      phase: 'ready', round: round + 1, drawer: guesser, guesser: drawer,
      word: randomWord(), strokes: [], startedAt: 0, reason: null, roundWinner: null,
    });
  };

  const wordMask = word.replace(/[^\s]/g, '_ ').trim();

  return (
    <div className="gk-root space-y-4">
      <SectionTitle
        eyebrow={`ROUND ${round} OF ${ROUNDS} · ${DRAW_SECONDS}S ON THE CLOCK`}
        title="✏️ Draw & Guess"
      />
      <ScoreHUD
        leftLabel="YOU"
        leftValue={scores[me] ?? 0}
        rightLabel="OPPONENT"
        rightValue={scores[peer?.id ?? ''] ?? 0}
      />

      {!peer && (
        <div className="glass-card p-4 text-sm">
          ⏳ Waiting for your partner… (code <span className="font-bold">{room.roomCode ?? '—'}</span>)
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card gk-modal-scope p-4">
        {phase === 'lobby' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-center text-sm opacity-70">
              Sketch the secret word before the clock runs out — then swap the pencil.
            </p>
            <GameButton onClick={startMatch} disabled={!peer}>
              📁 Open the case
            </GameButton>
          </div>
        )}

        {phase === 'ready' && (
          <div className="flex flex-col items-center gap-3 py-8">
            {isDrawer ? (
              <>
                <p className="text-xs tracking-widest opacity-70">
                  YOUR SECRET WORD — hide it from your partner
                </p>
                <p className="text-3xl font-bold text-amber-200">
                  {word}
                </p>
                <GameButton className="mt-2" onClick={beginDrawing}>
                  ✏️ Start drawing (60s)
                </GameButton>
              </>
            ) : (
              <p className="text-sm opacity-70">
                {nameOf(drawer)} is studying their secret word…
              </p>
            )}
          </div>
        )}

        {(phase === 'drawing' || phase === 'roundEnd') && (
          <>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm">
                {isDrawer ? (
                  <>Draw: <span className="font-bold text-amber-200">{word}</span></>
                ) : (
                  <>Guess the sketch: <span className="tracking-[0.3em]">{wordMask}</span></>
                )}
              </p>
              <div className="flex items-center gap-2">
                {phase === 'drawing' && <TimerChip seconds={left} label="TIME" />}
                {isDrawer && phase === 'drawing' && (
                  <>
                    {CHALK.map((c) => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        className={`h-9 w-9 rounded-full border-2 ${color === c ? 'border-amber-300' : 'border-white/20'}`}
                        style={{ background: c }}
                        title="chalk color"
                        aria-label="chalk color"
                      />
                    ))}
                    <GameButton variant="ghost" size="sm" className="ml-1" onClick={clearBoard}>
                      🧹 Clear
                    </GameButton>
                  </>
                )}
              </div>
            </div>

            {phase === 'drawing' && (
              <TurnBanner
                isYourTurn
                yourText={isDrawer ? '✏️ Your sketch — draw' : '🕵️ Your guess — study the sketch'}
              />
            )}

            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              className="w-full rounded-lg border border-white/10 bg-[#141210]"
              style={{ touchAction: 'none', cursor: isDrawer && phase === 'drawing' ? 'crosshair' : 'default' }}
            />

            {isGuesser && phase === 'drawing' && (
              <div className="mt-3 flex gap-2">
                <input
                  className="noir-input flex-1"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitGuess()}
                  placeholder="Type your guess…"
                  maxLength={40}
                />
                <GameButton onClick={submitGuess}>
                  🕵️ Guess
                </GameButton>
              </div>
            )}
            {hint && isGuesser && phase === 'drawing' && (
              <p className="mt-1 text-xs text-amber-200/80">{hint}</p>
            )}

            <ResultModal
              open={phase === 'roundEnd'}
              eyebrow={matchWinner ? 'SKETCHBOOK DECIDED' : `ROUND ${round} CLOSED`}
              headline={
                reason === 'guessed'
                  ? `${nameOf(roundWinner)} cracked it`
                  : "Time's up"
              }
              tone={reason === 'guessed' && roundWinner === me ? 'win' : reason === 'guessed' ? 'lose' : 'draw'}
              stat={`THE WORD WAS "${word.toUpperCase()}"`}
              primaryLabel={matchWinner ? '🔁 New match' : '➡️ Next round'}
              onPrimary={matchWinner ? startMatch : nextRound}
            />
          </>
        )}
      </motion.div>
    </div>
  );
}
