'use client';

/* Cipher Duel — Bulls & Cows. Each detective seals a 4-digit code (unique
 * digits); detectives alternate guesses. First exact crack wins.
 * State: room.shared.games['cipher-duel'] (see types.ts).
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameProps } from '../types';
import type { CipherDuelShared } from './types';
import {
  addScoredGuess,
  cipherDuelWinner,
  isValidCode,
} from './logic';
import { awardXP, syncXpToRoom, XP_AWARDS } from '../../lib/xp';
import { sounds } from '../../lib/sound';
import { GlassCard } from '../../components/GlassCard';
import { Typewriter } from '../../components/Typewriter';
import { ManilaFolder } from '../../components/props';

const SLUG = 'cipher-duel';

function playerName(room: GameProps['room'], pid: string | null | undefined): string {
  if (!pid) return '—';
  if (pid === room.me.id) return 'You';
  return room.peer?.name ?? 'Partner';
}

export default function CipherDuelGame({ room }: GameProps) {
  const gs: CipherDuelShared = room.shared?.games?.[SLUG] ?? {};
  const phase = gs.phase ?? 'setup';
  const codes = gs.codes ?? {};
  const guesses = gs.guesses ?? {};
  const turn = gs.turn ?? null;
  const winner = gs.winner ?? null;
  const awardedRef = useRef(false);

  const [codeInput, setCodeInput] = useState('');
  const [guessInput, setGuessInput] = useState('');

  const opponentId = room.peer?.id ?? null;
  const ids = opponentId ? [room.me.id, opponentId] : [room.me.id];
  const myGuesses = guesses[room.me.id] ?? [];
  const target = opponentId ? codes[opponentId] ?? '' : '';
  const myCode = codes[room.me.id] ?? '';
  const myTurn = turn === room.me.id;

  const derived = cipherDuelWinner(codes, guesses, ids);
  useEffect(() => {
    if (phase === 'play' && derived && winner !== derived) {
      room.setShared({ games: { [SLUG]: { phase: 'over', winner: derived } } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [derived, phase]);

  useEffect(() => {
    if (winner && winner === room.me.id && !awardedRef.current) {
      awardedRef.current = true;
      awardXP(XP_AWARDS.duoWin);
      syncXpToRoom(room.setShared, room.me.id, room.me.name);
      sounds.stampThud();
    }
  }, [winner, room]);

  const write = (patch: Partial<CipherDuelShared>) =>
    room.setShared({ games: { [SLUG]: patch } });

  const sealCode = () => {
    const c = codeInput.trim();
    if (!isValidCode(c)) return;
    sounds.pinTap();
    const nextCodes = { ...codes, [room.me.id]: c };
    const patch: Partial<CipherDuelShared> = { codes: nextCodes };
    if (opponentId && nextCodes[opponentId]) {
      patch.phase = 'play';
      // the detective who sealed first starts guessing
      patch.turn = codes[opponentId] ? opponentId : room.me.id;
    }
    write(patch);
    setCodeInput('');
  };

  const submitGuess = () => {
    const g = guessInput.trim();
    if (phase !== 'play' || !myTurn || !isValidCode(g)) return;
    if (myGuesses.some((x) => x.guess === g)) return;
    sounds.typewriterClick();
    const next = addScoredGuess(guesses, room.me.id, target, g);
    const cracked = g === target;
    write({
      guesses: next,
      turn: cracked ? turn : opponentId,
      ...(cracked ? { phase: 'over', winner: room.me.id } : {}),
    });
    setGuessInput('');
  };

  const reset = () => {
    awardedRef.current = false;
    write({ phase: 'setup', codes: {}, guesses: {}, turn: null, winner: null });
  };

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 text-center">
        <div className="eyebrow">Case file № 23 — Word & Code Duels</div>
        <Typewriter as="h2" text="CIPHER DUEL" className="type-heading mt-1 text-3xl" />
        <p className="mt-1 text-sm text-[var(--ink-dim)]">
          Bulls &amp; Cows: seal a 4-digit safe code, then crack your partner&rsquo;s with
          alternating guesses. 🐂 bull = right digit, right place · 🐄 cow = right digit, wrong place.
        </p>
      </div>

      {phase === 'setup' && (
        <ManilaFolder className="p-6 text-center">
          <div className="type-heading text-xl">Set the Safe Combination</div>
          <p className="mt-2 text-sm text-[var(--ink-dim)]">
            Four digits, no repeats (e.g. 7391). Your partner must crack it.
          </p>
          {!room.peer && (
            <p className="mt-2 text-xs text-[var(--ink-faint)]">
              No partner in the room — Cipher Duel needs two detectives.
            </p>
          )}
          {myCode ? (
            <div className="paper-strip mt-4">
              🔒 Your code is sealed:{' '}
              <span className="font-type tracking-[0.3em]">{myCode}</span>
              <div className="mt-1 text-xs">
                {opponentId && codes[opponentId]
                  ? 'Both sealed — the duel begins…'
                  : `Waiting for ${playerName(room, opponentId)} to seal theirs…`}
              </div>
            </div>
          ) : (
            <div className="mt-4 flex justify-center gap-2">
              <input
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                onKeyDown={(e) => e.key === 'Enter' && sealCode()}
                placeholder="7391"
                inputMode="numeric"
                maxLength={4}
                className="noir-input w-32 text-center font-type text-xl tracking-[0.3em]"
              />
              <button onClick={sealCode} disabled={!isValidCode(codeInput)} className="noir-btn">
                🔏 Seal it
              </button>
            </div>
          )}
        </ManilaFolder>
      )}

      {phase === 'play' && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div className="eyebrow">Cracking: {playerName(room, opponentId)}&rsquo;s safe</div>
            <div className="eyebrow">{myTurn ? '🎯 Your move' : '⏳ Partner is guessing'}</div>
          </div>

          <div className="mt-4 space-y-1.5">
            {myGuesses.length === 0 && (
              <div className="text-center text-sm text-[var(--ink-faint)]">
                No guesses yet — dial the first combination.
              </div>
            )}
            {myGuesses.map((g, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-center gap-3"
              >
                <span className="font-type text-xl tracking-[0.25em]">{g.guess}</span>
                <span className="text-sm">
                  {'🐂'.repeat(g.bulls)}{'🐄'.repeat(g.cows)}
                  <span className="ml-2 text-xs text-[var(--ink-dim)]">
                    {g.bulls}B · {g.cows}C
                  </span>
                </span>
              </motion.div>
            ))}
          </div>

          <div className="mt-5 flex justify-center gap-2">
            <input
              value={guessInput}
              onChange={(e) => setGuessInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
              onKeyDown={(e) => e.key === 'Enter' && submitGuess()}
              placeholder="____"
              inputMode="numeric"
              maxLength={4}
              disabled={!myTurn}
              className="noir-input w-32 text-center font-type text-xl tracking-[0.3em]"
            />
            <button
              onClick={submitGuess}
              disabled={!myTurn || !isValidCode(guessInput)}
              className="noir-btn"
            >
              🔓 Crack
            </button>
          </div>
          {room.peer && (
            <div className="mt-3 text-center text-xs text-[var(--ink-dim)]">
              {playerName(room, opponentId)} has made {(guesses[opponentId] ?? []).length} guesses
            </div>
          )}
        </GlassCard>
      )}

      {phase === 'over' && (
        <ManilaFolder className="p-6 text-center">
          <div className="type-heading text-2xl">
            {winner === room.me.id ? '🏆 Safe cracked — you win!' : `🕵️ ${playerName(room, winner)} cracked it first`}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-left">
            {ids.map((pid) => {
              const other = pid === room.me.id ? opponentId : room.me.id;
              const pg = guesses[pid] ?? [];
              return (
                <div key={pid} className="glass-card !rounded-2xl p-3">
                  <div className="eyebrow">{playerName(room, pid)} cracked</div>
                  <div className="type-heading mt-1 text-2xl tracking-[0.2em]">
                    {other ? codes[other] ?? '????' : '—'}
                  </div>
                  <div className="text-xs text-[var(--ink-dim)]">
                    in {pg.length} {pg.length === 1 ? 'guess' : 'guesses'}
                  </div>
                </div>
              );
            })}
          </div>
          <button onClick={reset} className="noir-btn mt-5">
            🔁 New duel
          </button>
        </ManilaFolder>
      )}
    </div>
  );
}
