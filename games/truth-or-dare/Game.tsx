'use client';

/* Truth or Dare — co-op noir card table.
 * Detectives alternate drawing from a shuffled deck of truths and dares.
 * Marking a card done earns both detectives XP and records a co-op win
 * (unlocking love notes).
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import '../ui-kit/kit.css';
import '../ui-kit/realism.css';
import './truth-or-dare.css';
import {
  GameButton,
  ScoreHUD,
  TurnBanner,
  ResultModal,
  SectionTitle,
  PlayingCard,
} from '../ui-kit';
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
    <div className="gk-root space-y-4">
      <SectionTitle
        eyebrow="CO-OP CARD TABLE"
        title="🃏 Truth or Dare"
      />
      <ScoreHUD
        leftLabel="COMPLETED"
        leftValue={doneCount}
        rightLabel="IN DECK"
        rightValue={deck.length > 0 ? Math.max(0, deck.length - idx) : 0}
      />

      {!peer && (
        <div className="glass-card p-4 text-sm">
          ⏳ Waiting for your partner… (code <span className="font-bold">{room.roomCode ?? '—'}</span>)
        </div>
      )}

      <div className="mx-auto max-w-md">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card gk-modal-scope p-6">
          {deck.length > 0 && !deckDone && (
            <TurnBanner
              isYourTurn={myTurn}
              yourText="Your draw, detective"
              theirText={`${nameOf(turn)} draws…`}
            />
          )}

          {deck.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-8">
              <p className="text-center text-sm opacity-70">
                A fresh deck of sealed cards, straight from the precinct's back room.
              </p>
              <GameButton onClick={startDeck} disabled={!peer}>
                🃏 Shuffle the deck
              </GameButton>
            </div>
          )}

          {deck.length > 0 && !deckDone && phase === 'lobby' && (
            <div className="tod-table flex flex-col items-center gap-4 py-6">
              <motion.div
                animate={spinning ? { rotate: [0, 8, -8, 0], scale: [1, 1.06, 1] } : {}}
                transition={{ duration: 0.9 }}
              >
                <button
                  type="button"
                  onClick={spin}
                  disabled={!myTurn || spinning}
                  className="tod-deck"
                  aria-label={myTurn ? 'Draw a card from the deck' : `${nameOf(turn)} draws the next card`}
                >
                  <PlayingCard faceDown ariaLabel="Card back" />
                  <PlayingCard faceDown ariaLabel="Card back" />
                  <PlayingCard faceDown ariaLabel="Card back" />
                </button>
              </motion.div>
              <div className="tod-deck__label">
                {deck.length - idx} cards left
              </div>
              <p className="text-center text-sm opacity-80">
                {myTurn ? 'Your draw, detective — tap the deck.' : `${nameOf(turn)} draws the next card…`}
              </p>
              <GameButton onClick={spin} disabled={!myTurn || spinning}>
                {spinning ? 'Shuffling…' : '🃏 Draw a card'}
              </GameButton>
            </div>
          )}

          {deck.length > 0 && !deckDone && phase === 'spun' && card && (
            <div className="tod-table flex flex-col items-center gap-4 py-4">
              <div className={`tod-card ${card.type === 'truth' ? 'tod-card--truth' : 'tod-card--dare'}`}>
                <span className="tod-card__type">
                  {card.type === 'truth' ? '🤫 Truth' : '🔥 Dare'}
                </span>
                <p className="tod-card__text">
                  {card.text}
                </p>
                <p className="tod-card__for">
                  For: {nameOf(turn)}
                </p>
              </div>
              {myTurn ? (
                <div className="flex flex-wrap justify-center gap-2">
                  <GameButton onClick={markDone}>
                    ✅ Done (+{CARD_XP} XP both)
                  </GameButton>
                  <GameButton variant="ghost" onClick={skip}>
                    Skip
                  </GameButton>
                </div>
              ) : (
                <p className="text-sm opacity-70">
                  Waiting on {nameOf(turn)}…
                </p>
              )}
            </div>
          )}

          {deck.length > 0 && deckDone && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="text-4xl">🕯️</div>
              <p className="text-center text-sm">
                The deck is spent — {doneCount} cards completed, detectives.
              </p>
            </div>
          )}

          <ResultModal
            open={deckDone}
            eyebrow="DECK SPENT"
            headline="Cards completed"
            tone="win"
            stat={`${doneCount} CARDS SEALED · CO-OP XP BANKED`}
            primaryLabel="🔁 Shuffle again"
            onPrimary={startDeck}
          />
        </motion.div>
      </div>

      <p className="text-center text-xs opacity-60">
        Every completed card earns both detectives {CARD_XP} XP and seals a co-op win. 💌
      </p>
    </div>
  );
}
