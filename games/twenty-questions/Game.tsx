'use client';

/* Twenty Questions — versus.
 * Thinker types a secret person/place/thing (LOCAL only). The guesser asks up
 * to 20 yes/no questions via room.send('20q-question'); the thinker answers
 * via the shared Q&A log. A final guess via send('20q-guess') ends it.
 * Shared: phase, thinkerId, category, questionsUsed, qa, winner.
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameProps } from '../types';
import type { TwentyQA, TwentyShared } from './types';
import {
  CATEGORIES,
  MAX_QUESTIONS,
  guessMatches,
  isOutOfQuestions,
  questionsLeft,
  validQuestion,
  validSecret,
  type Category,
} from './logic';
import { awardXP, syncXpToRoom, XP_AWARDS } from '../../lib/xp';
import { sounds } from '../../lib/sound';
import { GlassCard } from '../../components/GlassCard';
import '../ui-kit/kit.css';
import { GameButton, ProgressBar, ResultModal, SectionTitle } from '../ui-kit';

export default function TwentyQuestionsGame({ room }: GameProps) {
  const gs: TwentyShared = room.shared?.games?.['twenty-questions'] ?? {};
  const phase = gs.phase ?? 'setup';
  const thinkerId = gs.thinkerId ?? null;
  const category = gs.category ?? 'thing';
  const used = gs.questionsUsed ?? 0;
  const qa = gs.qa ?? [];
  const winner = gs.winner ?? null;
  const awarded: Record<string, boolean> = gs.awarded ?? {};

  const isThinker = thinkerId === room.me.id;
  const isGuesser = thinkerId !== null && !isThinker;

  const [secret, setSecret] = useState(''); // thinker only, local
  const [secretCategory, setSecretCategory] = useState<Category>('thing');
  const [question, setQuestion] = useState('');
  const [finalGuess, setFinalGuess] = useState('');
  const [showGuessBox, setShowGuessBox] = useState(false);
  const awardedRef = useRef(false);

  const patch = (p: Partial<TwentyShared> & Record<string, any>) =>
    room.setShared({ games: { 'twenty-questions': p } });

  // Live question pings: thinker hears them arrive.
  useEffect(() => {
    const unsub = room.onAction('20q-question', (payload: any) => {
      if (payload.from === room.me.id) return;
      sounds.pinTap();
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Thinker judges final guesses against the local secret.
  useEffect(() => {
    const unsub = room.onAction('20q-guess', (payload: any) => {
      if (!isThinker || phase !== 'play') return;
      const correct = guessMatches(payload.text, secret);
      sounds.stampThud();
      patch({
        phase: correct ? 'won' : 'play',
        winner: correct ? payload.from : null,
        qa: correct ? [...qa, { q: `🎯 Final guess: “${payload.text}”`, a: 'yes' as const }] : qa,
      });
      if (!correct) {
        room.send('20q-guess-miss', { text: payload.text });
      }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isThinker, phase, secret, qa]);

  // Guesser learns a guess missed.
  useEffect(() => {
    const unsub = room.onAction('20q-guess-miss', () => {
      sounds.typewriterClick();
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Winner XP once.
  useEffect(() => {
    const won = phase === 'won';
    const lost = phase === 'lost';
    if ((won || lost) && winner === room.me.id && !awarded[room.me.id] && !awardedRef.current) {
      awardedRef.current = true;
      awardXP(XP_AWARDS.duoWin);
      syncXpToRoom(room.setShared, room.me.id, room.me.name);
      sounds.xpTick();
      patch({ awarded: { ...awarded, [room.me.id]: true } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, winner]);

  const startAsThinker = () => {
    if (!validSecret(secret)) return;
    sounds.paperShuffle();
    patch({ phase: 'play', thinkerId: room.me.id, category: secretCategory, questionsUsed: 0, qa: [], winner: null, awarded: {} });
  };

  const joinAsGuesser = () => {
    sounds.typewriterClick();
    patch({ thinkerId: room.peer ? room.peer.id : 'unknown', phase: 'awaiting-secret' as any });
  };

  const ask = () => {
    if (!validQuestion(question) || !isGuesser || isOutOfQuestions(used)) return;
    sounds.typewriterClick();
    const q = question.trim();
    setQuestion('');
    const entry: TwentyQA = { q, a: null };
    patch({ qa: [...qa, entry], questionsUsed: used + 1 });
    room.send('20q-question', { text: q, from: room.me.id });
  };

  const answer = (index: number, a: 'yes' | 'no') => {
    sounds.pinTap();
    const next = qa.map((e, i) => (i === index ? { ...e, a } : e));
    const done = isOutOfQuestions(used) && next.every((e) => e.a !== null);
    patch({ qa: next, ...(done ? { phase: 'lost', winner: thinkerId } : {}) });
  };

  const sendGuess = () => {
    if (!validQuestion(finalGuess)) return;
    sounds.stampThud();
    room.send('20q-guess', { text: finalGuess.trim(), from: room.me.id });
    setFinalGuess('');
    setShowGuessBox(false);
  };

  const reset = () => {
    awardedRef.current = false;
    setSecret('');
    setQuestion('');
    setFinalGuess('');
    setShowGuessBox(false);
    patch({ phase: 'setup', thinkerId: null, questionsUsed: 0, qa: [], winner: null, awarded: {} });
    sounds.paperShuffle();
  };

  const left = questionsLeft(used);

  return (
    <div className="gk-root mx-auto max-w-2xl">
      <div className="mb-5 text-center">
        <SectionTitle eyebrow={`Interrogation room · ${MAX_QUESTIONS} questions max`} title="Twenty Questions" />
        {phase === 'play' && (
          <div className="mx-auto mt-3 max-w-md">
            <ProgressBar
              label="Questions used"
              value={used}
              max={MAX_QUESTIONS}
            />
            <div className="mt-2 text-xs text-[var(--ink-dim)]">
              Category: <b className="text-[var(--amber-glow)] capitalize">{category}</b>
              {' · '} Questions left: <b className={left <= 5 ? 'text-[var(--blood-bright)]' : 'text-[var(--amber-glow)]'}>{left}</b>
            </div>
          </div>
        )}
      </div>

      {/* ---- setup ---- */}
      {phase === 'setup' && (
        <GlassCard className="p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="manila-folder p-5">
              <div className="type-heading text-lg">🧠 The Thinker</div>
              <p className="mt-1 text-xs text-[var(--ink-dim)]">Type a secret person, place, or thing. Only you see it.</p>
              <div className="mt-3 flex gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSecretCategory(c)}
                    className={`rounded-full border px-3 py-1 text-xs capitalize ${secretCategory === c ? 'border-[var(--amber-glow)] text-[var(--amber-glow)]' : 'border-[var(--glass-border)]'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <input
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="e.g. the Eiffel Tower"
                className="noir-input mt-3 w-full"
                maxLength={60}
              />
              <GameButton variant="primary" onClick={startAsThinker} className="mt-3 w-full" disabled={!validSecret(secret)}>
                🔒 Lock it in
              </GameButton>
            </div>
            <div className="manila-folder p-5">
              <div className="type-heading text-lg">🔍 The Guesser</div>
              <p className="mt-1 text-xs text-[var(--ink-dim)]">
                Your partner thinks of something. You get {MAX_QUESTIONS} yes/no questions to name it.
              </p>
              <GameButton variant="primary" onClick={joinAsGuesser} className="mt-6 w-full" disabled={!room.peer}>
                I'll do the asking
              </GameButton>
              {!room.peer && (
                <p className="mt-3 text-xs italic text-[var(--ink-faint)]">Waiting for your partner…</p>
              )}
            </div>
          </div>
        </GlassCard>
      )}

      {(phase as string) === 'awaiting-secret' && (
        <GlassCard className="p-8 text-center">
          <div className="type-heading text-lg">Your partner is thinking…</div>
          <p className="mt-2 text-sm text-[var(--ink-dim)]">The secret locks in the moment they type it.</p>
        </GlassCard>
      )}

      {/* ---- play ---- */}
      {phase === 'play' && (
        <div className="space-y-4">
          {isThinker && (
            <div className="manila-folder relative p-5">
              <div className="brass-pin absolute -top-2 left-6" />
              <div className="eyebrow">Your secret (eyes only)</div>
              <div className="type-heading mt-1 text-xl">{secret || <span className="italic text-[var(--ink-faint)]">—</span>}</div>
              <p className="mt-1 text-xs text-[var(--ink-dim)]">Answer honestly, thinker. The desk is watching.</p>
            </div>
          )}

          <GlassCard className="p-5">
            <div className="eyebrow mb-3">📋 Question log</div>
            {qa.length === 0 && (
              <p className="text-sm italic text-[var(--ink-faint)]">No questions yet. The lamp is warming up…</p>
            )}
            <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
              {qa.map((entry, i) => (
                <div key={i} className="rounded-xl border border-[var(--glass-border)] bg-[rgba(232,163,61,0.05)] p-3">
                  <div className="text-sm">“{entry.q}”</div>
                  <div className="mt-2">
                    {entry.a ? (
                      <span className={`rounded-full px-3 py-0.5 text-xs font-bold tracking-widest ${entry.a === 'yes' ? 'bg-[rgba(76,175,80,0.2)] text-[#7ee787]' : 'bg-[rgba(211,58,44,0.2)] text-[var(--blood-bright)]'}`}>
                        {entry.a.toUpperCase()}
                      </span>
                    ) : isThinker ? (
                      <div className="flex gap-2">
                        <button onClick={() => answer(i, 'yes')} className="noir-btn-ghost !px-3 !py-1 !text-xs">YES</button>
                        <button onClick={() => answer(i, 'no')} className="noir-btn-ghost !px-3 !py-1 !text-xs">NO</button>
                      </div>
                    ) : (
                      <span className="text-xs italic text-[var(--ink-faint)]">awaiting the thinker…</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {isGuesser && (
            <GlassCard className="p-5">
              <div className="flex gap-2">
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && ask()}
                  placeholder="Ask a yes/no question…"
                  className="noir-input flex-1"
                  maxLength={200}
                  disabled={isOutOfQuestions(used)}
                />
                <GameButton variant="primary" onClick={ask} disabled={!validQuestion(question) || isOutOfQuestions(used)}>
                  Ask ❓
                </GameButton>
              </div>
              {!showGuessBox ? (
                <GameButton variant="ghost" onClick={() => setShowGuessBox(true)} className="mt-4">
                  🎯 Make my final guess
                </GameButton>
              ) : (
                <div className="mt-4 flex gap-2">
                  <input
                    value={finalGuess}
                    onChange={(e) => setFinalGuess(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendGuess()}
                    placeholder="Name it…"
                    className="noir-input flex-1"
                    maxLength={200}
                  />
                  <GameButton variant="primary" onClick={sendGuess} disabled={!validQuestion(finalGuess)}>Guess!</GameButton>
                  <GameButton variant="ghost" onClick={() => setShowGuessBox(false)}>Cancel</GameButton>
                </div>
              )}
              <p className="mt-2 text-xs text-[var(--ink-faint)]">One shot — a wrong guess costs nothing, but the clock keeps ticking.</p>
            </GlassCard>
          )}
        </div>
      )}

      {/* ---- over ---- */}
      {(phase === 'won' || phase === 'lost') && (
        <div className="gk-modal-scope">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard className="p-8 text-center">
              <p className="mt-2 text-sm text-[var(--ink-dim)]">
                {phase === 'won'
                  ? `${winner === room.me.id ? 'You named' : 'Your partner named'} it in ${used} question${used === 1 ? '' : 's'}.`
                  : `The ${MAX_QUESTIONS} questions ran dry. The secret was: “${isThinker ? secret : 'revealed to the thinker only… nice try' }”.`}
              </p>
              {phase === 'lost' && isThinker && (
                <p className="mt-1 text-xs text-[var(--ink-faint)]">The secret stays sealed — unless you choose to tell.</p>
              )}
              <p className="mt-3 text-sm">
                Winner: <b className="text-[var(--amber-glow)]">{winner === room.me.id ? 'YOU' : room.peer?.name ?? 'Partner'}</b>
                {' · '} +{XP_AWARDS.duoWin} XP
              </p>
              <div className="mt-5">
                <GameButton variant="primary" onClick={reset}>🔄 New round</GameButton>
              </div>
            </GlassCard>
          </motion.div>
          <ResultModal
            open
            eyebrow="Interrogation over"
            headline={phase === 'won' ? 'NAILED IT!' : 'OUT OF QUESTIONS'}
            stat={`${used}/${MAX_QUESTIONS} questions used`}
            tone={phase === 'won' ? 'win' : 'lose'}
            primaryLabel="🔄 New round"
            onPrimary={reset}
          />
        </div>
      )}
    </div>
  );
}
