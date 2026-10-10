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
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 text-center">
        <div className="eyebrow">Interrogation · {TOTAL_ROUNDS} rounds</div>
        <h2 className="type-heading mt-1 text-2xl">Spot the Liar</h2>
        {round > 0 && phase !== 'over' && (
          <div className="mt-2 text-xs text-[var(--ink-dim)]">
            Round <b className="text-[var(--amber-glow)]">{round}/{TOTAL_ROUNDS}</b>
            {' · '} {scoreLine(room.me.id)} — {peerId ? scoreLine(peerId) : 'Desk: 0'}
            {' · '} Liar: <b>{isLiar ? 'YOU' : room.peer?.name ?? '—'}</b>
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
          <button onClick={startMatch} className="noir-btn mt-6" disabled={!peerId}>
            🎲 Draw a prompt & start
          </button>
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
              <button onClick={submitStatements} className="noir-btn mt-2 w-full" disabled={!validStatements(drafts)}>
                📨 Submit to the interrogator
              </button>
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
          <div className="manila-folder relative p-6">
            <div className="brass-pin absolute -top-2 left-6" />
            <div className="eyebrow">The statements · prompt: {prompt?.prompt}</div>
            <ol className="mt-3 space-y-2">
              {statements.map((s, i) => (
                <li key={i} className="flex items-start gap-3 rounded-xl border border-[var(--glass-border)] bg-[rgba(0,0,0,0.2)] p-3">
                  <span className="type-heading text-lg text-[var(--amber-glow)]">{i + 1}</span>
                  <span className="text-sm">{s}</span>
                </li>
              ))}
            </ol>
          </div>

          <ChatBox room={room} label="Cross-examination wire" />

          {isInterrogator && (
            <GlassCard className="p-5 text-center">
              <div className="type-heading mb-3 text-lg">Call the lie, interrogator</div>
              <div className="flex justify-center gap-3">
                {[0, 1, 2].map((i) => (
                  <button
                    key={i}
                    onClick={() => callIndex === i ? callTheLie(i) : setCallIndex(i)}
                    className={`noir-btn ${callIndex === i ? '!border-[var(--blood-bright)]' : ''}`}
                  >
                    {callIndex === i ? '⚖️ Confirm: #' + (i + 1) + ' is the lie' : 'Statement #' + (i + 1)}
                  </button>
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
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className="p-6 text-center">
            <div className="wax-seal mx-auto mb-3" />
            <div className="type-heading text-xl text-[var(--amber-glow)]">
              {lastVerdict.correct ? '🎯 LIE EXPOSED!' : '😈 THE LIAR WALKS FREE'}
            </div>
            <p className="mt-3 text-sm text-[var(--ink-dim)]">
              The lie was statement <b className="text-[var(--blood-bright)]">#{lastVerdict.lieIndex + 1}</b>:
              “{statements[lastVerdict.lieIndex]}”
            </p>
            <p className="mt-2 text-sm">
              {lastVerdict.correct ? 'Point to the interrogator.' : 'Point to the liar.'}
              {' · '} {scoreLine(room.me.id)} — {peerId ? scoreLine(peerId) : ''}
            </p>
            <button onClick={nextRound} className="noir-btn mt-5">
              {isLastRound(round) ? '🏁 Final verdict' : '➡️ Next round'}
            </button>
          </GlassCard>
        </motion.div>
      )}

      {/* ---- match over ---- */}
      {phase === 'over' && (
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
            <div className="mt-5 flex justify-center gap-3">
              <button onClick={startMatch} className="noir-btn">🔄 Rematch</button>
              <button onClick={reset} className="noir-btn-ghost">Lobby</button>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}
