'use client';

/* Codenames Duet (simplified co-op) — 5x5 grid, 9 agents to find, 3 assassins
 * to dodge. The clue-giver role alternates each turn; the team has 9 turns.
 * State: room.shared.games['codenames-duet'] (see types.ts).
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameProps } from '../types';
import type { CodenamesShared } from './types';
import {
  agentsFound,
  allAgentsFound,
  buildBoard,
  isLegalClue,
  outOfTurns,
  revealCard,
  DUET_AGENTS,
  DUET_ASSASSINS,
  DUET_MAX_TURNS,
  type CardKind,
} from './logic';
import { WORDS_4, WORDS_5, WORDS_6 } from '../../lib/content/words';
import { awardXP, syncXpToRoom, XP_AWARDS } from '../../lib/xp';
import { recordCoopWin } from '../../lib/lovenotes';
import { sounds } from '../../lib/sound';
import { GlassCard } from '../../components/GlassCard';
import { ManilaFolder } from '../../components/props';
import '../ui-kit/kit.css';
import { GameButton, TurnBanner, ScoreHUD, ResultModal, SectionTitle } from '../ui-kit';

const SLUG = 'codenames-duet';
const POOL = [...WORDS_4, ...WORDS_5, ...WORDS_6];

const CARD_STYLE: Record<CardKind, { revealed: string; hint: string }> = {
  agent: {
    revealed: 'border-[var(--amber-glow)] bg-[rgba(232,163,61,0.22)] text-[var(--amber-glow)]',
    hint: 'ring-2 ring-[var(--amber-glow)]/60',
  },
  assassin: {
    revealed: 'border-[var(--blood)] bg-[rgba(120,10,10,0.55)] text-[#ffb3b3]',
    hint: 'ring-2 ring-[var(--blood)]/70',
  },
  bystander: {
    revealed: 'border-[var(--glass-border)] bg-[rgba(120,120,120,0.25)] text-[var(--ink-dim)]',
    hint: '',
  },
};

function playerName(room: GameProps['room'], pid: string | null | undefined): string {
  if (!pid) return '—';
  if (pid === room.me.id) return 'You';
  return room.peer?.name ?? 'Partner';
}

export default function CodenamesDuetGame({ room }: GameProps) {
  const gs: CodenamesShared = room.shared?.games?.[SLUG] ?? {};
  const phase = gs.phase ?? 'lobby';
  const words = gs.words ?? [];
  const key = gs.key ?? [];
  const revealed = gs.revealed ?? [];
  const clueGiver = gs.clueGiver ?? null;
  const clue = gs.clue ?? null;
  const guessesLeft = gs.guessesLeft ?? 0;
  const turn = gs.turn ?? 1;
  const maxTurns = gs.maxTurns ?? DUET_MAX_TURNS;
  const result = gs.result ?? null;
  const loseReason = gs.loseReason ?? '';
  const log = gs.log ?? [];
  const awardedRef = useRef(false);

  const [clueWord, setClueWord] = useState('');
  const [clueCount, setClueCount] = useState('2');
  const [clueError, setClueError] = useState<string | null>(null);

  const otherId = room.peer?.id ?? room.me.id;
  const iAmGiver = clueGiver === room.me.id;
  const found = agentsFound(key, revealed);

  useEffect(() => {
    if (result === 'win' && !awardedRef.current) {
      awardedRef.current = true;
      awardXP(XP_AWARDS.coopWin);
      syncXpToRoom(room.setShared, room.me.id, room.me.name);
      recordCoopWin();
      sounds.stampThud();
    }
  }, [result, room]);

  const write = (patch: Partial<CodenamesShared>) =>
    room.setShared({ games: { [SLUG]: patch } });

  const startBoard = () => {
    awardedRef.current = false;
    sounds.paperShuffle();
    const { words: w, key: k } = buildBoard(POOL);
    write({
      phase: 'play',
      words: w,
      key: k,
      revealed: Array(w.length).fill(false),
      clueGiver: room.me.id,
      clue: null,
      guessesLeft: 0,
      turn: 1,
      maxTurns: DUET_MAX_TURNS,
      result: null,
      loseReason: '',
      log: [`Turn 1 — ${room.me.name} takes the informant's chair.`],
    });
  };

  const endTurn = (note: string) => {
    const nextTurn = turn + 1;
    const nextGiver = clueGiver === room.me.id ? otherId : room.me.id;
    const nextLog = [...log, note];
    if (outOfTurns(nextTurn, maxTurns)) {
      write({ result: 'lose', loseReason: 'The trail went cold — out of turns.', log: [...nextLog, '❄️ Out of turns. Case cold.'] });
      return;
    }
    write({
      clueGiver: nextGiver,
      clue: null,
      guessesLeft: 0,
      turn: nextTurn,
      log: [...nextLog, `Turn ${nextTurn} — ${playerName(room, nextGiver)} takes the chair.`],
    });
  };

  const giveClue = () => {
    const w = clueWord.trim().toUpperCase();
    const n = parseInt(clueCount, 10);
    if (!isLegalClue(w, words, revealed)) {
      setClueError('Illegal clue — must be one word, not matching a board card.');
      return;
    }
    if (!Number.isFinite(n) || n < 1 || n > 5) {
      setClueError('Pick a number of cards from 1 to 5.');
      return;
    }
    setClueError(null);
    sounds.pinTap();
    write({
      clue: { word: w, count: n },
      guessesLeft: n + 1,
      log: [...log, `💡 ${room.me.name} clues “${w}” — ${n}.`],
    });
    setClueWord('');
  };

  const guessCard = (index: number) => {
    if (phase !== 'play' || iAmGiver || !clue || revealed[index] || guessesLeft <= 0) return;
    sounds.typewriterClick();
    const { revealed: next, outcome } = revealCard(revealed, key, index);
    const label = words[index];
    if (outcome === 'assassin') {
      write({
        revealed: next,
        result: 'lose',
        loseReason: `💀 ${room.me.name} uncovered the assassin (“${label}”).`,
        log: [...log, `💀 Assassin uncovered: ${label}. Case blown.`],
      });
      return;
    }
    if (outcome === 'agent') {
      if (allAgentsFound(key, next)) {
        write({
          revealed: next,
          result: 'win',
          log: [...log, `✅ Agent found: ${label}. All ${DUET_AGENTS} agents safe — case closed!`],
        });
        return;
      }
      const left = guessesLeft - 1;
      if (left <= 0) {
        endTurn(`✅ Agent found: ${label}. ${playerName(room, clueGiver)}'s clue is spent.`);
      } else {
        write({ revealed: next, guessesLeft: left, log: [...log, `✅ Agent found: ${label}.`] });
      }
      return;
    }
    // bystander — turn ends immediately
    write({ revealed: next });
    endTurn(`🚶 Bystander: ${label}. The lead fizzles.`);
  };

  const passTurn = () => {
    if (phase !== 'play' || iAmGiver || !clue) return;
    sounds.paperShuffle();
    endTurn(`⏭️ ${room.me.name} ends the turn early.`);
  };

  const reset = () => {
    awardedRef.current = false;
    write({
      phase: 'lobby', words: [], key: [], revealed: [], clueGiver: null,
      clue: null, guessesLeft: 0, turn: 1, result: null, loseReason: '', log: [],
    });
  };

  return (
    <div className="gk-root mx-auto max-w-2xl">
      <div className="mb-4 text-center">
        <SectionTitle eyebrow="Case file № 68 — Word & Code Duels" title="Codenames Duet" />
        <p className="mt-1 text-sm text-[var(--ink-dim)]">
          Co-op: find all {DUET_AGENTS} agents, dodge {DUET_ASSASSINS} assassins. Clue-giver
          alternates each turn — {DUET_MAX_TURNS} turns before the trail goes cold.
        </p>
      </div>

      {phase === 'lobby' && (
        <ManilaFolder className="p-6 text-center">
          <div className="type-heading text-xl">The Informant Network</div>
          <p className="mt-2 text-sm text-[var(--ink-dim)]">
            The clue-giver sees every card&rsquo;s identity and gives a one-word clue + a number.
            The guesser uncovers cards. Wrong card ends the turn — an assassin ends the case.
          </p>
          {!room.peer && (
            <p className="mt-2 text-xs text-[var(--ink-faint)]">
              Solo practice — you play both the informant and the detective.
            </p>
          )}
          <GameButton variant="primary" onClick={startBoard} className="mt-5">
            🗂 Assemble the board
          </GameButton>
        </ManilaFolder>
      )}

      {phase === 'play' && (
        <GlassCard className="p-6">
          <ScoreHUD
            leftLabel="🕵️ Agents"
            leftValue={found}
            leftSub={`of ${DUET_AGENTS}`}
            rightLabel="Turn"
            rightValue={turn}
            rightSub={`of ${maxTurns}`}
            record="none"
          />
          <div className="mt-2">
            <TurnBanner
              isYourTurn={iAmGiver}
              yourText="💡 You give the clue"
              theirText={`🎯 ${playerName(room, clueGiver)} clues — you guess`}
            />
          </div>

          {/* clue banner */}
          <div className="mt-3 text-center">
            {clue ? (
              <div className="inline-block rounded-lg border border-[var(--brass)] bg-[rgba(232,163,61,0.1)] px-5 py-2">
                <span className="font-type text-xl tracking-[0.15em] text-[var(--amber-glow)]">
                  {clue.word}
                </span>
                <span className="ml-3 font-type text-lg text-[var(--ink-dim)]">{clue.count}</span>
                {!iAmGiver && (
                  <span className="ml-3 text-xs text-[var(--ink-dim)]">{guessesLeft} guesses left</span>
                )}
              </div>
            ) : (
              <div className="text-sm text-[var(--ink-dim)]">
                {iAmGiver ? 'Give a one-word clue below.' : `Waiting for ${playerName(room, clueGiver)}'s clue…`}
              </div>
            )}
          </div>

          {/* board */}
          <div className="mt-4 grid grid-cols-5 gap-1.5">
            {words.map((w, i) => {
              const isOut = revealed[i];
              const kind = key[i];
              const showKey = iAmGiver && !isOut;
              return (
                <motion.div
                  key={i}
                  whileTap={!iAmGiver && !isOut && clue ? { scale: 0.92 } : undefined}
                >
                  <button
                    disabled={iAmGiver || isOut || !clue || guessesLeft <= 0}
                    onClick={() => guessCard(i)}
                    title={showKey ? kind : undefined}
                    className={
                      'flex aspect-square w-full items-center justify-center rounded-md border p-1 text-center font-type text-[0.68rem] leading-tight transition sm:text-xs ' +
                      (isOut
                        ? CARD_STYLE[kind].revealed
                        : 'border-[var(--glass-border)] bg-[rgba(255,255,255,0.04)] text-[var(--ink)] hover:border-[var(--brass)] ') +
                      (showKey ? CARD_STYLE[kind].hint : '')
                    }
                  >
                    {isOut && kind === 'assassin' ? '💀' : ''}
                    {isOut && kind === 'agent' ? '✅ ' : ''}
                    {w}
                  </button>
                </motion.div>
              );
            })}
          </div>

          {/* clue controls */}
          {iAmGiver && !clue && (
            <div className="mt-4">
              <div className="flex justify-center gap-2">
                <input
                  value={clueWord}
                  onChange={(e) => setClueWord(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && giveClue()}
                  placeholder="ONE WORD"
                  className="noir-input w-44 text-center font-type tracking-[0.15em]"
                />
                <input
                  value={clueCount}
                  onChange={(e) => setClueCount(e.target.value.replace(/\D/g, '').slice(0, 1))}
                  placeholder="#"
                  inputMode="numeric"
                  className="noir-input w-14 text-center font-type"
                />
                <GameButton variant="primary" onClick={giveClue}>
                  💡 Give clue
                </GameButton>
              </div>
              {clueError && <div className="mt-1 text-center text-xs text-[var(--blood)]">{clueError}</div>}
              <div className="mt-1 text-center text-xs text-[var(--ink-faint)]">
                Ringed cards show you the answers — the guesser can&rsquo;t see them.
              </div>
            </div>
          )}
          {!iAmGiver && clue && guessesLeft > 0 && (
            <div className="mt-3 text-center">
              <GameButton variant="ghost" size="sm" onClick={passTurn}>
                ⏭ End turn early
              </GameButton>
            </div>
          )}

          <div className="paper-strip mt-4 max-h-28 overflow-y-auto">
            <div className="eyebrow mb-1">Case log</div>
            {log.slice(-5).map((line, i) => (
              <div key={i} className="text-xs">{line}</div>
            ))}
          </div>
        </GlassCard>
      )}

      {phase === 'over' && (
        <div className="gk-modal-scope">
          <ManilaFolder className="p-6 text-center">
            {result === 'lose' && <p className="mt-2 text-sm text-[var(--ink-dim)]">{loseReason}</p>}
            <div className="mt-3 text-sm text-[var(--ink-dim)]">
              Agents found: {found} / {DUET_AGENTS} · turns used: {Math.min(turn, maxTurns)} / {maxTurns}
            </div>
          </ManilaFolder>
          <ResultModal
            open
            eyebrow="Operation over"
            headline={result === 'win' ? 'All agents safe' : 'Case blown'}
            stat={`Agents ${found}/${DUET_AGENTS} · Turns ${Math.min(turn, maxTurns)}/${maxTurns}`}
            tone={result === 'win' ? 'win' : 'lose'}
            primaryLabel="🔁 New operation"
            onPrimary={reset}
          />
        </div>
      )}
    </div>
  );
}
