'use client';

/* Liar's Dice for two detectives.
 * 5 dice each, hidden per player. Bid quantity × face, raise or call the
 * bluff; the loser of a challenge loses a die. Last one holding dice wins.
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameProps } from '../types';
import type { LiarsShared } from './types';
import {
  START_DICE,
  dieGlyph,
  isValidRaise,
  resolveChallenge,
  rollDice,
} from './logic';
import { awardXP, syncXpToRoom, XP_AWARDS } from '../../lib/xp';
import { sounds } from '../../lib/sound';

export default function LiarsDiceGame({ room }: GameProps) {
  const gs: LiarsShared = room.shared?.games?.['liars-dice'] ?? {};
  const phase = gs.phase ?? 'lobby';
  const round = gs.round ?? 1;
  const dice = gs.dice ?? {};
  const counts = gs.counts ?? {};
  const bid = gs.bid ?? null;
  const turn = gs.turn ?? null;
  const lastResult = gs.lastResult ?? '';
  const matchWinner = gs.matchWinner ?? null;
  const me = room.me.id;
  const peer = room.peer;
  const awardedRef = useRef(false);

  const [qty, setQty] = useState(1);
  const [face, setFace] = useState(2);

  const set = (patch: Partial<LiarsShared>) =>
    room.setShared({ games: { 'liars-dice': patch } });

  // Each detective rolls their own remaining dice at the start of a round.
  useEffect(() => {
    if (phase !== 'bidding' || !peer) return;
    const want = counts[me] ?? START_DICE;
    if ((dice[me]?.length ?? -1) !== want) {
      set({ dice: { [me]: rollDice(want) } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, round, me]);

  useEffect(() => {
    if (matchWinner && matchWinner === me && !awardedRef.current) {
      awardedRef.current = true;
      awardXP(XP_AWARDS.duoWin);
      syncXpToRoom(room.setShared, me, room.me.name);
      sounds.stampThud();
    }
  }, [matchWinner, me, room]);

  const nameOf = (pid: string): string => (pid === me ? room.me.name : (peer?.name ?? 'Partner'));
  const myDice = dice[me] ?? [];
  const peerDice = peer ? (dice[peer.id] ?? []) : [];
  const totalDice = myDice.length + peerDice.length;
  const myTurn = phase === 'bidding' && turn === me;

  const startMatch = () => {
    if (!peer) return;
    sounds.paperShuffle();
    const first = me < peer.id ? me : peer.id;
    set({
      phase: 'bidding',
      round: 1,
      dice: {},
      counts: { [me]: START_DICE, [peer.id]: START_DICE },
      bid: null,
      turn: first,
      lastResult: '',
      matchWinner: null,
    });
  };

  const raise = () => {
    if (!myTurn) return;
    if (!isValidRaise(bid, qty, face)) return;
    sounds.typewriterClick();
    set({ bid: { qty, face, by: me }, turn: peer?.id ?? null });
    setQty(Math.max(qty, (bid?.qty ?? 0) + 0));
  };

  const challenge = () => {
    if (!myTurn || !bid || bid.by === me || !peer) return;
    const all = [...myDice, ...peerDice];
    const { bidderWins, actual } = resolveChallenge(bid, myDice, peerDice);
    const loser = bidderWins ? me : bid.by;
    const nextCounts = { ...counts, [loser]: Math.max(0, (counts[loser] ?? 1) - 1) };
    sounds.stampThud();
    if (nextCounts[loser] <= 0) {
      const winner = loser === me ? peer.id : me;
      set({
        phase: 'over',
        counts: nextCounts,
        dice: { [loser]: [] },
        lastResult: `Bluff called! There ${actual === 1 ? 'was' : 'were'} ${actual} × ${dieGlyph(bid.face)} — bid was ${bid.qty}. ${nameOf(loser)} is out of dice.`,
        matchWinner: winner,
      });
      return;
    }
    set({
      phase: 'revealed',
      counts: nextCounts,
      lastResult: `Bluff called! There ${actual === 1 ? 'was' : 'were'} ${actual} × ${dieGlyph(bid.face)} — bid was ${bid.qty}. ${nameOf(loser)} loses a die.`,
      turn: loser, // loser opens the next round
    });
  };

  const nextRound = () => {
    sounds.paperShuffle();
    set({
      phase: 'bidding',
      round: round + 1,
      dice: {},
      bid: null,
      lastResult: '',
      turn: turn, // set by challenge() to the loser
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 style={{ fontFamily: 'var(--font-type)' }} className="text-xl tracking-wide">
          🎲 LIAR'S DICE
        </h2>
        <div className="text-sm opacity-80" style={{ fontFamily: 'var(--font-type)' }}>
          ROUND {round} · {nameOf(me)} 🎲×{myDice.length} — 🎲×{peerDice.length} {peer ? nameOf(peer.id) : '—'}
        </div>
      </div>

      {!peer && (
        <div className="glass-card p-4 text-sm" style={{ fontFamily: 'var(--font-type)' }}>
          ⏳ Waiting for your partner to join the room… (code{' '}
          <span className="font-bold">{room.roomCode ?? '—'}</span>)
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* My hand */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
          <h3 style={{ fontFamily: 'var(--font-type)' }} className="mb-2 text-sm tracking-widest opacity-80">
            YOUR HAND — {nameOf(me)}
          </h3>
          <div className="flex flex-wrap gap-2 text-4xl">
            {myDice.length === 0 && phase !== 'lobby' ? (
              <span className="text-sm opacity-60">No dice left.</span>
            ) : (
              myDice.map((d, i) => <span key={i}>{dieGlyph(d)}</span>)
            )}
          </div>
          <h3 style={{ fontFamily: 'var(--font-type)' }} className="mb-2 mt-4 text-sm tracking-widest opacity-80">
            {peer ? nameOf(peer.id).toUpperCase() + "'S HAND" : 'PARTNER'}
          </h3>
          <div className="flex gap-2 text-4xl opacity-90">
            {peerDice.map((d, i) => (
              <span key={i}>{phase === 'revealed' || phase === 'over' ? dieGlyph(d) : '🎴'}</span>
            ))}
            {peerDice.length === 0 && phase !== 'lobby' && (
              <span className="text-sm opacity-60">No dice left.</span>
            )}
          </div>
        </motion.div>

        {/* Table */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
          {phase === 'lobby' ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <p className="text-sm opacity-70" style={{ fontFamily: 'var(--font-type)' }}>
                Five dice each. Bid bold, bluff bolder.
              </p>
              <button className="noir-btn" onClick={startMatch} disabled={!peer}>
                🎲 Roll the dice
              </button>
            </div>
          ) : phase === 'over' ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="text-4xl">{matchWinner === me ? '🏆' : '🕯️'}</div>
              <p className="text-sm" style={{ fontFamily: 'var(--font-type)' }}>
                {matchWinner === me ? 'You take the table — the last die is yours.' : `${matchWinner ? nameOf(matchWinner) : '—'} takes the table.`}
              </p>
              <button className="noir-btn" onClick={startMatch}>🔁 New game</button>
            </div>
          ) : phase === 'revealed' ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <p className="text-center text-sm" style={{ fontFamily: 'var(--font-type)' }}>{lastResult}</p>
              <button className="noir-btn" onClick={nextRound}>➡️ Next round</button>
            </div>
          ) : (
            <>
              <h3 style={{ fontFamily: 'var(--font-type)' }} className="mb-2 text-sm tracking-widest opacity-80">
                CURRENT BID
              </h3>
              <div className="mb-4 text-2xl" style={{ fontFamily: 'var(--font-type)' }}>
                {bid ? (
                  <span>
                    {bid.qty} × {dieGlyph(bid.face)}{' '}
                    <span className="text-sm opacity-70">by {nameOf(bid.by)}</span>
                  </span>
                ) : (
                  <span className="text-sm opacity-60">No bid yet — open the bidding.</span>
                )}
              </div>
              <p className="mb-3 text-xs opacity-70" style={{ fontFamily: 'var(--font-type)' }}>
                {myTurn ? 'Your move, detective.' : peer && turn ? `${nameOf(turn)} is thinking…` : '…'}
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <label className="text-xs" style={{ fontFamily: 'var(--font-type)' }}>
                  QTY
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, totalDice)}
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, Math.min(totalDice || 10, Number(e.target.value) || 1)))}
                    className="noir-input ml-2 w-16"
                    disabled={!myTurn}
                  />
                </label>
                <label className="text-xs" style={{ fontFamily: 'var(--font-type)' }}>
                  FACE
                  <select
                    value={face}
                    onChange={(e) => setFace(Number(e.target.value))}
                    className="noir-input ml-2"
                    disabled={!myTurn}
                  >
                    {[1, 2, 3, 4, 5, 6].map((f) => (
                      <option key={f} value={f}>{dieGlyph(f)} {f}'s</option>
                    ))}
                  </select>
                </label>
                <button
                  className="noir-btn"
                  onClick={raise}
                  disabled={!myTurn || !isValidRaise(bid, qty, face)}
                >
                  ⬆️ Raise
                </button>
                <button
                  className="noir-btn noir-btn-ghost"
                  onClick={challenge}
                  disabled={!myTurn || !bid || bid.by === me}
                  title="Call the bluff — count every die showing the bid face"
                >
                  🕵️ Call bluff
                </button>
              </div>
              {!isValidRaise(bid, qty, face) && myTurn && (
                <p className="mt-2 text-xs text-amber-200/80" style={{ fontFamily: 'var(--font-type)' }}>
                  Raise higher: more dice, or the same dice with a higher face.
                </p>
              )}
            </>
          )}
        </motion.div>
      </div>

      {phase !== 'lobby' && lastResult && phase !== 'revealed' && (
        <p className="text-center text-xs opacity-70" style={{ fontFamily: 'var(--font-type)' }}>{lastResult}</p>
      )}
    </div>
  );
}
