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
  HANGMAN_MAX_STRIKES,
  HANGMAN_ROUNDS,
  ROUND_LENGTHS,
  roundWinner,
  matchWinner,
} from './logic';
import { randomWord } from '../../lib/content/words';
import { awardXP, syncXpToRoom, XP_AWARDS } from '../../lib/xp';
import { sounds } from '../../lib/sound';
import { ManilaFolder } from '../../components/props';
import '../ui-kit/kit.css';
import './hangman-duel.css';
import { GameButton, TurnBanner, ScoreHUD, ResultModal, SectionTitle } from '../ui-kit';

const SLUG = 'hangman-duel';
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/* Classic clean gallows. Body parts draw themselves in as strikes land
 * (framer-motion pathLength). Order: head, body, arms, legs. */
function Gallows({ strikes }: { strikes: number }) {
  const draw = { initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { duration: 0.4 } };
  const parts = [
    <motion.circle key="head" className="hm-head" cx={92} cy={44} r={13} {...draw} />,
    <motion.line key="body" className="hm-part" x1={92} y1={57} x2={92} y2={98} {...draw} />,
    <motion.line key="armL" className="hm-part" x1={92} y1={68} x2={77} y2={84} {...draw} />,
    <motion.line key="armR" className="hm-part" x1={92} y1={68} x2={107} y2={84} {...draw} />,
    <motion.line key="legL" className="hm-part" x1={92} y1={98} x2={79} y2={122} {...draw} />,
    <motion.line key="legR" className="hm-part" x1={92} y1={98} x2={105} y2={122} {...draw} />,
  ];
  return (
    <svg
      className="hm-gallows"
      viewBox="0 0 124 140"
      role="img"
      aria-label={`Gallows, ${strikes} of ${HANGMAN_MAX_STRIKES} parts drawn`}
    >
      <line className="hm-wood" x1={12} y1={132} x2={74} y2={132} />
      <line className="hm-wood" x1={32} y1={132} x2={32} y2={12} />
      <line className="hm-wood" x1={32} y1={12} x2={92} y2={12} />
      <line className="hm-rope" x1={92} y1={12} x2={92} y2={31} />
      {parts.slice(0, Math.max(0, Math.min(strikes, parts.length)))}
    </svg>
  );
}

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
    <div className="gk-root mx-auto max-w-2xl">
      <div className="mb-4 text-center">
        <SectionTitle eyebrow="Case file № 07 — Word & Code Duels" title="Hangman Duel" />
        <p className="mt-1 text-sm text-[var(--gk-ink-dim)]">
          One secret word. Alternate letter guesses. Fewest strikes over {HANGMAN_ROUNDS}{' '}
          rounds closes the case.
        </p>
      </div>

      {phase === 'lobby' && (
        <ManilaFolder className="p-6 text-center">
          <div className="type-heading text-xl">The Interrogation Room</div>
          <p className="mt-2 text-sm text-[var(--gk-ink-dim)]">
            A word is sealed in the envelope. Each wrong letter is a strike against you —
            {HANGMAN_MAX_STRIKES} strikes and the round goes cold.
          </p>
          {!room.peer && (
            <p className="mt-2 text-xs text-[var(--gk-ink-faint)]">
              Solo practice — create a room from the hub to duel live.
            </p>
          )}
          <GameButton variant="primary" onClick={startMatch} className="mt-5">
            🗂 Open the case file
          </GameButton>
        </ManilaFolder>
      )}

      {phase === 'play' && (
        <div>
          <TurnBanner
            isYourTurn={myTurn}
            yourText="🎯 Your move"
            theirText={room.peer ? `⏳ ${playerName(room, turn)} is guessing` : '⏳ Waiting'}
          />

          {/* shared word blanks on worksheet paper */}
          <div className="hm-wordpaper mt-4">
            <div className="hm-blanks" role="group" aria-label="Secret word">
              {word.split('').map((ch, i) => {
                const shown = guessed.includes(ch);
                return (
                  <div
                    key={i}
                    className="hm-blank"
                    aria-label={shown ? `Letter ${ch}` : 'Hidden letter'}
                  >
                    {shown ? ch : ''}
                  </div>
                );
              })}
            </div>
          </div>

          {/* one worksheet gallows per duelist */}
          <div className="hm-duel">
            {ids.map((pid) => {
              const s = roundStrikes[pid] ?? 0;
              return (
                <div key={pid} className="hm-paper">
                  <div className="hm-name">{playerName(room, pid)}</div>
                  <Gallows strikes={s} />
                  <div className={`hm-strikes${s >= HANGMAN_MAX_STRIKES - 1 ? ' hm-strikes--danger' : ''}`}>
                    Strikes {s}/{HANGMAN_MAX_STRIKES}
                  </div>
                </div>
              );
            })}
          </div>

          {/* alphabet */}
          <div className="hm-keys" role="group" aria-label="Letter keys">
            {LETTERS.map((L) => {
              const used = guessed.includes(L);
              const hit = used && word.includes(L);
              return (
                <button
                  key={L}
                  type="button"
                  onClick={() => guess(L)}
                  disabled={!myTurn || used}
                  aria-label={`Guess letter ${L}`}
                  className={`hm-key${used ? (hit ? ' hm-key--hit' : ' hm-key--miss') : ''}`}
                >
                  {L}
                </button>
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
        </div>
      )}

      {phase === 'over' && (
        <div className="gk-modal-scope">
          <ManilaFolder className="p-6 text-center">
            <div className="mx-auto max-w-sm">
              <ScoreHUD
                leftLabel={playerName(room, ids[0]).toUpperCase()}
                leftValue={totalStrikes[ids[0]] ?? 0}
                leftSub="total strikes"
                rightLabel={ids[1] ? playerName(room, ids[1]).toUpperCase() : 'rounds'}
                rightValue={ids[1] ? (totalStrikes[ids[1]] ?? 0) : HANGMAN_ROUNDS}
                rightSub={ids[1] ? 'total strikes' : 'played'}
                record="none"
              />
            </div>
            <div className="paper-strip mt-4 text-left">
              {history.map((h, i) => (
                <div key={i} className="text-xs">
                  R{i + 1}: <span className="font-type">{h.word}</span> —{' '}
                  {h.winner === 'draw' ? 'draw' : playerName(room, h.winner)}
                </div>
              ))}
            </div>
            <div className="mt-5">
              <GameButton variant="primary" onClick={reset}>
                🔁 New investigation
              </GameButton>
            </div>
          </ManilaFolder>
          <ResultModal
            open
            eyebrow="Investigation closed"
            headline={
              winner === 'draw'
                ? 'Case inconclusive — draw'
                : winner === room.me.id
                  ? 'You closed the case'
                  : `${playerName(room, winner)} closed the case`
            }
            stat={`${totalStrikes[winner === 'draw' ? room.me.id : (winner as string) ?? room.me.id] ?? 0} strikes · ${HANGMAN_ROUNDS} rounds`}
            tone={winner === 'draw' ? 'draw' : winner === room.me.id ? 'win' : 'lose'}
            primaryLabel="🔁 New investigation"
            onPrimary={reset}
          />
        </div>
      )}
    </div>
  );
}
