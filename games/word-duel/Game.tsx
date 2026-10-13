'use client';

/* Word Duel — each detective seals a 5-letter secret word; both race to
 * crack the opponent's word in 6 tries. Fewer tries wins.
 * State: room.shared.games['word-duel'] (see types.ts).
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameProps } from '../types';
import type { WordDuelShared } from './types';
import {
  addGuess,
  wordDuelWinner,
  wordleFeedback,
  WORD_DUEL_TRIES,
  WORD_DUEL_LENGTH,
  type LetterMark,
} from './logic';
import { randomWord } from '../../lib/content/words';
import { awardXP, syncXpToRoom, XP_AWARDS } from '../../lib/xp';
import { sounds } from '../../lib/sound';
import { GlassCard } from '../../components/GlassCard';
import { ManilaFolder } from '../../components/props';
import '../ui-kit/kit.css';
import { GameButton, GameCard, ScoreHUD, ResultModal, SectionTitle } from '../ui-kit';

const SLUG = 'word-duel';
const HOUSE = 'house';
const KEYBOARD = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

const MARK_CARD: Record<LetterMark, 'correct' | 'misplaced' | 'absent'> = {
  correct: 'correct',
  present: 'misplaced',
  absent: 'absent',
};

function playerName(room: GameProps['room'], pid: string | null | undefined): string {
  if (!pid) return '—';
  if (pid === room.me.id) return 'You';
  if (pid === HOUSE) return 'The House';
  return room.peer?.name ?? 'Partner';
}

export default function WordDuelGame({ room }: GameProps) {
  const gs: WordDuelShared = room.shared?.games?.[SLUG] ?? {};
  const phase = gs.phase ?? 'setup';
  const secrets = gs.secrets ?? {};
  const guesses = gs.guesses ?? {};
  const winner = gs.winner ?? null;
  const awardedRef = useRef(false);

  const [secretInput, setSecretInput] = useState('');
  const [guessInput, setGuessInput] = useState('');

  const opponentId = room.peer ? room.peer.id : HOUSE;
  const ids = [room.me.id, opponentId];
  const myGuesses = guesses[room.me.id] ?? [];
  const target = secrets[opponentId] ?? '';
  const mySecret = secrets[room.me.id] ?? '';

  // derived winner — written to shared when the game closes
  const derived = wordDuelWinner(secrets, guesses, ids);
  useEffect(() => {
    if (phase === 'play' && derived && winner !== derived) {
      room.setShared({ games: { [SLUG]: { phase: 'over', winner: derived } } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [derived, phase]);

  useEffect(() => {
    if (winner && winner !== 'draw' && winner === room.me.id && !awardedRef.current) {
      awardedRef.current = true;
      awardXP(XP_AWARDS.duoWin);
      syncXpToRoom(room.setShared, room.me.id, room.me.name);
      sounds.stampThud();
    }
  }, [winner, room]);

  const write = (patch: Partial<WordDuelShared>) =>
    room.setShared({ games: { [SLUG]: patch } });

  const validSecret = (s: string) => /^[A-Za-z]{5}$/.test(s.trim());

  const sealSecret = () => {
    const s = secretInput.trim().toUpperCase();
    if (!validSecret(s)) return;
    sounds.pinTap();
    const nextSecrets = { ...secrets, [room.me.id]: s };
    const patch: Partial<WordDuelShared> = { secrets: nextSecrets };
    // solo: the house seals a word too
    if (!room.peer && !nextSecrets[HOUSE]) {
      patch.secrets = { ...nextSecrets, [HOUSE]: randomWord(5) };
    }
    if (patch.secrets![room.me.id] && patch.secrets![opponentId]) {
      patch.phase = 'play';
    }
    write(patch);
    setSecretInput('');
  };

  const submitGuess = () => {
    const g = guessInput.trim().toUpperCase();
    if (phase !== 'play' || !/^[A-Za-z]{5}$/.test(g)) return;
    if (myGuesses.length >= WORD_DUEL_TRIES) return;
    sounds.typewriterClick();
    write({ guesses: addGuess(guesses, room.me.id, g) });
    setGuessInput('');
  };

  const reset = () => {
    awardedRef.current = false;
    write({ phase: 'setup', secrets: {}, guesses: {}, winner: null });
  };

  // keyboard letter states from my guesses
  const keyState: Record<string, LetterMark> = {};
  myGuesses.forEach((g) => {
    wordleFeedback(target, g).forEach((m, i) => {
      const L = g[i];
      const rank = { absent: 0, present: 1, correct: 2 };
      if (rank[m] > rank[keyState[L] ?? 'absent']) keyState[L] = m;
    });
  });

  const solved = myGuesses.some((g) => g === target);
  const outOfTries = myGuesses.length >= WORD_DUEL_TRIES && !solved;

  return (
    <div className="gk-root mx-auto max-w-xl">
      <div className="mb-4 text-center">
        <SectionTitle eyebrow="Case file № 12 — Word & Code Duels" title="Word Duel" />
        <p className="mt-1 text-sm text-[var(--ink-dim)]">
          Seal a secret 5-letter word. Crack {room.peer ? 'your partner\u2019s' : 'the house\u2019s'} in{' '}
          {WORD_DUEL_TRIES} tries — fewer tries wins.
        </p>
      </div>

      {phase === 'setup' && (
        <ManilaFolder className="p-6 text-center">
          <div className="type-heading text-xl">Seal Your Word</div>
          <p className="mt-2 text-sm text-[var(--ink-dim)]">
            Type a 5-letter word. Your partner will try to crack it — and you theirs.
          </p>
          {mySecret ? (
            <div className="paper-strip mt-4">
              ✅ Your word is sealed: <span className="font-type tracking-[0.3em]">{mySecret}</span>
              <div className="mt-1 text-xs">
                {secrets[opponentId]
                  ? 'Both sealed — the duel begins…'
                  : `Waiting for ${playerName(room, opponentId)} to seal theirs…`}
              </div>
            </div>
          ) : (
            <div className="mt-4 flex justify-center gap-2">
              <input
                value={secretInput}
                onChange={(e) => setSecretInput(e.target.value.toUpperCase().slice(0, 5))}
                onKeyDown={(e) => e.key === 'Enter' && sealSecret()}
                placeholder="CRIME"
                maxLength={5}
                className="noir-input w-36 text-center font-type text-xl tracking-[0.3em]"
              />
              <GameButton variant="primary" onClick={sealSecret} disabled={!validSecret(secretInput)}>
                🔏 Seal it
              </GameButton>
            </div>
          )}
        </ManilaFolder>
      )}

      {phase === 'play' && (
        <GlassCard className="p-6">
          <ScoreHUD
            leftLabel={`TARGET: ${playerName(room, opponentId).toUpperCase()}`}
            leftValue={Math.min(myGuesses.length + 1, WORD_DUEL_TRIES)}
            leftSub={`try ${Math.min(myGuesses.length + 1, WORD_DUEL_TRIES)} of ${WORD_DUEL_TRIES}`}
            rightLabel="Tries left"
            rightValue={WORD_DUEL_TRIES - myGuesses.length}
            rightSub={`${WORD_DUEL_LENGTH} letters`}
            record="none"
          />

          {/* guess grid */}
          <div className="mt-4 space-y-1.5">
            {Array.from({ length: WORD_DUEL_TRIES }).map((_, r) => {
              const g = myGuesses[r];
              const marks = g ? wordleFeedback(target, g) : null;
              return (
                <div key={r} className="flex justify-center gap-1.5">
                  {Array.from({ length: WORD_DUEL_LENGTH }).map((_, c) => (
                    <motion.div
                      key={c}
                      initial={g ? { rotateX: 90 } : false}
                      animate={{ rotateX: 0 }}
                      transition={{ delay: g ? c * 0.08 : 0 }}
                    >
                      <GameCard
                        state={marks ? MARK_CARD[marks[c]] : 'default'}
                        className="!h-11 !w-11 !min-h-0 !min-w-0 !rounded-md !p-0 !text-xl"
                      >
                        {g ? g[c] : ''}
                      </GameCard>
                    </motion.div>
                  ))}
                </div>
              );
            })}
          </div>

          {solved ? (
            <div className="paper-strip mt-4 text-center">
              🎯 Cracked in {myGuesses.length} {myGuesses.length === 1 ? 'try' : 'tries'}! Waiting on{' '}
              {playerName(room, opponentId)}…
            </div>
          ) : outOfTries ? (
            <div className="paper-strip mt-4 text-center">
              🥀 Out of tries. The word was <span className="font-type">{target}</span>.
            </div>
          ) : (
            <>
              <div className="mt-4 flex justify-center gap-2">
                <input
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value.toUpperCase().slice(0, 5))}
                  onKeyDown={(e) => e.key === 'Enter' && submitGuess()}
                  placeholder="_____"
                  maxLength={5}
                  className="noir-input w-36 text-center font-type text-xl tracking-[0.3em]"
                />
                <GameButton
                  variant="primary"
                  onClick={submitGuess}
                  disabled={!/^[A-Za-z]{5}$/.test(guessInput)}
                >
                  🔍 Guess
                </GameButton>
              </div>
              {/* keyboard */}
              <div className="mt-4 space-y-1.5">
                {KEYBOARD.map((row, i) => (
                  <div key={i} className="flex justify-center gap-1">
                    {row.split('').map((L) => (
                      <GameCard
                        key={L}
                        state={keyState[L] ? MARK_CARD[keyState[L]] : 'default'}
                        onClick={() => setGuessInput((p) => (p + L).slice(0, 5))}
                        ariaLabel={`Type ${L}`}
                        className="!h-9 !w-7 !min-h-0 !min-w-0 !rounded-md !p-0 !text-xs"
                      >
                        {L}
                      </GameCard>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}

          {room.peer && (
            <div className="mt-4 text-center text-xs text-[var(--ink-dim)]">
              {playerName(room, opponentId)} has made {(guesses[opponentId] ?? []).length}{' '}
              {((guesses[opponentId] ?? []).length === 1) ? 'guess' : 'guesses'}
            </div>
          )}
        </GlassCard>
      )}

      {phase === 'over' && (
        <div className="gk-modal-scope">
          <ManilaFolder className="p-6 text-center">
            <div className="grid grid-cols-2 gap-3 text-left">
              {ids.map((pid) => {
                const other = pid === room.me.id ? opponentId : room.me.id;
                const targetWord = secrets[other] ?? '?????';
                const pg = guesses[pid] ?? [];
                const idx = pg.findIndex((g) => g === targetWord);
                return (
                  <div key={pid} className="glass-card !rounded-2xl p-3">
                    <div className="eyebrow">{playerName(room, pid)} guessed</div>
                    <div className="type-heading mt-1 text-2xl tracking-[0.2em]">{targetWord}</div>
                    <div className="text-xs text-[var(--ink-dim)]">
                      {idx === -1
                        ? 'unsolved'
                        : `solved in ${idx + 1} ${idx === 0 ? 'try' : 'tries'}`}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5">
              <GameButton variant="primary" onClick={reset}>
                🔁 New duel
              </GameButton>
            </div>
          </ManilaFolder>
          <ResultModal
            open
            eyebrow="Duel over"
            headline={
              winner === 'draw'
                ? 'Both cases went cold — draw'
                : winner === room.me.id
                  ? 'You cracked it first'
                  : `${playerName(room, winner)} cracked it first`
            }
            stat={`${guesses[room.me.id]?.length ?? 0} tries used · ${WORD_DUEL_TRIES} max`}
            tone={winner === 'draw' ? 'draw' : winner === room.me.id ? 'win' : 'lose'}
            primaryLabel="🔁 New duel"
            onPrimary={reset}
          />
        </div>
      )}
    </div>
  );
}
