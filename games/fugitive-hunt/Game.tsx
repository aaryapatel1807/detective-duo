'use client';

/* Fugitive Hunt — 8x8 city grid chase.
 * Hider picks a secret node; the seeker gets 10 searches, each returning a
 * distance band + direction arrow. The hider slips one node after the 3rd,
 * 6th and 9th search. Best of 3 rounds, roles swap each round.
 */

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import '../ui-kit/kit.css';
import '../ui-kit/realism.css';
import './fugitive-hunt.css';
import {
  GameButton,
  ScoreHUD,
  TurnBanner,
  ResultModal,
  ProgressBar,
  SectionTitle,
} from '../ui-kit';
import type { GameProps } from '../types';
import type { FugitiveShared, HuntClue } from './types';
import { GRID, MAX_TURNS, adjacent, clueFor, hiderMovesAfter } from './logic';
import { awardXP, syncXpToRoom, XP_AWARDS } from '../../lib/xp';
import { sounds } from '../../lib/sound';

const ROUNDS = 3;

const BAND_CLASS: Record<string, string> = {
  Burning: 'fh-block--burning',
  Hot: 'fh-block--hot',
  Warm: 'fh-block--warm',
  Cold: 'fh-block--cold',
};

export default function FugitiveHuntGame({ room }: GameProps) {
  const gs: FugitiveShared = room.shared?.games?.['fugitive-hunt'] ?? {};
  const phase = gs.phase ?? 'lobby';
  const round = gs.round ?? 1;
  const hider = gs.hider ?? null;
  const seeker = gs.seeker ?? null;
  const hideNode = gs.hideNode ?? null;
  const turnsUsed = gs.turnsUsed ?? 0;
  const clues: HuntClue[] = gs.clues ?? [];
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

  const nameOf = (pid: string | null): string =>
    pid === null ? '—' : pid === me ? room.me.name : (peer?.name ?? 'Partner');

  const set = (patch: Partial<FugitiveShared>) =>
    room.setShared({ games: { 'fugitive-hunt': patch } });

  const startMatch = () => {
    if (!peer) return;
    const [a, b] = me < peer.id ? [me, peer.id] : [peer.id, me];
    sounds.paperShuffle();
    set({
      phase: 'hide',
      round: 1,
      hider: a,
      seeker: b,
      hideNode: null,
      turnsUsed: 0,
      clues: [],
      scores: {},
      roundWinner: null,
      matchWinner: null,
    });
  };

  const finishRound = (winner: string) => {
    const ns = { ...scores, [winner]: (scores[winner] ?? 0) + 1 };
    const ids = [me, peer?.id ?? ''];
    const mw =
      round >= ROUNDS
        ? ns[ids[0]] === ns[ids[1]]
          ? null
          : ns[ids[0]] > ns[ids[1]]
            ? ids[0]
            : ids[1]
        : null;
    sounds.stampThud();
    set({ roundWinner: winner, scores: ns, matchWinner: mw, phase: 'over' });
  };

  const hideAt = (node: number) => {
    if (phase !== 'hide' || me !== hider) return;
    sounds.pinTap();
    set({ hideNode: node, phase: 'seek' });
  };

  const searchAt = (node: number) => {
    if (phase !== 'seek' || me !== seeker || hideNode === null) return;
    if (clues.some((c) => c.node === node)) return;
    const c = clueFor(node, hideNode);
    sounds.typewriterClick();
    if (c.found) {
      finishRound(me);
      return;
    }
    const nt = turnsUsed + 1;
    const next = [...clues, { node, band: c.band, dir: c.dir, turn: nt }];
    if (nt >= MAX_TURNS) {
      finishRound(hider ?? '');
      return;
    }
    set({ turnsUsed: nt, clues: next, phase: hiderMovesAfter(nt) ? 'move' : 'seek' });
  };

  const moveTo = (node: number) => {
    if (phase !== 'move' || me !== hider || hideNode === null) return;
    if (!adjacent(hideNode).includes(node)) return;
    sounds.pinTap();
    set({ hideNode: node, phase: 'seek' });
  };

  const onCell = (node: number) => {
    if (phase === 'hide') hideAt(node);
    else if (phase === 'seek') searchAt(node);
    else if (phase === 'move') moveTo(node);
  };

  const nextRound = () => {
    sounds.paperShuffle();
    set({
      phase: 'hide',
      round: round + 1,
      hider: seeker,
      seeker: hider,
      hideNode: null,
      turnsUsed: 0,
      clues: [],
      roundWinner: null,
    });
  };

  const clueByNode = new Map(clues.map((c) => [c.node, c]));
  const moveTargets = phase === 'move' && me === hider && hideNode !== null ? adjacent(hideNode) : [];
  const myTurn =
    (phase === 'hide' && me === hider) ||
    (phase === 'seek' && me === seeker) ||
    (phase === 'move' && me === hider);

  const turnTexts = (): { your: string; their: string } => {
    if (phase === 'hide') return { your: 'Pick your hideout', their: `${nameOf(hider)} is hiding…` };
    if (phase === 'move') return { your: 'Slip away — adjacent block', their: 'The fugitive slips away…' };
    return { your: `Search the grid — ${MAX_TURNS - turnsUsed} left`, their: `${nameOf(seeker)} is searching…` };
  };

  const inPlay = phase === 'hide' || phase === 'seek' || phase === 'move';

  return (
    <div className="gk-root space-y-4">
      <SectionTitle
        eyebrow={`ROUND ${round} OF ${ROUNDS} · ${MAX_TURNS} SEARCHES`}
        title="🏃 Fugitive Hunt"
      />
      <ScoreHUD
        leftLabel="YOU"
        leftValue={scores[me] ?? 0}
        rightLabel="OPPONENT"
        rightValue={scores[peer?.id ?? ''] ?? 0}
      />

      {!peer && (
        <div className="glass-card p-4 text-sm">
          ⏳ Waiting for your partner to join the room… (code{' '}
          <span className="font-bold">{room.roomCode ?? '—'}</span>)
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[1fr_240px]">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card gk-modal-scope p-4"
        >
          {phase === 'lobby' ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <p className="text-sm opacity-70">
                The city sleeps. One of you will vanish into it.
              </p>
              <GameButton onClick={startMatch} disabled={!peer}>
                📁 Open the case
              </GameButton>
            </div>
          ) : (
            <>
              {phase === 'over' ? (
                <p className="mb-3 text-center text-sm opacity-80">
                  {endLine(roundWinner, matchWinner, nameOf, round, ROUNDS)}
                </p>
              ) : (
                <TurnBanner
                  isYourTurn={myTurn}
                  yourText={turnTexts().your}
                  theirText={turnTexts().their}
                />
              )}
              <div className="fh-map">
                <div className="fh-map__title">🗺️ City grid — round {round}</div>
                <div
                  className="grid gap-1.5"
                  style={{ gridTemplateColumns: `repeat(${GRID}, minmax(0, 1fr))` }}
                >
                  {Array.from({ length: GRID * GRID }, (_, node) => {
                    const clue = clueByNode.get(node);
                    const isHide = me === hider && hideNode === node;
                    const isTarget = moveTargets.includes(node);
                    const clickable = myTurn && !clue && (phase !== 'move' || isTarget);
                    const cls = [
                      'fh-block',
                      clue ? `fh-block--searched ${BAND_CLASS[clue.band] ?? ''}` : '',
                      isHide ? 'fh-block--hideout' : '',
                      isTarget ? 'fh-block--target' : '',
                    ].join(' ');
                    return (
                      <button
                        key={node}
                        onClick={() => onCell(node)}
                        disabled={!clickable}
                        className={cls}
                        title={clue ? `${clue.band} ${clue.dir}` : undefined}
                        aria-label={clue ? `Station ${node + 1} searched: ${clue.band} ${clue.dir}` : `Station ${node + 1}`}
                      >
                        {clue ? (
                          <span className="fh-block__dir" aria-hidden>{clue.dir}</span>
                        ) : isHide ? (
                          <span className="fh-block__dir" aria-hidden>🕵️</span>
                        ) : (
                          <span className="fh-block__num" aria-hidden>{node + 1}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              {(phase === 'seek' || phase === 'move') && (
                <div className="mt-3">
                  <ProgressBar label="SEARCHES USED" value={turnsUsed} max={MAX_TURNS} />
                </div>
              )}
            </>
          )}
          <ResultModal
            open={phase === 'over'}
            eyebrow={matchWinner ? 'MANHUNT DECIDED' : `ROUND ${round} DECIDED`}
            headline={
              matchWinner === me ? 'Fugitive caught' :
              matchWinner ? 'The one that got away' :
              `${nameOf(roundWinner)} takes round ${round}`
            }
            tone={matchWinner === me ? 'win' : matchWinner ? 'lose' : roundWinner === me ? 'win' : 'lose'}
            stat={`YOU ${scores[me] ?? 0} — ${scores[peer?.id ?? ''] ?? 0} OPPONENT`}
            primaryLabel={matchWinner ? '🔁 New manhunt' : '➡️ Next round'}
            onPrimary={matchWinner ? startMatch : nextRound}
          />
        </motion.div>

        <div className="fh-log">
          <h3 className="fh-log__title">
            📋 Search log
          </h3>
          {clues.length === 0 ? (
            <p className="text-xs text-[#8a8474]">
              No searches yet.
            </p>
          ) : (
            <ul className="text-xs">
              {[...clues].reverse().map((c) => (
                <li key={c.turn} className="fh-log__row">
                  <span className="text-[#8a8474]">#{c.turn}</span>
                  <span className="font-bold">{c.band}</span>
                  <span>{c.dir}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 border-t border-[#d8d2c0] pt-2 text-xs text-[#6b6355]">
            <p>🔴 Burning ≤ 2 blocks</p>
            <p>🟠 Hot ≤ 4 · 🟡 Warm ≤ 6</p>
            <p>🔵 Cold = far away</p>
            <p className="mt-1">Hider slips 1 block after searches 3, 6, 9.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function endLine(
  roundWinner: string | null,
  matchWinner: string | null,
  nameOf: (pid: string | null) => string,
  round: number,
  rounds: number,
): string {
  if (matchWinner) return `Case closed — ${nameOf(matchWinner)} takes the manhunt. 🏆`;
  if (round === rounds) return 'Final round decided.';
  return `${nameOf(roundWinner)} takes round ${round}.`;
}
