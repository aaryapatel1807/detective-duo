'use client';

/* Hangman Duel — one shared secret word per round, detectives alternate
 * letter guesses. Fewest strikes over 3 rounds cracks the case.
 * State: room.shared.games['hangman-duel'] (see types.ts).
 */

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { GameProps } from '../types';
import type { HangmanShared } from './types';
import {
  applyLetterGuess,
  isRoundOver,
  isWordComplete,
  HANGMAN_MAX_STRIKES,
  HANGMAN_ROUNDS,
  ROUND_LENGTHS,
  roundWinner,
  matchWinner,
} from './logic';
import { randomWord } from '../../lib/content/words';
import { awardXP, syncXpToRoom, XP_AWARDS } from '../../lib/xp';
import { sounds } from '../../lib/sound';
import { GlassCard } from '../../components/GlassCard';
import { Typewriter } from '../../components/Typewriter';
import { ManilaFolder } from '../../components/props';

const SLUG = 'hangman-duel';
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function playerName(room: GameProps['room'], pid: string | null | undefined): string {
  if (!pid) return '—';
  if (pid === room.me.id) return 'You';
  return room.peer?.name ?? 'Partner';
}

export default function HangmanDuelGame({ room }: GameProps) {
  const gs: HangmanShared = room.shared?.games?.[SLUG] ?? {};
  const phase = gs.phase ?? 'lobby';
  const round = gs.round ?? 0;
  const word = (gs.word ?? '').toUpperCase();
  const guessed = gs.guessed ?? [];
  const roundStrikes = gs.roundStrikes ?? {};
  const totalStrikes = gs.totalStrikes ?? {};
  const turn = gs.turn ?? null;
  const winner = gs.winner ?? null;
  const history = gs.history ?? [];
  const awardedRef = useRef(false);

  const ids = room.peer ? [room.me.id, room.peer.id] : [room.me.id];
  const myTurn = turn === room.me.id;

  useEffect(() => {
    if (winner && winner !== 'draw' && winner === room.me.id && !awardedRef.current) {
      awardedRef.current = true;
      awardXP(XP_AWARDS.duoWin);
      syncXpToRoom(room.setShared, room.me.id, room.me.name);
      sounds.stampThud();
    }
  }, [winner, room]);

  const write = (patch: Partial<HangmanShared>) =>
    room.setShared({ games: { [SLUG]: patch } });

  const startMatch = () => {
    awardedRef.current = false;
    sounds.paperShuffle();
    const len = ROUND_LENGTHS[0];
    write({
      phase: 'play',
      round: 0,
      word: randomWord(len),
      guessed: [],
      roundStrikes: {},
      totalStrikes: {},
      turn: room.me.id,
      starter: room.me.id,
      winner: null,
      history: [],
    });
  };

  const guess = (letter: string) => {
    if (phase !== 'play' || !myTurn || guessed.includes(letter)) return;
    sounds.typewriterClick();
    const { guessed: nextGuessed, strikes: nextRoundStrikes } = applyLetterGuess(
      word,
      guessed,
      roundStrikes,
      room.me.id,
      letter,
    );
    const totals: Record<string, number> = { ...totalStrikes };
    totals[room.me.id] = (totals[room.me.id] ?? 0) + ((nextRoundStrikes[room.me.id] ?? 0) - (roundStrikes[room.me.id] ?? 0));

    if (isRoundOver(word, nextGuessed, nextRoundStrikes, ids)) {
      const rw = roundWinner(nextRoundStrikes, ids);
      const summary = { word, winner: rw, strikes: nextRoundStrikes };
      const nextHistory = [...history, summary];
      if (round + 1 >= HANGMAN_ROUNDS) {
        write({
          guessed: nextGuessed,
          roundStrikes: nextRoundStrikes,
          totalStrikes: totals,
          history: nextHistory,
          phase: 'over',
          winner: matchWinner(totals, ids),
        });
      } else {
        // alternate the round starter, reset round-specific fields
        const nextStarter =
          room.peer && gs.starter === room.me.id ? room.peer.id : room.me.id;
        const len = ROUND_LENGTHS[(round + 1) % ROUND_LENGTHS.length];
        write({
          round: round + 1,
          word: randomWord(len),
          guessed: [],
          roundStrikes: {},
          totalStrikes: totals,
          history: nextHistory,
          turn: nextStarter,
          starter: nextStarter,
        });
      }
      return;
    }

    // alternate: pass the turn to the other detective
    const other = ids.find((id) => id !== room.me.id) ?? room.me.id;
    write({
      guessed: nextGuessed,
      roundStrikes: nextRoundStrikes,
      totalStrikes: totals,
      turn: other,
    });
  };

  const reset = () => {
    awardedRef.current = false;
    write({
      phase: 'lobby',
      round: 0,
      word: '',
      guessed: [],
      roundStrikes: {},
      totalStrikes: {},
      turn: null,
      starter: null,
      winner: null,
      history: [],
    });
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 text-center">
        <div className="eyebrow">Case file № 07 — Word & Code Duels</div>
        <Typewriter as="h2" text="HANGMAN DUEL" className="type-heading mt-1 text-3xl" />
        <p className="mt-1 text-sm text-[var(--ink-dim)]">
          One secret word. Alternate letter guesses. Fewest strikes over {HANGMAN_ROUNDS}{' '}
          rounds closes the case.
        </p>
      </div>

      {phase === 'lobby' && (
        <ManilaFolder className="p-6 text-center">
          <div className="type-heading text-xl">The Interrogation Room</div>
          <p className="mt-2 text-sm text-[var(--ink-dim)]">
            A word is sealed in the envelope. Each wrong letter is a strike against you —
            {HANGMAN_MAX_STRIKES} strikes and the round goes cold.
          </p>
          {!room.peer && (
            <p className="mt-2 text-xs text-[var(--ink-faint)]">
              Solo practice — create a room from the hub to duel live.
            </p>
          )}
          <button onClick={startMatch} className="noir-btn mt-5">
            🗂 Open the case file
          </button>
        </ManilaFolder>
      )}

      {phase === 'play' && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div className="eyebrow">Round {round + 1} / {HANGMAN_ROUNDS}</div>
            <div className="eyebrow">
              {myTurn ? '🎯 Your move' : `⏳ ${playerName(room, turn)} is guessing`}
            </div>
          </div>

          {/* masked word */}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {word.split('').map((ch, i) => {
              const shown = guessed.includes(ch);
              return (
                <motion.div
                  key={i}
                  initial={{ rotateX: 90 }}
                  animate={{ rotateX: shown ? 0 : 90 }}
                  className="flex h-12 w-10 items-center justify-center border-b-2 border-[var(--brass)] bg-[rgba(0,0,0,0.25)] font-type text-2xl text-[var(--amber-glow)]"
                >
                  {shown ? ch : ''}
                </motion.div>
              );
            })}
          </div>

          {/* strikes */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            {ids.map((pid) => (
              <div key={pid} className="glass-card !rounded-2xl p-3 text-center">
                <div className="eyebrow">{playerName(room, pid)}</div>
                <div className="mt-1 font-type text-lg text-[var(--blood)]">
                  {'✕'.repeat(Math.min(roundStrikes[pid] ?? 0, HANGMAN_MAX_STRIKES)) || '·'}
                </div>
                <div className="text-xs text-[var(--ink-dim)]">
                  {roundStrikes[pid] ?? 0} / {HANGMAN_MAX_STRIKES} strikes · total{' '}
                  {totalStrikes[pid] ?? 0}
                </div>
              </div>
            ))}
          </div>

          {/* letter board */}
          <div className="mt-5 grid grid-cols-7 gap-1.5 sm:grid-cols-9">
            {LETTERS.map((L) => {
              const used = guessed.includes(L);
              const hit = used && word.includes(L);
              return (
                <motion.div key={L} whileTap={myTurn && !used ? { scale: 0.9 } : undefined}>
                  <button
                    disabled={!myTurn || used}
                    onClick={() => guess(L)}
                    className={
                      'w-full rounded-md border py-1.5 font-type text-sm transition ' +
                      (used
                        ? hit
                          ? 'border-[var(--amber-glow)] bg-[rgba(232,163,61,0.18)] text-[var(--amber-glow)]'
                          : 'border-transparent bg-[rgba(0,0,0,0.35)] text-[var(--ink-faint)] line-through'
                        : 'border-[var(--glass-border)] bg-[rgba(255,255,255,0.04)] text-[var(--ink)] hover:border-[var(--brass)]')
                    }
                  >
                    {L}
                  </button>
                </motion.div>
              );
            })}
          </div>

          {history.length > 0 && (
            <div className="paper-strip mt-5">
              <div className="eyebrow mb-1">Closed rounds</div>
              {history.map((h, i) => (
                <div key={i} className="text-xs">
                  R{i + 1}: <span className="font-type">{h.word}</span> — won by{' '}
                  {h.winner === 'draw' ? 'nobody (draw)' : playerName(room, h.winner)}
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {phase === 'over' && (
        <ManilaFolder className="p-6 text-center">
          <div className="type-heading text-2xl">
            {winner === 'draw'
              ? '🤝 Case inconclusive — a draw'
              : winner === room.me.id
                ? '🏆 You closed the case!'
                : `🕵️ ${playerName(room, winner)} closed the case`}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {ids.map((pid) => (
              <div key={pid} className="glass-card !rounded-2xl p-3">
                <div className="eyebrow">{playerName(room, pid)}</div>
                <div className="type-heading mt-1 text-3xl">{totalStrikes[pid] ?? 0}</div>
                <div className="text-xs text-[var(--ink-dim)]">total strikes</div>
              </div>
            ))}
          </div>
          <div className="paper-strip mt-4 text-left">
            {history.map((h, i) => (
              <div key={i} className="text-xs">
                R{i + 1}: <span className="font-type">{h.word}</span> —{' '}
                {h.winner === 'draw' ? 'draw' : playerName(room, h.winner)}
              </div>
            ))}
          </div>
          <button onClick={reset} className="noir-btn mt-5">
            🔁 New investigation
          </button>
        </ManilaFolder>
      )}
    </div>
  );
}
