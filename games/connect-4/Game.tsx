'use client';

/* Connect 4 — 7×6, best of 3 rounds (first to 2).
 * 🔴 opens against ⚫; the opener alternates each round.
 */

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import '../ui-kit/kit.css';
import {
  GameButton,
  ScoreHUD,
  TurnBanner,
  ResultModal,
  GameCard,
  SectionTitle,
} from '../ui-kit';
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
  const inLobby = boardEmpty && turn === null;

  return (
    <div className="gk-root space-y-4">
      <SectionTitle
        eyebrow={`ROUND ${round} OF ${ROUNDS} · FIRST TO ${WINS_NEEDED}`}
        title="🔴 Connect 4"
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

      <div className="mx-auto max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card gk-modal-scope p-5"
        >
          {inLobby ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <p className="text-sm opacity-70">
                Drop the chips — connect four to close the round. Best of {ROUNDS}.
              </p>
              <GameButton onClick={startMatch} disabled={!peer}>
                📁 Open the case
              </GameButton>
            </div>
          ) : (
            <>
              {!roundOver && (
                <TurnBanner
                  isYourTurn={turn === me}
                  yourText={`Your drop — ${GLYPH[myChip]}`}
                  theirText={`${nameOf(turn)} is dropping…`}
                />
              )}
              <div className="grid gap-1 rounded-xl bg-[#1a1410]/80 p-2" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
                {Array.from({ length: COLS }, (_, c) => (
                  <GameCard
                    key={c}
                    onClick={() => playCol(c)}
                    disabled={!playable}
                    ariaLabel={`Drop in column ${c + 1}`}
                  >
                    ⬇️
                  </GameCard>
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
              <p className="mt-2 text-center text-xs opacity-60">
                Tap ⬇️ above a column to drop your chip.
              </p>
              <ResultModal
                open={!!matchWinner}
                eyebrow={matchWinner === me ? 'CASE FILE CLOSED' : 'CASE GONE COLD'}
                headline={matchWinner === me ? 'Case closed' : 'Connection broken'}
                tone={matchWinner === me ? 'win' : 'lose'}
                stat={`FINAL SCORE — YOU ${scores[me] ?? 0} · OPPONENT ${scores[peer?.id ?? ''] ?? 0}`}
                primaryLabel="🔁 New match"
                onPrimary={startMatch}
              />
              <ResultModal
                open={roundOver && !matchWinner}
                eyebrow={`ROUND ${round} DECIDED`}
                headline={roundWinner === 'draw' ? 'Board full' : `${nameOf(roundWinner)} connects`}
                tone={roundWinner === 'draw' ? 'draw' : roundWinner === me ? 'win' : 'lose'}
                stat={`YOU ${scores[me] ?? 0} — ${scores[peer?.id ?? ''] ?? 0} OPPONENT`}
                primaryLabel="➡️ Next round"
                onPrimary={nextRound}
              />
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
