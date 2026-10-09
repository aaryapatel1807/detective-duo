'use client';

/* Truth or Dare — co-op noir card table.
 * Detectives alternate drawing from a shuffled deck of truths and dares.
 * Marking a card done earns both detectives XP and records a co-op win
 * (unlocking love notes).
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameProps } from '../types';
import type { ToDShared } from './types';
import { CARD_XP, buildDeck } from './logic';
import { awardXP, syncXpToRoom } from '../../lib/xp';
import { recordCoopWin } from '../../lib/lovenotes';
import { sounds } from '../../lib/sound';

export default function TruthOrDareGame({ room }: GameProps) {
  const gs: ToDShared = room.shared?.games?.['truth-or-dare'] ?? {};
  const phase = gs.phase ?? 'lobby';
  const deck = gs.deck ?? [];
  const idx = gs.idx ?? 0;
  const turn = gs.turn ?? null;
  const doneCount = gs.doneCount ?? 0;
  const me = room.me.id;
  const peer = room.peer;
  const awardedRef = useRef(0);
  const [spinning, setSpinning] = useState(false);

  const card = deck[idx] ?? null;
  const deckDone = idx >= deck.length && deck.length > 0;
  const myTurn = turn === me;

  const set = (patch: Partial<ToDShared>) =>
    room.setShared({ games: { 'truth-or-dare': patch } });

  // Each detective awards themselves XP once per completed card.
  useEffect(() => {
    if (doneCount > awardedRef.current) {
      awardedRef.current = doneCount;
      awardXP(CARD_XP);
      recordCoopWin();
      syncXpToRoom(room.setShared, me, room.me.name);
      sounds.xpTick();
    }
  }, [doneCount, me, room]);

  const nameOf = (pid: string | null): string =>
    pid === null ? '—' : pid === me ? room.me.name : (peer?.name ?? 'Partner');

  const startDeck = () => {
    if (!peer) return;
    sounds.paperShuffle();
    set({
      phase: 'lobby', deck: buildDeck(), idx: 0,
      turn: me < peer.id ? me : peer.id, doneCount: 0,
    });
  };

  const spin = () => {
    if (!myTurn || phase !== 'lobby' || deckDone) return;
    sounds.paperShuffle();
    setSpinning(true);
    // Brief noir shuffle animation, then reveal the card to both.
    setTimeout(() => {
      setSpinning(false);
      sounds.pinTap();
      set({ phase: 'spun' });
    }, 900);
  };

  const markDone = () => {
    if (!myTurn || phase !== 'spun' || !card) return;
    sounds.stampThud();
    const other = peer?.id ?? null;
    set({
      phase: 'lobby', idx: idx + 1,
      turn: turn === me ? other : me,
      doneCount: doneCount + 1,
    });
  };

  const skip = () => {
    if (!myTurn || phase !== 'spun') return;
    const other = peer?.id ?? null;
    set({ phase: 'lobby', idx: idx + 1, turn: turn === me ? other : me });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 style={{ fontFamily: 'var(--font-type)' }} className="text-xl tracking-wide">
          🃏 TRUTH OR DARE
        </h2>
        <div className="text-sm opacity-80" style={{ fontFamily: 'var(--font-type)' }}>
          CARDS COMPLETED: {doneCount} · TURN: {nameOf(turn).toUpperCase()}
        </div>
      </div>

      {!peer && (
        <div className="glass-card p-4 text-sm" style={{ fontFamily: 'var(--font-type)' }}>
          ⏳ Waiting for your partner… (code <span className="font-bold">{room.roomCode ?? '—'}</span>)
        </div>
      )}

      <div className="mx-auto max-w-md">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          {deck.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-8">
              <p className="text-center text-sm opacity-70" style={{ fontFamily: 'var(--font-type)' }}>
                A fresh deck of sealed cards, straight from the precinct's back room.
              </p>
              <button className="noir-btn" onClick={startDeck} disabled={!peer}>
                🃏 Shuffle the deck
              </button>
            </div>
          )}

          {deck.length > 0 && deckDone && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="text-4xl">🕯️</div>
              <p className="text-center text-sm" style={{ fontFamily: 'var(--font-type)' }}>
                The deck is spent — {doneCount} cards completed, detectives.
              </p>
              <button className="noir-btn" onClick={startDeck}>🔁 Shuffle again</button>
            </div>
          )}

          {deck.length > 0 && !deckDone && phase === 'lobby' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <motion.div
                animate={spinning ? { rotate: [0, 8, -8, 0], scale: [1, 1.06, 1] } : {}}
                transition={{ duration: 0.9 }}
                className="manila-folder flex h-44 w-64 items-center justify-center"
              >
                <span className="text-5xl">🂠</span>
              </motion.div>
              <p className="text-center text-sm opacity-80" style={{ fontFamily: 'var(--font-type)' }}>
                {myTurn ? 'Your draw, detective.' : `${nameOf(turn)} draws the next card…`}
              </p>
              <button className="noir-btn" onClick={spin} disabled={!myTurn || spinning}>
                {spinning ? 'Shuffling…' : '🃏 Draw a card'}
              </button>
            </div>
          )}

          {deck.length > 0 && !deckDone && phase === 'spun' && card && (
            <motion.div
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center gap-4 py-4"
            >
              <div className="manila-folder w-full p-6 text-center">
                <p className="text-xs tracking-[0.3em] opacity-70" style={{ fontFamily: 'var(--font-type)' }}>
                  {card.type === 'truth' ? '🤫 TRUTH' : '🔥 DARE'}
                </p>
                <p className="mt-3 text-lg" style={{ fontFamily: 'var(--font-type)' }}>
                  {card.text}
                </p>
                <p className="mt-3 text-xs opacity-60" style={{ fontFamily: 'var(--font-type)' }}>
                  For: {nameOf(turn)}
                </p>
              </div>
              {myTurn ? (
                <div className="flex gap-2">
                  <button className="noir-btn" onClick={markDone}>
                    ✅ Done (+{CARD_XP} XP both)
                  </button>
                  <button className="noir-btn noir-btn-ghost" onClick={skip}>
                    Skip
                  </button>
                </div>
              ) : (
                <p className="text-sm opacity-70" style={{ fontFamily: 'var(--font-type)' }}>
                  Waiting on {nameOf(turn)}…
                </p>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>

      <p className="text-center text-xs opacity-60" style={{ fontFamily: 'var(--font-type)' }}>
        Every completed card earns both detectives {CARD_XP} XP and seals a co-op win. 💌
      </p>
    </div>
  );
}
