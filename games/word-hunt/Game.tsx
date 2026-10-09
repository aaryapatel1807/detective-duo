'use client';

/* Word Hunt — shared Boggle grid, 90-second race. Both detectives hunt
 * words simultaneously; highest score wins.
 * State: room.shared.games['word-hunt'] (see types.ts).
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameProps } from '../types';
import type { WordHuntShared } from './types';
import {
  boggleScore,
  totalScore,
  validateWord,
  wordHuntWinner,
  WORD_HUNT_SECONDS,
} from './logic';
import { WORDS_4, WORDS_5, WORDS_6, rollBoggle } from '../../lib/content/words';
import { awardXP, syncXpToRoom, XP_AWARDS } from '../../lib/xp';
import { sounds } from '../../lib/sound';
import { GlassCard } from '../../components/GlassCard';
import { Typewriter } from '../../components/Typewriter';
import { ManilaFolder } from '../../components/props';

const SLUG = 'word-hunt';
const BANK = [...WORDS_4, ...WORDS_5, ...WORDS_6];

const REJECT_LABEL: Record<string, string> = {
  'too-short': 'Too short — 4+ letters.',
  'not-in-dictionary': 'Not in the case dictionary.',
  'not-on-board': 'Cannot be traced on the grid.',
  'already-found': 'Already in your evidence bag.',
};

function playerName(room: GameProps['room'], pid: string | null | undefined): string {
  if (!pid) return '—';
  if (pid === room.me.id) return 'You';
  return room.peer?.name ?? 'Partner';
}

function fmtClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function WordHuntGame({ room }: GameProps) {
  const gs: WordHuntShared = room.shared?.games?.[SLUG] ?? {};
  const phase = gs.phase ?? 'lobby';
  const board = gs.board ?? [];
  const endsAt = gs.endsAt ?? 0;
  const words = gs.words ?? {};
  const done = gs.done ?? {};
  const winner = gs.winner ?? null;
  const awardedRef = useRef(false);

  const [input, setInput] = useState('');
  const [reject, setReject] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const ids = room.peer ? [room.me.id, room.peer.id] : [room.me.id];
  const myWords = words[room.me.id] ?? [];
  const myScore = totalScore(myWords);
  const peerWords = room.peer ? words[room.peer.id] ?? [] : [];
  const timeLeft = endsAt - Date.now();
  const expired = phase === 'play' && timeLeft <= 0;

  // countdown ticker
  useEffect(() => {
    if (phase !== 'play') return;
    const id = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, [phase]);

  // when my clock runs out, mark myself done
  useEffect(() => {
    if (expired && !done[room.me.id]) {
      room.setShared({ games: { [SLUG]: { done: { [room.me.id]: true } } } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expired]);

  const derived = endsAt
    ? wordHuntWinner(words, done, ids, endsAt, Date.now())
    : null;
  useEffect(() => {
    if (phase === 'play' && derived && winner !== derived) {
      room.setShared({ games: { [SLUG]: { phase: 'over', winner: derived } } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [derived, phase]);

  useEffect(() => {
    if (winner && winner !== 'draw' && winner === room.me.id && !awardedRef.current) {
      awardedRef.current = true;
      awardXP(XP_AWARDS.duoWin);
      syncXpToRoom(room.setShared, room.me.id, room.me.name);
      sounds.stampThud();
    }
  }, [winner, room]);

  const write = (patch: Partial<WordHuntShared>) =>
    room.setShared({ games: { [SLUG]: patch } });

  const startHunt = () => {
    awardedRef.current = false;
    sounds.paperShuffle();
    write({
      phase: 'play',
      board: rollBoggle(),
      endsAt: Date.now() + WORD_HUNT_SECONDS * 1000,
      words: {},
      done: {},
      winner: null,
    });
  };

  const submit = () => {
    const w = input.trim().toUpperCase();
    setInput('');
    if (phase !== 'play' || expired || !w) return;
    const problem = validateWord(board, BANK, myWords, w);
    if (problem) {
      setReject(REJECT_LABEL[problem]);
      return;
    }
    setReject(null);
    sounds.typewriterClick();
    write({ words: { [room.me.id]: [...myWords, w] } });
  };

  const reset = () => {
    awardedRef.current = false;
    write({ phase: 'lobby', board: [], endsAt: 0, words: {}, done: {}, winner: null });
  };

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 text-center">
        <div className="eyebrow">Case file № 44 — Word & Code Duels</div>
        <Typewriter as="h2" text="WORD HUNT" className="type-heading mt-1 text-3xl" />
        <p className="mt-1 text-sm text-[var(--ink-dim)]">
          One grid, {WORD_HUNT_SECONDS} seconds, both detectives hunting at once. Most points wins.
        </p>
      </div>

      {phase === 'lobby' && (
        <ManilaFolder className="p-6 text-center">
          <div className="type-heading text-xl">The Evidence Grid</div>
          <p className="mt-2 text-sm text-[var(--ink-dim)]">
            Find words of 4+ letters in the case dictionary — trace adjacent tiles (including
            diagonals). Longer words score more.
          </p>
          {!room.peer && (
            <p className="mt-2 text-xs text-[var(--ink-faint)]">
              Solo practice — create a room from the hub to race live.
            </p>
          )}
          <button onClick={startHunt} className="noir-btn mt-5">
            🎲 Roll the dice — start the clock
          </button>
        </ManilaFolder>
      )}

      {phase === 'play' && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div className="eyebrow">⏱ {fmtClock(timeLeft)} left</div>
            <div className="eyebrow">
              You: {myScore} pts · {room.peer ? `${playerName(room, room.peer.id)}: ${peerWords.length} words` : 'solo'}
            </div>
          </div>

          {/* board */}
          <div className="mx-auto mt-4 grid max-w-[20rem] grid-cols-4 gap-1.5">
            {board.map((t, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className="flex aspect-square items-center justify-center rounded-lg border border-[var(--brass)] bg-[rgba(0,0,0,0.35)] font-type text-2xl text-[var(--amber-glow)]"
              >
                {t === 'Q' ? 'Qu' : t}
              </motion.div>
            ))}
          </div>

          {expired ? (
            <div className="paper-strip mt-4 text-center">
              ⏰ Time! Tallying the evidence…
            </div>
          ) : (
            <>
              <div className="mt-4 flex justify-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  placeholder="TYPE A WORD"
                  maxLength={8}
                  className="noir-input w-48 text-center font-type text-lg tracking-[0.2em]"
                />
                <button onClick={submit} className="noir-btn">
                  📌 Pin it
                </button>
              </div>
              {reject && (
                <div className="mt-2 text-center text-xs text-[var(--blood)]">{reject}</div>
              )}
            </>
          )}

          {/* my words */}
          <div className="paper-strip mt-4">
            <div className="eyebrow mb-1">
              Your evidence bag — {myWords.length} words, {myScore} pts
            </div>
            <div className="flex flex-wrap gap-1.5">
              {myWords.map((w, i) => (
                <span
                  key={i}
                  className="rounded border border-[var(--glass-border)] bg-[rgba(255,255,255,0.05)] px-2 py-0.5 font-type text-sm"
                >
                  {w} <span className="text-[var(--amber-glow)]">+{boggleScore(w)}</span>
                </span>
              ))}
              {myWords.length === 0 && (
                <span className="text-xs text-[var(--ink-faint)]">Nothing pinned yet…</span>
              )}
            </div>
          </div>
        </GlassCard>
      )}

      {phase === 'over' && (
        <ManilaFolder className="p-6 text-center">
          <div className="type-heading text-2xl">
            {winner === 'draw'
              ? '🤝 Dead heat — a draw'
              : winner === room.me.id
                ? '🏆 Sharpest eyes on the force!'
                : `🕵️ ${playerName(room, winner)} found more`}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-left">
            {ids.map((pid) => (
              <div key={pid} className="glass-card !rounded-2xl p-3">
                <div className="eyebrow">{playerName(room, pid)}</div>
                <div className="type-heading mt-1 text-3xl">{totalScore(words[pid] ?? [])}</div>
                <div className="mt-1 text-xs text-[var(--ink-dim)]">
                  {(words[pid] ?? []).join(', ') || '—'}
                </div>
              </div>
            ))}
          </div>
          <button onClick={reset} className="noir-btn mt-5">
            🔁 New hunt
          </button>
        </ManilaFolder>
      )}
    </div>
  );
}
