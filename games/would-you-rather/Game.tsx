'use client';

/* Would You Rather — co-op mind-meld.
 * Both detectives vote in secret; the pair reveals simultaneously once both
 * votes are in. Matching minds earn XP for both and seal a co-op win.
 */

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import '../ui-kit/kit.css';
import {
  GameButton,
  ScoreHUD,
  ResultModal,
  GameCard,
  SectionTitle,
} from '../ui-kit';
import type { GameProps } from '../types';
import type { WYRShared } from './types';
import { MATCH_XP, MISMATCH_XP, buildDeck, deckSize, isMatch } from './logic';
import { awardXP, syncXpToRoom } from '../../lib/xp';
import { recordCoopWin } from '../../lib/lovenotes';
import { sounds } from '../../lib/sound';

export default function WouldYouRatherGame({ room }: GameProps) {
  const gs: WYRShared = room.shared?.games?.['would-you-rather'] ?? {};
  const phase = gs.phase ?? 'lobby';
  const deck = gs.deck ?? [];
  const idx = gs.idx ?? 0;
  const votes = gs.votes ?? {};
  const matches = gs.matches ?? 0;
  const rounds = gs.rounds ?? 0;
  const me = room.me.id;
  const peer = room.peer;
  const awardedIdx = useRef(new Set<number>());

  const pair = deck[idx] ?? null;
  const myVote = votes[me];
  const bothIn = peer !== null && votes[me] !== undefined && votes[peer.id] !== undefined;
  const matched = isMatch(votes);
  const deckDone = deck.length > 0 && idx >= deck.length;

  const set = (patch: Partial<WYRShared>) =>
    room.setShared({ games: { 'would-you-rather': patch } });

  // Reveal once both votes land (either client may flip the phase).
  useEffect(() => {
    if (phase === 'voting' && bothIn) {
      sounds.stampThud();
      set({ phase: 'reveal' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, bothIn]);

  // Each detective awards themselves once per revealed round.
  useEffect(() => {
    if (phase === 'reveal' && !awardedIdx.current.has(idx)) {
      awardedIdx.current.add(idx);
      awardXP(matched ? MATCH_XP : MISMATCH_XP);
      if (matched) recordCoopWin();
      syncXpToRoom(room.setShared, me, room.me.name);
      sounds.xpTick();
    }
  }, [phase, idx, matched, me, room]);

  const nameOf = (pid: string): string => (pid === me ? room.me.name : (peer?.name ?? 'Partner'));

  const startDeck = () => {
    if (!peer) return;
    sounds.paperShuffle();
    set({
      phase: 'voting', deck: buildDeck(deckSize()), idx: 0,
      votes: {}, matches: 0, rounds: 0,
    });
  };

  const vote = (i: number) => {
    if (phase !== 'voting' || myVote !== undefined || !pair) return;
    sounds.pinTap();
    set({ votes: { [me]: i } });
  };

  const next = () => {
    sounds.paperShuffle();
    set({
      phase: 'voting', idx: idx + 1, votes: {},
      matches: matches + (matched ? 1 : 0),
      rounds: rounds + 1,
    });
  };

  return (
    <div className="gk-root space-y-4">
      <SectionTitle
        eyebrow={pair && !deckDone ? `QUESTION ${idx + 1} — VOTE IN SECRET` : 'TWO ENVELOPES · ONE SHARED MIND'}
        title="⚖️ Would You Rather"
      />
      <ScoreHUD
        leftLabel="MINDS MATCHED"
        leftValue={matches}
        rightLabel="QUESTIONS ASKED"
        rightValue={rounds}
      />

      {!peer && (
        <div className="glass-card p-4 text-sm">
          ⏳ Waiting for your partner… (code <span className="font-bold">{room.roomCode ?? '—'}</span>)
        </div>
      )}

      <div className="mx-auto max-w-xl">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card gk-modal-scope p-6">
          {deck.length === 0 && !deckDone && (
            <div className="flex flex-col items-center gap-3 py-8">
              <p className="text-center text-sm opacity-70">
                Two sealed envelopes. One shared mind. Vote without peeking.
              </p>
              <GameButton onClick={startDeck} disabled={!peer}>
                ⚖️ Open the envelopes
              </GameButton>
            </div>
          )}

          {!deckDone && pair && phase === 'voting' && (
            <div className="flex flex-col gap-3">
              {([0, 1] as const).map((i) => {
                const chosen = myVote === i;
                return (
                  <GameCard
                    key={i}
                    onClick={() => vote(i)}
                    disabled={myVote !== undefined}
                    state={chosen ? 'active' : myVote !== undefined ? 'absent' : 'default'}
                    ariaLabel={`Vote for ${i === 0 ? 'A' : 'B'}`}
                    className="w-full"
                  >
                    <span className="text-left">
                      <span className="opacity-60">{i === 0 ? '🅰️' : '🅱️'}</span> {pair[i]}
                      {chosen && <span className="ml-2 text-sm">🔒 sealed</span>}
                    </span>
                  </GameCard>
                );
              })}
              <p className="text-center text-xs opacity-60">
                {myVote !== undefined
                  ? peer && votes[peer.id] !== undefined
                    ? 'Both votes are in…'
                    : `Vote sealed. Waiting on ${peer ? nameOf(peer.id) : 'partner'}…`
                  : 'Tap one — no take-backs.'}
              </p>
            </div>
          )}

          {!deckDone && pair && phase === 'reveal' && peer && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="text-4xl">{matched ? '💞' : '🎭'}</div>
              <div className="grid w-full gap-3 md:grid-cols-2">
                {([me, peer.id] as const).map((pid) => (
                  <GameCard key={pid} state={matched ? 'correct' : 'absent'}>
                    <span>
                      <span className="block text-xs tracking-widest opacity-60">
                        {nameOf(pid).toUpperCase()}
                      </span>
                      <span className="mt-1 block text-sm">{pair[votes[pid] ?? 0]}</span>
                    </span>
                  </GameCard>
                ))}
              </div>
              <p className="text-center text-sm">
                {matched
                  ? `Same mind — +${MATCH_XP} XP each, co-op win sealed. 💌`
                  : `Different wavelengths — +${MISMATCH_XP} XP each for honesty.`}
              </p>
              <GameButton onClick={next}>
                {idx + 1 >= deck.length ? '🏁 See results' : '➡️ Next question'}
              </GameButton>
            </motion.div>
          )}

          {deckDone && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="text-4xl">💌</div>
              <p className="text-center text-sm">
                {matches} of {rounds} minds matched — {matches >= rounds / 2 ? 'practically telepathic.' : 'the mystery deepens.'}
              </p>
            </div>
          )}

          <ResultModal
            open={deckDone}
            eyebrow="ENVELOPES SPENT"
            headline={matches >= rounds / 2 ? 'Practically telepathic' : 'The mystery deepens'}
            tone={matches >= rounds / 2 ? 'win' : 'draw'}
            stat={`${matches} OF ${rounds} MINDS MATCHED`}
            primaryLabel="🔁 New round of envelopes"
            onPrimary={startDeck}
          />
        </motion.div>
      </div>
    </div>
  );
}
