'use client';

/* Connect 4 — 7×6, best of 3 rounds (first to 2).
 * 🔴 opens against ⚫; the opener alternates each round.
 */

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { GameProps } from '../types';
import type { C4Shared } from './types';
import { COLS, ROUNDS, WINS_NEEDED, drop, emptyBoard, isFull, winnerOf } from './logic';
import { awardXP, syncXpToRoom, XP_AWARDS } from '../../lib/xp';
import { sounds } from '../../lib/sound';

const GLYPH: Record<string, string> = { a: '🔴', b: '⚫' };

export default function Connect4Game({ room }: GameProps) {
  const gs: C4Shared = room.shared?.games?.['connect-4'] ?? {};
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

  const lowerId = peer && me < peer.id ? me : (peer?.id ?? me);
  const myChip = me === lowerId ? 'a' : 'b';
  const chipOf = (pid: string): string => (pid === lowerId ? 'a' : 'b');
  const idOf = (chip: string): string => (chip === 'a' ? lowerId : (peer?.id === lowerId ? me : (peer?.id ?? '')));
  const nameOf = (pid: string | null): string =>
    pid === null ? '—' : pid === me ? room.me.name : (peer?.name ?? 'Partner');

  const set = (patch: Partial<C4Shared>) => room.setShared({ games: { 'connect-4': patch } });

  const startMatch = () => {
    if (!peer) return;
    sounds.paperShuffle();
    set({
      round: 1, board: emptyBoard(), turn: lowerId, first: lowerId,
      scores: {}, roundWinner: null, matchWinner: null,
    });
  };

  const playCol = (col: number) => {
    if (roundWinner || matchWinner || turn !== me) return;
    const next = drop(board, col, myChip as 'a' | 'b');
    if (!next) return;
    sounds.typewriterClick();
    const w = winnerOf(next);
    if (w) {
      const winnerId = idOf(w);
      const ns = { ...scores, [winnerId]: (scores[winnerId] ?? 0) + 1 };
      const mw = (ns[winnerId] ?? 0) >= WINS_NEEDED ? winnerId : null;
      sounds.stampThud();
      set({ board: next, roundWinner: winnerId, scores: ns, matchWinner: mw });
      return;
    }
    if (isFull(next)) {
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
  const boardEmpty = board.every((row) => row.every((c) => c === null));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 style={{ fontFamily: 'var(--font-type)' }} className="text-xl tracking-wide">
          🔴 CONNECT 4
        </h2>
        <div className="text-sm opacity-80" style={{ fontFamily: 'var(--font-type)' }}>
          ROUND {round}/{ROUNDS} · {GLYPH[myChip]} {nameOf(me)} {scores[me] ?? 0} — {scores[peer?.id ?? ''] ?? 0} {nameOf(peer?.id ?? null)}
        </div>
      </div>

      {!peer && (
        <div className="glass-card p-4 text-sm" style={{ fontFamily: 'var(--font-type)' }}>
          ⏳ Waiting for your partner… (code <span className="font-bold">{room.roomCode ?? '—'}</span>)
        </div>
      )}

      <div className="mx-auto max-w-md">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
          {roundOver ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="text-4xl">
                {matchWinner ? (matchWinner === me ? '🏆' : '🕯️') : roundWinner === 'draw' ? '🤝' : GLYPH[chipOf(roundWinner ?? '')]}
              </div>
              <p className="text-center text-sm" style={{ fontFamily: 'var(--font-type)' }}>
                {matchWinner
                  ? `Case closed — ${nameOf(matchWinner)} connects the win.`
                  : roundWinner === 'draw'
                    ? 'Board full — nobody connects.'
                    : `${nameOf(roundWinner)} takes round ${round}.`}
              </p>
              <button className="noir-btn" onClick={matchWinner ? startMatch : nextRound}>
                {matchWinner ? '🔁 New match' : '➡️ Next round'}
              </button>
            </div>
          ) : boardEmpty && turn === null ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <p className="text-sm opacity-70" style={{ fontFamily: 'var(--font-type)' }}>
                Drop the chips — connect four to close the round. Best of {ROUNDS}.
              </p>
              <button className="noir-btn" onClick={startMatch} disabled={!peer}>
                📁 Open the case
              </button>
            </div>
          ) : (
            <>
              <p className="mb-3 text-center text-sm opacity-80" style={{ fontFamily: 'var(--font-type)' }}>
                {turn === me ? `Your drop — ${GLYPH[myChip]}` : `${nameOf(turn)} is dropping…`}
              </p>
              <div className="grid gap-1 rounded-xl bg-[#1a1410]/80 p-2" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
                {Array.from({ length: COLS }, (_, c) => (
                  <button
                    key={c}
                    onClick={() => playCol(c)}
                    disabled={!playable}
                    className="rounded-t-lg border border-white/10 bg-white/5 py-1 text-lg hover:border-amber-300/60 hover:bg-amber-300/10 disabled:cursor-default"
                    title={`Drop in column ${c + 1}`}
                  >
                    ⬇️
                  </button>
                ))}
                {board.map((row, r) =>
                  row.map((cell, c) => (
                    <div
                      key={`${r}-${c}`}
                      className="flex aspect-square items-center justify-center rounded-full border border-white/10 bg-black/40 text-2xl"
                    >
                      {cell ? GLYPH[cell] : ''}
                    </div>
                  )),
                )}
              </div>
              <p className="mt-2 text-center text-xs opacity-60" style={{ fontFamily: 'var(--font-type)' }}>
                Tap ⬇️ above a column to drop your chip.
              </p>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
