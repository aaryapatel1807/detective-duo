'use client';

/* Memory Match — solo file. 6×4 evidence-photo pairs, move counter, timer,
 * best score in localStorage, XP when the board is cleared.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameProps } from '../types';
import { GlassCard } from '../../components/GlassCard';
import { awardXP, syncXpToRoom, XP_AWARDS } from '../../lib/xp';
import { readJSON, writeJSON } from '../../lib/store';
import { sounds } from '../../lib/sound';
import { allMatched, createDeck, matchPair, type Card } from './logic';
import type { MemoryBest } from './types';
import '../ui-kit/kit.css';
import { GameButton, GameCard, ResultModal, ScoreHUD, SectionTitle, TimerChip } from '../ui-kit';

const BEST_KEY = 'dd-solo-memory-best';

export default function MemoryMatchGame({ room }: GameProps) {
  const [deck, setDeck] = useState<Card[]>(() => createDeck());
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [done, setDone] = useState(false);
  const [best, setBest] = useState<MemoryBest | null>(() => readJSON<MemoryBest | null>(BEST_KEY, null));
  const [isRecord, setIsRecord] = useState(false);
  const awardedRef = useRef(false);
  const lockRef = useRef(false);

  useEffect(() => {
    if (done) return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [done]);

  const finish = useCallback(
    (finalMoves: number, finalSeconds: number) => {
      setDone(true);
      sounds.stampThud();
      if (!awardedRef.current) {
        awardedRef.current = true;
        awardXP(XP_AWARDS.soloWin);
        syncXpToRoom(room.setShared, room.me.id, room.me.name);
        sounds.xpTick();
      }
      setBest((b) => {
        const better =
          !b || finalMoves < b.moves || (finalMoves === b.moves && finalSeconds < b.seconds);
        if (!better) return b;
        setIsRecord(true);
        const next = { moves: finalMoves, seconds: finalSeconds };
        writeJSON(BEST_KEY, next);
        return next;
      });
    },
    [room],
  );

  const flip = (idx: number) => {
    if (done || lockRef.current) return;
    const card = deck[idx];
    if (card.matched || flipped.includes(idx)) return;
    sounds.pinTap();
    if (flipped.length === 0) {
      setFlipped([idx]);
      return;
    }
    const [first] = flipped;
    const nextMoves = moves + 1;
    setMoves(nextMoves);
    const paired = matchPair(deck, first, idx);
    if (paired !== deck) {
      // A match — reveal it briefly, then lock it in.
      setFlipped([first, idx]);
      lockRef.current = true;
      window.setTimeout(() => {
        setDeck(paired);
        setFlipped([]);
        lockRef.current = false;
        if (allMatched(paired)) finish(nextMoves, seconds + 1);
        else sounds.typewriterClick();
      }, 450);
    } else {
      // Miss — show both, then flip back.
      setFlipped([first, idx]);
      lockRef.current = true;
      window.setTimeout(() => {
        setFlipped([]);
        lockRef.current = false;
      }, 750);
    }
  };

  const newGame = () => {
    awardedRef.current = false;
    lockRef.current = false;
    setDeck(createDeck());
    setFlipped([]);
    setMoves(0);
    setSeconds(0);
    setDone(false);
    setIsRecord(false);
    sounds.paperShuffle();
  };

  const isUp = (idx: number) => flipped.includes(idx) || deck[idx].matched;

  return (
    <div className="gk-root gk-modal-scope mx-auto max-w-xl">
      <div className="mb-4 text-center">
        <SectionTitle eyebrow="EVIDENCE PHOTOS" title="Memory Match" />
        <p className="mt-2 text-sm text-[var(--ink-dim)]">
          Match all 12 pairs. Fewer moves, faster time — the chief is watching.
        </p>
      </div>

      <div className="mb-4">
        <ScoreHUD
          leftLabel="MOVES"
          leftValue={moves}
          rightLabel="BEST"
          rightValue={best?.moves ?? 0}
        />
      </div>
      <div className="mb-4 flex justify-center">
        <TimerChip seconds={seconds} label="TIME" />
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <GlassCard className="p-4">
          <div className="grid grid-cols-6 gap-2">
            {deck.map((card, idx) => {
              const up = isUp(idx);
              const state = card.matched ? 'correct' : 'default';
              return (
                <GameCard
                  key={card.id}
                  state={state}
                  onClick={() => flip(idx)}
                  ariaLabel={`Card ${idx + 1}${up ? `, ${card.icon}` : ''}`}
                  className={`aspect-[3/4] !text-2xl${up ? '' : ' !bg-[rgba(0,0,0,0.35)]'}`}
                >
                  {up ? card.icon : <span className="text-[var(--ink-faint)]">?</span>}
                </GameCard>
              );
            })}
          </div>

          {!done && (
            <div className="mt-4 text-center">
              <GameButton variant="ghost" size="sm" onClick={newGame}>
                ↺ New shuffle
              </GameButton>
            </div>
          )}
        </GlassCard>
      </motion.div>

      <ResultModal
        open={done}
        eyebrow="EVIDENCE PHOTOS"
        headline="All Pairs Matched"
        tone="win"
        stat={`${moves} MOVES · ${seconds}S${isRecord ? ' · NEW BEST' : ''} · +${XP_AWARDS.soloWin} XP`}
        primaryLabel="Shuffle again"
        onPrimary={newGame}
      />
    </div>
  );
}
