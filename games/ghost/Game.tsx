'use client';

/* Ghost — detectives alternate adding a letter to a shared fragment.
 * Complete a valid word (4+ letters) and you lose the round. Instead of
 * playing, you may challenge the previous play as a bluff.
 * State: room.shared.games['ghost'] (see types.ts).
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameProps } from '../types';
import type { GhostShared } from './types';
import {
  adjudicateChallenge,
  GHOST_ROUNDS_TO_LOSE,
  isViablePrefix,
  matchWinner,
  playLetter,
} from './logic';
import { WORDS_4, WORDS_5, WORDS_6 } from '../../lib/content/words';
import { awardXP, syncXpToRoom, XP_AWARDS } from '../../lib/xp';
import { sounds } from '../../lib/sound';
import { GlassCard } from '../../components/GlassCard';
import { Typewriter } from '../../components/Typewriter';
import { ManilaFolder } from '../../components/props';

const SLUG = 'ghost';
const BANK = [...WORDS_4, ...WORDS_5, ...WORDS_6];
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function playerName(room: GameProps['room'], pid: string | null | undefined): string {
  if (!pid) return '—';
  if (pid === room.me.id) return 'You';
  return room.peer?.name ?? 'Partner';
}

export default function GhostGame({ room }: GameProps) {
  const gs: GhostShared = room.shared?.games?.[SLUG] ?? {};
  const phase = gs.phase ?? 'lobby';
  const fragment = (gs.fragment ?? '').toUpperCase();
  const turn = gs.turn ?? null;
  const lastMover = gs.lastMover ?? null;
  const roundLosses = gs.roundLosses ?? {};
  const round = gs.round ?? 1;
  const winner = gs.winner ?? null;
  const log = gs.log ?? [];
  const awardedRef = useRef(false);

  const [letter, setLetter] = useState('');

  const ids = room.peer ? [room.me.id, room.peer.id] : [room.me.id];
  const myTurn = turn === room.me.id;
  const viable = isViablePrefix(fragment, BANK);

  useEffect(() => {
    if (winner && winner === room.me.id && !awardedRef.current) {
      awardedRef.current = true;
      awardXP(XP_AWARDS.duoWin);
      syncXpToRoom(room.setShared, room.me.id, room.me.name);
      sounds.stampThud();
    }
  }, [winner, room]);

  const write = (patch: Partial<GhostShared>) =>
    room.setShared({ games: { [SLUG]: patch } });

  const startMatch = () => {
    awardedRef.current = false;
    sounds.paperShuffle();
    write({
      phase: 'play',
      fragment: '',
      turn: room.me.id,
      lastMover: null,
      roundLosses: {},
      round: 1,
      winner: null,
      log: [`Round 1 — ${room.me.name} opens the séance.`],
    });
  };

  const endRound = (loserId: string, reason: string) => {
    const nextLosses = { ...roundLosses, [loserId]: (roundLosses[loserId] ?? 0) + 1 };
    const mw = matchWinner(nextLosses, ids);
    const nextLog = [...log, reason];
    if (mw) {
      write({ roundLosses: nextLosses, phase: 'over', winner: mw, log: nextLog });
    } else {
      // next round: the loser of this round starts
      write({
        fragment: '',
        turn: loserId,
        lastMover: null,
        roundLosses: nextLosses,
        round: round + 1,
        log: [...nextLog, `Round ${round + 1} — ${playerName(room, loserId)} opens.`],
      });
    }
  };

  const play = (L: string) => {
    if (phase !== 'play' || !myTurn || !/^[A-Z]$/.test(L)) return;
    sounds.typewriterClick();
    const { fragment: next, outcome } = playLetter(fragment, L, BANK);
    if (outcome === 'mover-loses-round') {
      sounds.stampThud();
      endRound(
        room.me.id,
        `💀 ${room.me.name} completed “${next}” — round lost.`,
      );
      return;
    }
    const other = ids.find((id) => id !== room.me.id) ?? room.me.id;
    write({
      fragment: next,
      turn: other,
      lastMover: room.me.id,
      log: [...log, `${room.me.name} played “${L}” → ${next}`],
    });
    setLetter('');
  };

  const challenge = () => {
    if (phase !== 'play' || !myTurn || !fragment || !lastMover) return;
    sounds.pinTap();
    const outcome = adjudicateChallenge(fragment, BANK);
    if (outcome === 'challenger-loses') {
      endRound(
        room.me.id,
        `⚖️ ${room.me.name} challenged “${fragment}” — but a word was possible. Challenge failed!`,
      );
    } else {
      endRound(
        lastMover,
        `⚖️ ${room.me.name} challenged “${fragment}” — no word possible. ${playerName(room, lastMover)} was bluffing!`,
      );
    }
  };

  const reset = () => {
    awardedRef.current = false;
    write({
      phase: 'lobby',
      fragment: '',
      turn: null,
      lastMover: null,
      roundLosses: {},
      round: 1,
      winner: null,
      log: [],
    });
  };

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 text-center">
        <div className="eyebrow">Case file № 31 — Word & Code Duels</div>
        <Typewriter as="h2" text="GHOST" className="type-heading mt-1 text-3xl" />
        <p className="mt-1 text-sm text-[var(--ink-dim)]">
          Add one letter per turn. Complete a word (4+ letters) and the round is yours to lose —
          or <em>challenge</em> a bluff instead of playing.
        </p>
      </div>

      {phase === 'lobby' && (
        <ManilaFolder className="p-6 text-center">
          <div className="type-heading text-xl">The Séance Rules</div>
          <p className="mt-2 text-sm text-[var(--ink-dim)]">
            First detective to lose {GHOST_ROUNDS_TO_LOSE} rounds loses the match. Words come
            from the case dictionary (4–6 letters).
          </p>
          {!room.peer && (
            <p className="mt-2 text-xs text-[var(--ink-faint)]">
              Solo practice — you play both sides of the séance.
            </p>
          )}
          <button onClick={startMatch} className="noir-btn mt-5">
            👻 Begin the séance
          </button>
        </ManilaFolder>
      )}

      {phase === 'play' && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div className="eyebrow">Round {round}</div>
            <div className="eyebrow">{myTurn ? '🎯 Your move' : `⏳ ${playerName(room, turn)} is writing`}</div>
          </div>

          {/* fragment display */}
          <div className="mt-5 flex min-h-[4rem] flex-wrap items-center justify-center gap-1.5">
            {fragment.split('').map((ch, i) => (
              <motion.div
                key={`${i}-${ch}`}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex h-12 w-10 items-center justify-center rounded-md border border-[var(--brass)] bg-[rgba(0,0,0,0.3)] font-type text-2xl text-[var(--amber-glow)]"
              >
                {ch}
              </motion.div>
            ))}
            {fragment === '' && (
              <span className="font-type text-lg text-[var(--ink-faint)]">— the page is blank —</span>
            )}
          </div>
          <div className="mt-2 text-center text-xs text-[var(--ink-dim)]">
            {fragment && (viable ? '📖 a word could still be forming…' : '🚩 no word can form from this!')}
          </div>

          {/* round losses */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            {ids.map((pid) => (
              <div key={pid} className="glass-card !rounded-2xl p-2 text-center">
                <div className="eyebrow">{playerName(room, pid)}</div>
                <div className="font-type text-lg">
                  {'👻'.repeat(roundLosses[pid] ?? 0) || '·'}
                </div>
              </div>
            ))}
          </div>

          {/* controls */}
          {myTurn ? (
            <div className="mt-5">
              <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-9">
                {LETTERS.map((L) => (
                  <motion.div key={L} whileTap={{ scale: 0.9 }}>
                    <button
                      onClick={() => play(L)}
                      className="w-full rounded-md border border-[var(--glass-border)] bg-[rgba(255,255,255,0.04)] py-1.5 font-type text-sm text-[var(--ink)] hover:border-[var(--brass)]"
                    >
                      {L}
                    </button>
                  </motion.div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-center gap-2">
                <input
                  value={letter}
                  onChange={(e) => setLetter(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 1))}
                  onKeyDown={(e) => e.key === 'Enter' && letter && play(letter)}
                  placeholder="?"
                  maxLength={1}
                  className="noir-input w-12 text-center font-type text-lg"
                />
                <button onClick={() => letter && play(letter)} disabled={!letter} className="noir-btn">
                  ✍ Play letter
                </button>
                <button
                  onClick={challenge}
                  disabled={!fragment || !lastMover}
                  className="noir-btn-ghost"
                  title="Claim the previous play was a bluff"
                >
                  ⚖ Challenge
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 text-center text-sm text-[var(--ink-dim)]">
              Waiting for {playerName(room, turn)} to play or challenge…
            </div>
          )}

          {/* case log */}
          <div className="paper-strip mt-5 max-h-36 overflow-y-auto">
            <div className="eyebrow mb-1">Séance log</div>
            {log.slice(-6).map((line, i) => (
              <div key={i} className="text-xs">{line}</div>
            ))}
          </div>
        </GlassCard>
      )}

      {phase === 'over' && (
        <ManilaFolder className="p-6 text-center">
          <div className="type-heading text-2xl">
            {winner === room.me.id ? '🏆 The ghost spares you!' : `👻 ${playerName(room, winner)} is haunted`}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {ids.map((pid) => (
              <div key={pid} className="glass-card !rounded-2xl p-3">
                <div className="eyebrow">{playerName(room, pid)}</div>
                <div className="type-heading mt-1 text-3xl">{roundLosses[pid] ?? 0}</div>
                <div className="text-xs text-[var(--ink-dim)]">rounds lost</div>
              </div>
            ))}
          </div>
          <button onClick={reset} className="noir-btn mt-5">
            🔁 New séance
          </button>
        </ManilaFolder>
      )}
    </div>
  );
}
