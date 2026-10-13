'use client';

/* Noir Tic-Tac-Toe — 🔍 vs 🕵, best of 5 rounds (first to 3).
 * Marks alternate the opening move each round.
 */

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import '../ui-kit/kit.css';
import '../ui-kit/realism.css';
import './game.css';
import {
  GameButton,
  ScoreHUD,
  TurnBanner,
  ResultModal,
  SectionTitle,
} from '../ui-kit';
import type { GameProps } from '../types';
import type { TTTShared } from './types';
import { ROUNDS, WINS_NEEDED, emptyBoard, isDraw, place, winnerOf } from './logic';
import type { Mark } from './logic';
import { awardXP, syncXpToRoom, XP_AWARDS } from '../../lib/xp';
import { sounds } from '../../lib/sound';

const GLYPH: Record<string, string> = { a: 'X', b: 'O' };

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
  const markOf = (pid: string): Mark => (peer && pid === (me < peer.id ? me : peer.id) ? 'a' : 'b');
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
  const inLobby = board.every((c) => c === null) && round === 1 && turn === null;

  return (
    <div className="gk-root space-y-4">
      <SectionTitle
        eyebrow={`ROUND ${round} OF ${ROUNDS} · FIRST TO ${WINS_NEEDED}`}
        title="Tic-Tac-Toe"
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

      <div className="mx-auto max-w-sm">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card gk-modal-scope p-5"
        >
          {inLobby ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <p className="text-sm opacity-70">
                X opens against O — best of {ROUNDS}, first to {WINS_NEEDED}.
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
                  yourText="Your move"
                  theirText={`${nameOf(turn)} is marking…`}
                />
              )}
              <div className="ttt-board grid grid-cols-3">
                {board.map((cell, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => play(i)}
                    disabled={!playable || cell !== null}
                    aria-label={cell ? `Marked ${GLYPH[cell]}` : `Empty cell ${i + 1}`}
                    data-mark={!cell && playable ? GLYPH[myMark] : undefined}
                    className="ttt-cell"
                  >
                    {cell ? (
                      <span className={`ttt-mark ${cell === 'a' ? 'ttt-x' : 'ttt-o'}`}>{GLYPH[cell]}</span>
                    ) : null}
                  </button>
                ))}
              </div>
              <ResultModal
                open={!!matchWinner}
                eyebrow={matchWinner === me ? 'CASE FILE CLOSED' : 'CASE GONE COLD'}
                headline={matchWinner === me ? 'Case closed' : 'Case slips away'}
                tone={matchWinner === me ? 'win' : 'lose'}
                stat={`FINAL SCORE — YOU ${scores[me] ?? 0} · OPPONENT ${scores[peer?.id ?? ''] ?? 0}`}
                primaryLabel="🔁 New match"
                onPrimary={startMatch}
              />
              <ResultModal
                open={roundOver && !matchWinner}
                eyebrow={`ROUND ${round} DECIDED`}
                headline={roundWinner === 'draw' ? 'Stalemate' : `${nameOf(roundWinner)} takes it`}
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
