'use client';

/* Black Stories — lateral puzzles, co-op.
 * One player hosts (sees riddle + solution), the other asks yes/no questions.
 * Questions travel via room.send('bs-question', ...), answers live in shared
 * state under shared.games['black-stories'] = { hostId, storyId, phase, qa, askedCount }.
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameProps } from '../types';
import type { Answer, BlackStoriesShared } from './types';
import { ALL_STORIES, getStory } from './content';
import { appendQuestion, answerQuestion, validQuestion } from './logic';
import { awardXP, syncXpToRoom, XP_AWARDS } from '../../lib/xp';
import { sounds } from '../../lib/sound';
import { GlassCard } from '../../components/GlassCard';
import '../ui-kit/kit.css';
import { GameButton, ResultModal, SectionTitle } from '../ui-kit';

const ANSWER_LABEL: Record<Answer, string> = { yes: 'YES', no: 'NO', irrelevant: 'IRRELEVANT' };

export default function BlackStoriesGame({ room }: GameProps) {
  const gs: BlackStoriesShared = room.shared?.games?.['black-stories'] ?? {};
  const phase = gs.phase ?? 'pick-roles';
  const hostId = gs.hostId ?? null;
  const story = gs.storyId ? getStory(gs.storyId) : undefined;
  const qa = gs.qa ?? [];
  const askedCount = gs.askedCount ?? 0;
  const awarded: Record<string, boolean> = gs.awarded ?? {};
  const claimedBy: string | null = gs.claimedBy ?? null;

  const isHost = hostId === room.me.id;
  const isSleuth = hostId !== null && !isHost;
  const bothHere = !!room.peer;
  const [question, setQuestion] = useState('');

  const patch = (p: Partial<BlackStoriesShared> & Record<string, any>) =>
    room.setShared({ games: { 'black-stories': p } });

  // Award co-op XP once per player when a story is solved.
  useEffect(() => {
    if (phase === 'solved' && !awarded[room.me.id] && (isHost || isSleuth)) {
      awardXP(XP_AWARDS.coopWin);
      syncXpToRoom(room.setShared, room.me.id, room.me.name);
      sounds.xpTick();
      patch({ awarded: { ...awarded, [room.me.id]: true } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Host hears a pin-tap when a new question arrives.
  const lastQaLen = useRef(qa.length);
  useEffect(() => {
    const unsub = room.onAction('bs-question', () => {
      sounds.pinTap();
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (qa.length > lastQaLen.current && isHost) sounds.paperShuffle();
    lastQaLen.current = qa.length;
  }, [qa.length, isHost]);

  const becomeHost = () => {
    sounds.stampThud();
    patch({ hostId: room.me.id, phase: 'pick-story', storyId: null, qa: [], askedCount: 0, awarded: {}, claimedBy: null });
  };
  const becomeSleuth = () => {
    sounds.typewriterClick();
    patch({ hostId: room.peer ? room.peer.id : 'unknown', phase: 'pick-story' });
  };

  const pickStory = (id: string) => {
    sounds.paperShuffle();
    patch({ storyId: id, phase: 'questioning', qa: [], askedCount: 0, awarded: {}, claimedBy: null });
  };

  const askQuestion = () => {
    if (!validQuestion(question) || isHost) return;
    sounds.typewriterClick();
    const text = question.trim();
    setQuestion('');
    patch({ qa: appendQuestion(qa, text, room.me.id) });
    room.send('bs-question', { text, from: room.me.id, name: room.me.name });
  };

  const answer = (index: number, a: Answer) => {
    sounds.pinTap();
    patch({ qa: answerQuestion(qa, index, a), askedCount: askedCount + 1 });
    room.send('bs-answer', { index, answer: a });
  };

  const reveal = (solved: boolean) => {
    sounds.stampThud();
    patch({ phase: solved ? 'solved' : 'surrendered', claimedBy: null });
  };

  const newRound = () => {
    sounds.paperShuffle();
    patch({ phase: 'pick-story', storyId: null, qa: [], askedCount: 0, awarded: {}, claimedBy: null });
  };

  const header = (
    <div className="mb-5 text-center">
      <SectionTitle eyebrow="Case file · lateral puzzle" title="Black Stories" />
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-xs text-[var(--ink-dim)]">
        <span className="rounded-full border border-[var(--glass-border)] px-3 py-1">
          🎙️ Host: {hostId === room.me.id ? 'You' : room.peer && hostId === room.peer.id ? room.peer.name : '—'}
        </span>
        <span className="rounded-full border border-[var(--glass-border)] px-3 py-1">
          ❓ Questions asked: <b className="text-[var(--amber-glow)]">{askedCount}</b>
        </span>
      </div>
    </div>
  );

  return (
    <div className="gk-root mx-auto max-w-2xl">
      {header}

      {/* ---- role picking ---- */}
      {phase === 'pick-roles' && (
        <GlassCard className="p-8 text-center">
          <p className="text-sm text-[var(--ink-dim)]">
            One detective hosts the case — they know the twisted truth.
            The other asks only <b>yes / no</b> questions to crack it.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <motion.div whileHover={{ y: -3 }} className="manila-folder p-5 text-left">
              <div className="type-heading text-lg">🎙️ The Host</div>
              <p className="mt-2 text-xs text-[var(--ink-dim)]">Reads the full story, answers yes / no / irrelevant.</p>
              <GameButton variant="primary" onClick={becomeHost} className="mt-4 w-full" disabled={!!hostId}>
                Become host
              </GameButton>
            </motion.div>
            <motion.div whileHover={{ y: -3 }} className="manila-folder p-5 text-left">
              <div className="type-heading text-lg">🔍 The Sleuth</div>
              <p className="mt-2 text-xs text-[var(--ink-dim)]">Hears only the riddle, interrogates with questions.</p>
              <GameButton variant="primary" onClick={becomeSleuth} className="mt-4 w-full" disabled={!!hostId || !bothHere}>
                Become sleuth
              </GameButton>
            </motion.div>
          </div>
          {!bothHere && (
            <p className="mt-4 text-xs text-[var(--ink-faint)]">
              Waiting for your partner to join the room… (solo practice coming soon)
            </p>
          )}
        </GlassCard>
      )}

      {/* ---- host picks a story ---- */}
      {phase === 'pick-story' && (
        <GlassCard className="p-6">
          {isHost ? (
            <>
              <div className="type-heading mb-4 text-center text-lg">Choose tonight's case, host</div>
              <div className="grid gap-3 sm:grid-cols-2">
                {ALL_STORIES.map((s) => (
                  <motion.button
                    key={s.id}
                    whileHover={{ y: -2 }}
                    onClick={() => pickStory(s.id)}
                    className="manila-folder p-4 text-left"
                  >
                    <div className="type-heading text-sm">{s.title}</div>
                    <div className="mt-1 line-clamp-2 text-xs text-[var(--ink-dim)]">{s.riddle}</div>
                  </motion.button>
                ))}
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-sm text-[var(--ink-dim)]">
              <div className="type-heading mb-2 text-lg text-[var(--ink)]">The host is choosing a case…</div>
              Sit tight, sleuth. The riddle lands on your desk any second.
            </div>
          )}
        </GlassCard>
      )}

      {/* ---- questioning ---- */}
      {(phase === 'questioning' || phase === 'solved' || phase === 'surrendered') && story && (
        <div className="space-y-4">
          <div className="manila-folder relative p-6">
            <div className="brass-pin absolute -top-2 left-6" />
            <div className="eyebrow">The riddle</div>
            <div className="type-heading mt-1 text-xl">{story.title}</div>
            <p className="mt-3 text-sm leading-relaxed">{story.riddle}</p>
          </div>

          {/* Q&A log — interrogation-lamp styling */}
          <GlassCard className="p-5">
            <div className="eyebrow mb-3">📋 Interrogation log</div>
            {qa.length === 0 && (
              <p className="text-sm italic text-[var(--ink-faint)]">No questions yet. The lamp is warming up…</p>
            )}
            <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
              {qa.map((entry, i) => (
                <div key={i} className="rounded-xl border border-[var(--glass-border)] bg-[rgba(232,163,61,0.05)] p-3">
                  <div className="text-sm">“{entry.q}”</div>
                  <div className="mt-2 flex items-center gap-2">
                    {entry.a ? (
                      <span
                        className={`rounded-full px-3 py-0.5 text-xs font-bold tracking-widest ${
                          entry.a === 'yes'
                            ? 'bg-[rgba(76,175,80,0.2)] text-[#7ee787]'
                            : entry.a === 'no'
                              ? 'bg-[rgba(211,58,44,0.2)] text-[var(--blood-bright)]'
                              : 'bg-[rgba(201,162,39,0.2)] text-[var(--brass)]'
                        }`}
                      >
                        {ANSWER_LABEL[entry.a]}
                      </span>
                    ) : isHost ? (
                      <div className="flex gap-2">
                        {(['yes', 'no', 'irrelevant'] as Answer[]).map((a) => (
                          <button key={a} onClick={() => answer(i, a)} className="noir-btn-ghost !px-3 !py-1 !text-xs">
                            {ANSWER_LABEL[a]}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs italic text-[var(--ink-faint)]">awaiting the host…</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* sleuth asks */}
          {phase === 'questioning' && isSleuth && (
            <GlassCard className="p-5">
              <div className="flex gap-2">
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && askQuestion()}
                  placeholder="Ask a yes/no question…"
                  className="noir-input flex-1"
                  maxLength={300}
                />
                <GameButton variant="primary" onClick={askQuestion} disabled={!validQuestion(question)}>
                  Ask ❓
                </GameButton>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {!claimedBy && (
                  <GameButton
                    variant="ghost"
                    onClick={() => {
                      sounds.stampThud();
                      patch({ claimedBy: room.me.id });
                      room.send('bs-claim', { from: room.me.id });
                    }}
                  >
                    🕵️ I cracked it!
                  </GameButton>
                )}
                <GameButton variant="ghost" onClick={() => reveal(false)}>
                  🏳️ Surrender — reveal solution
                </GameButton>
              </div>
              {claimedBy === room.me.id && (
                <p className="mt-3 text-xs text-[var(--amber-glow)]">
                  Claim sent — the host will confirm whether you cracked it.
                </p>
              )}
            </GlassCard>
          )}

          {/* host confirms a claim */}
          {phase === 'questioning' && isHost && claimedBy && (
            <GlassCard className="border-[var(--amber-glow)] p-5 text-center">
              <div className="type-heading text-lg">The sleuth claims they cracked it!</div>
              <p className="mt-1 text-xs text-[var(--ink-dim)]">Did they speak the truth, host?</p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <GameButton variant="primary" onClick={() => reveal(true)}>✅ Correct — case solved</GameButton>
                <GameButton
                  variant="ghost"
                  onClick={() => {
                    sounds.typewriterClick();
                    patch({ claimedBy: null });
                  }}
                >
                  ❌ Not quite — keep digging
                </GameButton>
              </div>
            </GlassCard>
          )}

          {/* host reveal */}
          {phase === 'questioning' && isHost && (
            <div className="text-center">
              <GameButton variant="ghost" onClick={() => reveal(true)}>
                🗝️ Mark solved — reveal the truth
              </GameButton>
            </div>
          )}

          {/* solution reveal */}
          {(phase === 'solved' || phase === 'surrendered') && (
            <div className="gk-modal-scope">
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <GlassCard className="p-6 text-center">
                  <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-[var(--ink-dim)]">{story.solution}</p>
                  <div className="mt-3 text-xs text-[var(--ink-faint)]">
                    Solved in {askedCount} question{askedCount === 1 ? '' : 's'} · +{XP_AWARDS.coopWin} XP each
                  </div>
                  <div className="mt-5">
                    <GameButton variant="primary" onClick={newRound}>
                      📂 Next case
                    </GameButton>
                  </div>
                </GlassCard>
              </motion.div>
              <ResultModal
                open
                eyebrow="The truth, revealed"
                headline={phase === 'solved' ? 'CASE CRACKED!' : 'SURRENDERED — TRUTH REVEALED'}
                stat={`${askedCount} question${askedCount === 1 ? '' : 's'} · +${XP_AWARDS.coopWin} XP each`}
                tone={phase === 'solved' ? 'win' : 'draw'}
                primaryLabel="📂 Next case"
                onPrimary={newRound}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
