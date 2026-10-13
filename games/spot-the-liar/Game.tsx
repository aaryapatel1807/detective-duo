'use client';

/* Spot the Liar — versus, 3 rounds.
 * Each round one detective (the liar) writes 3 statements about a prompt card —
 * 2 true, 1 false. The lie index stays LOCAL to the liar's tab (secret).
 * The interrogator cross-examines via the local ChatBox, then calls the lie
 * with room.send('stl-call'); the liar's tab judges and publishes the verdict.
 * Shared: phase, round, liarId, promptId, statements, scores, lastVerdict, winner.
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameProps } from '../types';
import type { SpotTheLiarShared } from './types';
import { drawPrompt, getPromptCard } from './content';
import { TOTAL_ROUNDS, isLastRound, matchWinner, scoreForVerdict, validStatements } from './logic';
import ChatBox from './ChatBox';
import { awardXP, syncXpToRoom, XP_AWARDS } from '../../lib/xp';
import { sounds } from '../../lib/sound';
import { GlassCard } from '../../components/GlassCard';
import '../ui-kit/kit.css';
import '../ui-kit/realism.css';
import './spot-the-liar.css';
import { GameButton, ScoreHUD, ResultModal, SectionTitle } from '../ui-kit';

export default function SpotTheLiarGame({ room }: GameProps) {
  const gs: SpotTheLiarShared = room.shared?.games?.['spot-the-liar'] ?? {};
  const phase = gs.phase ?? 'lobby';
  const round = gs.round ?? 0;
  const liarId = gs.liarId ?? null;
  const promptId = gs.promptId ?? null;
  const usedPrompts = gs.usedPrompts ?? [];
  const statements = gs.statements ?? [];
  const scores = gs.scores ?? {};
  const lastVerdict = gs.lastVerdict ?? null;
  const winner = gs.winner ?? null;

  const isLiar = liarId === room.me.id;
  const isInterrogator = liarId !== null && !isLiar;
  const peerId = room.peer?.id ?? null;
  const prompt = promptId ? getPromptCard(promptId) : undefined;

  const [drafts, setDrafts] = useState<string[]>(['', '', '']);
  const [lieIndex, setLieIndex] = useState<number>(0); // LOCAL secret
  const [callIndex, setCallIndex] = useState<number | null>(null);
  const awardedRef = useRef(false);

  const patch = (p: Partial<SpotTheLiarShared>) => room.setShared({ games: { 'spot-the-liar': p } });

  // The liar's tab judges every call against the local secret lie index.
  useEffect(() => {
    const unsub = room.onAction('stl-call', (payload: any) => {
      if (!isLiar || phase !== 'interrogation') return;
      const calledIndex = payload.index as number;
      const correct = calledIndex === lieIndex;
      sounds.stampThud();
      const nextScores = scoreForVerdict(scores, payload.from, room.me.id, correct);
      patch({
        phase: 'called',
        lastVerdict: { round, calledIndex, lieIndex, correct },
        scores: nextScores,
      });
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLiar, phase, lieIndex, scores, round]);

  // Winner XP once.
  useEffect(() => {
    if (phase === 'over' && winner === room.me.id && !awardedRef.current) {
      awardedRef.current = true;
      awardXP(XP_AWARDS.duoWin);
      syncXpToRoom(room.setShared, room.me.id, room.me.name);
      sounds.xpTick();
    }
  }, [phase, winner, room]);

  const startMatch = () => {
    const card = drawPrompt([]);
    sounds.paperShuffle();
    setDrafts(['', '', '']);
    setLieIndex(0);
    setCallIndex(null);
    patch({
      phase: 'writing',
      round: 1,
      liarId: room.me.id,
      promptId: card.id,
      usedPrompts: [card.id],
      statements: [],
      scores: {},
      lastVerdict: null,
      winner: null,
    });
  };

  const submitStatements = () => {
    if (!validStatements(drafts)) return;
    sounds.stampThud();
    patch({ statements: drafts.map((d) => d.trim()), phase: 'interrogation' });
  };

  const callTheLie = (index: number) => {
    sounds.stampThud();
    setCallIndex(index);
    room.send('stl-call', { index, from: room.me.id });
  };

  const nextRound = () => {
    const card = drawPrompt(usedPrompts);
    sounds.paperShuffle();
    setDrafts(['', '', '']);
    setLieIndex(0);
    setCallIndex(null);
    if (isLastRound(round)) {
      const w = matchWinner(scores);
      patch({ phase: 'over', winner: w });
    } else {
      patch({
        phase: 'writing',
        round: round + 1,
        liarId: peerId,
        promptId: card.id,
        usedPrompts: [...usedPrompts, card.id],
        statements: [],
        lastVerdict: null,
      });
    }
  };

  const reset = () => {
    awardedRef.current = false;
    setDrafts(['', '', '']);
    setCallIndex(null);
    patch({ phase: 'lobby', round: 0, liarId: null, promptId: null, statements: [], scores: {}, lastVerdict: null, winner: null });
  };

  const scoreLine = (id: string) =>
    `${id === room.me.id ? 'You' : room.peer?.name ?? 'Partner'}: ${scores[id] ?? 0}`;

  return (
    <div className="gk-root mx-auto max-w-2xl">
      <div className="mb-5 text-center">
        <SectionTitle eyebrow={`Interrogation · ${TOTAL_ROUNDS} rounds`} title="Spot the Liar" />
        {round > 0 && phase !== 'over' && (
          <div className="mx-auto mt-3 max-w-sm">
            <ScoreHUD
              leftLabel="YOU"
              leftValue={scores[room.me.id] ?? 0}
              leftSub={isLiar ? 'liar' : 'interrogator'}
              rightLabel={peerId ? (room.peer?.name ?? 'PARTNER').toUpperCase().slice(0, 12) : 'DESK'}
              rightValue={peerId ? (scores[peerId] ?? 0) : 0}
              rightSub={isLiar ? 'interrogator' : 'liar'}
              record="none"
            />
          </div>
        )}
      </div>

      {/* ---- lobby ---- */}
      {phase === 'lobby' && (
        <GlassCard className="p-8 text-center">
          <p className="mx-auto max-w-md text-sm text-[var(--ink-dim)]">
            Each round, one detective draws a prompt card and writes <b>3 statements — 2 true, 1 lie</b>.
            The other cross-examines over the wire, then calls the lie. Correct call scores for the
            interrogator; a miss scores for the liar. Best of {TOTAL_ROUNDS} rounds takes the case.
          </p>
          <GameButton variant="primary" onClick={startMatch} className="mt-6" disabled={!peerId}>
            🎲 Draw a prompt & start
          </GameButton>
          {!peerId && (
            <p className="mt-3 text-xs italic text-[var(--ink-faint)]">Waiting for your partner to join…</p>
          )}
        </GlassCard>
      )}

      {/* ---- writing ---- */}
      {phase === 'writing' && (
        <div className="space-y-4">
          <div className="manila-folder relative p-6 text-center">
            <div className="brass-pin absolute -top-2 left-6" />
            <div className="eyebrow">Prompt card</div>
            <div className="type-heading mt-1 text-xl">{prompt?.prompt ?? '…'}</div>
            <p className="mt-1 text-xs italic text-[var(--ink-dim)]">{prompt?.hint}</p>
          </div>
          {isLiar ? (
            <GlassCard className="p-6">
              <div className="type-heading mb-3 text-center text-lg">Write 2 truths & 1 lie</div>
              {drafts.map((d, i) => (
                <div key={i} className="mb-3 flex items-start gap-2">
                  <span className="type-heading mt-2 text-lg text-[var(--amber-glow)]">{i + 1}</span>
                  <input
                    value={d}
                    onChange={(e) => setDrafts((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
                    placeholder={`Statement ${i + 1}…`}
                    className="noir-input flex-1"
                    maxLength={280}
                  />
                  <button
                    onClick={() => setLieIndex(i)}
                    title="Mark as the lie"
                    className={`mt-1 rounded-full border px-3 py-1.5 text-xs ${lieIndex === i ? 'border-[var(--blood-bright)] bg-[rgba(211,58,44,0.2)] text-[var(--blood-bright)]' : 'border-[var(--glass-border)] text-[var(--ink-faint)]'}`}
                  >
                    {lieIndex === i ? '🤥 THE LIE' : 'lie?'}
                  </button>
                </div>
              ))}
              <GameButton variant="primary" onClick={submitStatements} className="mt-2 w-full" disabled={!validStatements(drafts)}>
                📨 Submit to the interrogator
              </GameButton>
            </GlassCard>
          ) : (
            <GlassCard className="p-8 text-center">
              <div className="type-heading text-lg">The liar is writing…</div>
              <p className="mt-2 text-sm text-[var(--ink-dim)]">Sharpen your questions, interrogator.</p>
            </GlassCard>
          )}
        </div>
      )}

      {/* ---- interrogation ---- */}
      {phase === 'interrogation' && (
        <div className="space-y-4">
          <div className="gk-felt stl-table">
            <div className="eyebrow mb-3 text-center !text-[#f5edd8]">The statements · prompt: {prompt?.prompt}</div>
            <ol className="space-y-4">
              {statements.map((s, i) => (
                <li key={i} className="stl-card">
                  <span className="stl-card__index" aria-hidden>
                    {i + 1}
                    <small>♠</small>
                  </span>
                  <span className="stl-card__text">“{s}”</span>
                  {callIndex === i && (
                    <span className="stl-verdict">The call</span>
                  )}
                </li>
              ))}
            </ol>
          </div>

          <ChatBox room={room} label="Cross-examination wire" />

          {isInterrogator && (
            <GlassCard className="p-5 text-center">
              <div className="type-heading mb-3 text-lg">Call the lie, interrogator</div>
              <div className="flex flex-wrap justify-center gap-3">
                {[0, 1, 2].map((i) => (
                  <GameButton
                    key={i}
                    variant={callIndex === i ? 'danger' : 'primary'}
                    onClick={() => callIndex === i ? callTheLie(i) : setCallIndex(i)}
                    className="stl-call"
                  >
                    {callIndex === i ? '⚖️ Confirm: #' + (i + 1) + ' is the lie' : 'Statement #' + (i + 1)}
                  </GameButton>
                ))}
              </div>
              <p className="mt-2 text-xs text-[var(--ink-faint)]">Tap twice to lock in your call. No take-backs.</p>
            </GlassCard>
          )}
          {isLiar && (
            <p className="text-center text-xs italic text-[var(--ink-faint)]">
              Sweat it out, liar. The call is coming.
            </p>
          )}
        </div>
      )}

      {/* ---- verdict ---- */}
      {phase === 'called' && lastVerdict && (
        <div className="gk-modal-scope">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard className="p-6 text-center">
              <div className="flex justify-center">
                <span className={`stl-verdict stl-verdict--inline ${lastVerdict.correct ? 'stl-verdict--vindicated' : ''}`}>
                  {lastVerdict.correct ? 'Lie exposed' : 'The liar walks'}
                </span>
              </div>
              <p className="mt-3 text-sm text-[var(--ink-dim)]">
                The lie was statement <b className="text-[var(--blood-bright)]">#{lastVerdict.lieIndex + 1}</b>:
                “{statements[lastVerdict.lieIndex]}”
              </p>
              <p className="mt-2 text-sm">
                {lastVerdict.correct ? 'Point to the interrogator.' : 'Point to the liar.'}
                {' · '} {scoreLine(room.me.id)} — {peerId ? scoreLine(peerId) : ''}
              </p>
              <div className="mt-5">
                <GameButton variant="primary" onClick={nextRound}>
                  {isLastRound(round) ? '🏁 Final verdict' : '➡️ Next round'}
                </GameButton>
              </div>
            </GlassCard>
          </motion.div>
          <ResultModal
            open
            eyebrow={`Round ${round} verdict`}
            headline={lastVerdict.correct ? 'LIE EXPOSED!' : 'THE LIAR WALKS FREE'}
            stat={`The lie was statement #${lastVerdict.lieIndex + 1}`}
            tone={lastVerdict.correct ? 'win' : 'lose'}
            primaryLabel={isLastRound(round) ? '🏁 Final verdict' : '➡️ Next round'}
            onPrimary={nextRound}
          />
        </div>
      )}

      {/* ---- match over ---- */}
      {phase === 'over' && (
        <div className="gk-modal-scope">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard className="p-8 text-center">
              <div className="wax-seal mx-auto mb-3" />
              <div className="type-heading text-xl text-[var(--amber-glow)]">📁 CASE CLOSED</div>
              <p className="mt-2 text-sm text-[var(--ink-dim)]">
                {scoreLine(room.me.id)} — {peerId ? scoreLine(peerId) : ''}
              </p>
              <p className="mt-3 text-lg">
                Winner: <b className="text-[var(--amber-glow)]">
                  {winner === null ? 'A perfect tie — suspicious.' : winner === room.me.id ? 'YOU, sharp-eyed sleuth' : room.peer?.name ?? 'Partner'}
                </b>
                {' · '} +{XP_AWARDS.duoWin} XP
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <GameButton variant="primary" onClick={startMatch}>🔄 Rematch</GameButton>
                <GameButton variant="ghost" onClick={reset}>Lobby</GameButton>
              </div>
            </GlassCard>
          </motion.div>
          <ResultModal
            open
            eyebrow="Case closed"
            headline={winner === null ? 'A perfect tie' : winner === room.me.id ? 'YOU, sharp-eyed sleuth' : `${room.peer?.name ?? 'Partner'} wins`}
            stat={`${scoreLine(room.me.id)} — ${peerId ? scoreLine(peerId) : ''}`}
            tone={winner === null ? 'draw' : winner === room.me.id ? 'win' : 'lose'}
            primaryLabel="🔄 Rematch"
            onPrimary={startMatch}
            secondaryLabel="Lobby"
            onSecondary={reset}
          />
        </div>
      )}
    </div>
  );
}
