'use client';

/* Liar's Dice for two detectives.
 * 5 dice each, hidden per player. Bid quantity × face, raise or call the
 * bluff; the loser of a challenge loses a die. Last one holding dice wins.
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import '../ui-kit/kit.css';
import '../ui-kit/realism.css';
import './game.css';
import {
  Die,
  GameButton,
  ScoreHUD,
  TurnBanner,
  ResultModal,
  SectionTitle,
} from '../ui-kit';
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
  const [rolling, setRolling] = useState(false);

  // Brief shake while the dice settle at the start of each round.
  useEffect(() => {
    if (phase !== 'bidding') return;
    setRolling(true);
    const t = window.setTimeout(() => setRolling(false), 650);
    return () => window.clearTimeout(t);
  }, [phase, round]);

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
    <div className="gk-root space-y-4">
      <SectionTitle
        eyebrow={phase === 'lobby' ? `${START_DICE} DICE EACH · HIDDEN HANDS` : `ROUND ${round} · ${totalDice} DICE ON THE TABLE`}
        title="🎲 Liar's Dice"
      />
      {phase !== 'lobby' && (
        <ScoreHUD
          leftLabel="YOUR DICE"
          leftValue={myDice.length}
          rightLabel="THEIR DICE"
          rightValue={peerDice.length}
        />
      )}

      {!peer && (
        <div className="glass-card p-4 text-sm">
          ⏳ Waiting for your partner to join the room… (code{' '}
          <span className="font-bold">{room.roomCode ?? '—'}</span>)
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* My hand */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="gk-felt ld-panel">
          <h3 className="mb-2 text-sm tracking-widest text-[var(--ink-dim)]">
            YOUR HAND — {nameOf(me).toUpperCase()}
          </h3>
          <div className="ld-dice">
            {myDice.length === 0 && phase !== 'lobby' ? (
              <span className="text-sm opacity-60">No dice left.</span>
            ) : (
              myDice.map((d, i) => (
                <Die key={i} value={d} size={52} rolling={rolling} ariaLabel={`Your die ${i + 1} showing ${d}`} />
              ))
            )}
          </div>
          <h3 className="mb-2 mt-4 text-sm tracking-widest text-[var(--ink-dim)]">
            {peer ? nameOf(peer.id).toUpperCase() + "'S HAND" : 'PARTNER'}
          </h3>
          <div className="ld-dice opacity-90">
            {peerDice.map((d, i) =>
              phase === 'revealed' || phase === 'over' ? (
                <Die key={i} value={d} size={52} ariaLabel={`Revealed die showing ${d}`} />
              ) : (
                <Die key={i} value={0} size={52} className="ld-hidden" ariaLabel="Hidden die" />
              ),
            )}
            {peerDice.length === 0 && phase !== 'lobby' && (
              <span className="text-sm opacity-60">No dice left.</span>
            )}
          </div>
        </motion.div>

        {/* Table */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="gk-felt ld-panel gk-modal-scope">
          {phase === 'lobby' ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <p className="text-sm opacity-70">
                Five dice each. Bid bold, bluff bolder.
              </p>
              <GameButton onClick={startMatch} disabled={!peer}>
                🎲 Roll the dice
              </GameButton>
            </div>
          ) : (
            <>
              {phase === 'bidding' && (
                <TurnBanner
                  isYourTurn={myTurn}
                  yourText="Your bid, detective"
                  theirText={turn ? `${nameOf(turn)} is thinking…` : 'Waiting…'}
                />
              )}
              <h3 className="mb-2 text-sm tracking-widest opacity-80">
                CURRENT BID
              </h3>
              <div className="mb-4">
                {bid ? (
                  <span className="ld-bid">
                    {bid.qty} × <Die value={bid.face} size={30} ariaLabel={`Bid face ${bid.face}`} />{' '}
                    <span className="text-sm font-normal opacity-70">by {nameOf(bid.by)}</span>
                  </span>
                ) : (
                  <span className="text-sm opacity-60">No bid yet — open the bidding.</span>
                )}
              </div>
              {phase === 'revealed' && (
                <div className="flex flex-col items-center gap-3 py-4">
                  <p className="text-center text-sm">{lastResult}</p>
                  <GameButton onClick={nextRound}>➡️ Next round</GameButton>
                </div>
              )}
              {phase === 'bidding' && (
                <>
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="text-xs">
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
                    <label className="text-xs">
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
                    <GameButton
                      onClick={raise}
                      disabled={!myTurn || !isValidRaise(bid, qty, face)}
                    >
                      ⬆️ Raise
                    </GameButton>
                    <GameButton
                      variant="ghost"
                      onClick={challenge}
                      disabled={!myTurn || !bid || bid.by === me}
                    >
                      🕵️ Call bluff
                    </GameButton>
                  </div>
                  {!isValidRaise(bid, qty, face) && myTurn && (
                    <p className="mt-2 text-xs text-amber-200/80">
                      Raise higher: more dice, or the same dice with a higher face.
                    </p>
                  )}
                </>
              )}
              <ResultModal
                open={phase === 'over'}
                eyebrow="TABLE DECIDED"
                headline={matchWinner === me ? 'You take the table' : 'Out of dice'}
                tone={matchWinner === me ? 'win' : 'lose'}
                stat={lastResult ? lastResult.toUpperCase().slice(0, 80) : undefined}
                primaryLabel="🔁 New game"
                onPrimary={startMatch}
              />
            </>
          )}
        </motion.div>
      </div>

      {phase !== 'lobby' && phase !== 'over' && lastResult && phase !== 'revealed' && (
        <p className="text-center text-xs opacity-70">{lastResult}</p>
      )}
    </div>
  );
}
