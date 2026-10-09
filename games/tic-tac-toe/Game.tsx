'use client';

/* Noir Tic-Tac-Toe — 🔍 vs 🕵, best of 5 rounds (first to 3).
 * Marks alternate the opening move each round.
 */

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { GameProps } from '../types';
import type { TTTShared } from './types';
import { ROUNDS, WINS_NEEDED, emptyBoard, isDraw, place, winnerOf } from './logic';
import { awardXP, syncXpToRoom, XP_AWARDS } from '../../lib/xp';
import { sounds } from '../../lib/sound';

const GLYPH: Record<string, string> = { a: '🔍', b: '🕵' };

export default function TicTacToeGame({ room }: GameProps) {
  const gs: TTTShared = room.shared?.games?.['tic-tac-toe'] ?? {};
  const round = gs.round ?? 1;
  const board = gs.board ?? emptyBoard();
  const turn = gs.turn ?? null;
  const first = gs.first ?? null;
  const scores = gs.scores ?? {};
  const roundWinner = gs.roundWinner ?? null;
  const matchWinner = gs.matchWinner ?? null;
  const me = room.me.id;
  const peer = room.peer;
  const awardedRef = useRef(false);

  useEffect(() => {
    if (matchWinner && matchWinner === me && !awardedRef.current) {
      awardedRef.current = true;
      awardXP(XP_AWARDS.duoWin);
      syncXpToRoom(room.setShared, me, room.me.name);
      sounds.stampThud();
    }
  }, [matchWinner, me, room]);

  // 'a' = lower player id, 'b' = higher. Stable across rounds.
  const myMark = peer ? (me < peer.id ? 'a' : 'b') : 'a';
  const markOf = (pid: string): string => (peer && pid === (me < peer.id ? me : peer.id) ? 'a' : 'b');
  const nameOf = (pid: string | null): string =>
    pid === null ? '—' : pid === me ? room.me.name : (peer?.name ?? 'Partner');

  const set = (patch: Partial<TTTShared>) => room.setShared({ games: { 'tic-tac-toe': patch } });

  const startMatch = () => {
    if (!peer) return;
    const [a, b] = me < peer.id ? [me, peer.id] : [peer.id, me];
    sounds.paperShuffle();
    set({
      round: 1, board: emptyBoard(), turn: a, first: a,
      scores: {}, roundWinner: null, matchWinner: null,
    });
  };

  const play = (idx: number) => {
    if (roundWinner || matchWinner || turn !== me || board[idx] !== null) return;
    const next = place(board, idx, markOf(me));
    if (!next) return;
    sounds.typewriterClick();
    const w = winnerOf(next);
    if (w) {
      const winnerId = w === 'a' ? (me < (peer?.id ?? '') ? me : (peer?.id ?? '')) : me < (peer?.id ?? '') ? (peer?.id ?? '') : me;
      const ns = { ...scores, [winnerId]: (scores[winnerId] ?? 0) + 1 };
      const mw = (ns[winnerId] ?? 0) >= WINS_NEEDED ? winnerId : null;
      sounds.stampThud();
      set({ board: next, roundWinner: winnerId, scores: ns, matchWinner: mw });
      return;
    }
    if (isDraw(next)) {
      set({ board: next, roundWinner: 'draw' });
      return;
    }
    set({ board: next, turn: peer?.id ?? null });
  };

  const nextRound = () => {
    const other = first === me ? (peer?.id ?? null) : me;
    sounds.paperShuffle();
    set({ round: round + 1, board: emptyBoard(), turn: other, first: other, roundWinner: null });
  };

  const roundOver = roundWinner !== null;
  const playable = !roundOver && turn === me && peer !== null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 style={{ fontFamily: 'var(--font-type)' }} className="text-xl tracking-wide">
          🔍 TIC-TAC-TOE
        </h2>
        <div className="text-sm opacity-80" style={{ fontFamily: 'var(--font-type)' }}>
          ROUND {round}/{ROUNDS} · {GLYPH[myMark]} {nameOf(me)} {scores[me] ?? 0} — {scores[peer?.id ?? ''] ?? 0} {nameOf(peer?.id ?? null)}
        </div>
      </div>

      {!peer && (
        <div className="glass-card p-4 text-sm" style={{ fontFamily: 'var(--font-type)' }}>
          ⏳ Waiting for your partner… (code <span className="font-bold">{room.roomCode ?? '—'}</span>)
        </div>
      )}

      <div className="mx-auto max-w-sm">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
          {roundOver || matchWinner ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="text-4xl">
                {matchWinner ? (matchWinner === me ? '🏆' : '🕯️') : roundWinner === 'draw' ? '🤝' : GLYPH[markOf(roundWinner ?? '')]}
              </div>
              <p className="text-center text-sm" style={{ fontFamily: 'var(--font-type)' }}>
                {matchWinner
                  ? `Case closed — ${nameOf(matchWinner)} takes it ${scores[matchWinner] ?? 0} rounds to ${scores[matchWinner === me ? (peer?.id ?? '') : me] ?? 0}.`
                  : roundWinner === 'draw'
                    ? 'Stalemate — nobody blinks.'
                    : `${nameOf(roundWinner)} takes round ${round}.`}
              </p>
              <button className="noir-btn" onClick={matchWinner ? startMatch : nextRound}>
                {matchWinner ? '🔁 New match' : '➡️ Next round'}
              </button>
            </div>
          ) : board.every((c) => c === null) && round === 1 && turn === null ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <p className="text-sm opacity-70" style={{ fontFamily: 'var(--font-type)' }}>
                🔍 opens against 🕵 — best of {ROUNDS}, first to {WINS_NEEDED}.
              </p>
              <button className="noir-btn" onClick={startMatch} disabled={!peer}>
                📁 Open the case
              </button>
            </div>
          ) : (
            <>
              <p className="mb-3 text-center text-sm opacity-80" style={{ fontFamily: 'var(--font-type)' }}>
                {turn === me ? `Your move — ${GLYPH[myMark]}` : `${nameOf(turn)} is marking…`}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {board.map((cell, i) => (
                  <button
                    key={i}
                    onClick={() => play(i)}
                    disabled={!playable || cell !== null}
                    className="flex aspect-square items-center justify-center rounded-lg border border-white/10 bg-white/5 text-4xl transition-all hover:border-amber-300/60 hover:bg-amber-300/10 disabled:cursor-default"
                  >
                    {cell ? GLYPH[cell] : ''}
                  </button>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
