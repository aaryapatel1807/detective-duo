'use client';

/* Trivia Battle — 10 questions, alternate answers, faster correct = more points.
 * Mixes the offline bank (lib/content/trivia.ts) with the couple's custom
 * "about each other" questions from Settings (localStorage 'dd-custom-trivia').
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import '../ui-kit/kit.css';
import {
  GameButton,
  ScoreHUD,
  TurnBanner,
  ResultModal,
  GameCard,
  TimerChip,
  ProgressBar,
  SectionTitle,
} from '../ui-kit';
import type { GameProps } from '../types';
import type { TriviaShared } from './types';
import {
  QUESTION_COUNT,
  QUESTION_SECONDS,
  buildDeck,
  isCorrect,
  pointsFor,
  secondsLeft,
} from './logic';
import { TRIVIA, readCustomTrivia } from '../../lib/content/trivia';
import { awardXP, syncXpToRoom, XP_AWARDS } from '../../lib/xp';
import { sounds } from '../../lib/sound';

export default function TriviaBattleGame({ room }: GameProps) {
  const gs: TriviaShared = room.shared?.games?.['trivia-battle'] ?? {};
  const phase = gs.phase ?? 'lobby';
  const deck = gs.deck ?? [];
  const idx = gs.idx ?? 0;
  const answerer = gs.answerer ?? null;
  const startedAt = gs.startedAt ?? 0;
  const correct = gs.correct ?? null;
  const earned = gs.earned ?? 0;
  const scores = gs.scores ?? {};
  const matchWinner = gs.matchWinner ?? null;
  const me = room.me.id;
  const peer = room.peer;
  const awardedRef = useRef(false);

  const [pick, setPick] = useState('');
  const [tick, setTick] = useState(Date.now());

  const q = deck[idx];
  const lowerId = peer && me < peer.id ? me : (peer?.id ?? me);
  const higherId = peer ? (peer.id === lowerId ? me : peer.id) : me;
  const isAnswerer = answerer === me;

  const set = (patch: Partial<TriviaShared>) =>
    room.setShared({ games: { 'trivia-battle': patch } });

  useEffect(() => {
    if (matchWinner && matchWinner === me && !awardedRef.current) {
      awardedRef.current = true;
      awardXP(XP_AWARDS.duoWin);
      syncXpToRoom(room.setShared, me, room.me.name);
      sounds.stampThud();
    }
  }, [matchWinner, me, room]);

  // Reset the local pick when the question changes.
  useEffect(() => {
    setPick('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, phase]);

  useEffect(() => {
    if (phase !== 'question') return;
    const t = setInterval(() => setTick(Date.now()), 500);
    return () => clearInterval(t);
  }, [phase]);

  const left = phase === 'question' && startedAt > 0 ? secondsLeft(startedAt, tick) : QUESTION_SECONDS;

  const scoresRef = useRef(scores);
  scoresRef.current = scores;

  // Time runs out → the answer stands as wrong (either client may write it).
  useEffect(() => {
    if (phase !== 'question' || !q || left > 0 || !peer) return;
    const who = answerer ?? me;
    set({
      phase: 'reveal', pick: null, correct: false, earned: 0,
      scores: { ...scoresRef.current, [who]: scoresRef.current[who] ?? 0 },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, phase]);

  const nameOf = (pid: string | null): string =>
    pid === null ? '—' : pid === me ? room.me.name : (peer?.name ?? 'Partner');

  const startMatch = () => {
    if (!peer) return;
    sounds.paperShuffle();
    const deckBuilt = buildDeck(TRIVIA, readCustomTrivia(), QUESTION_COUNT);
    set({
      phase: 'question', deck: deckBuilt, idx: 0, answerer: lowerId,
      startedAt: Date.now(), pick: null, correct: null, earned: 0,
      scores: {}, matchWinner: null,
    });
  };

  const submit = (value: string) => {
    if (phase !== 'question' || !isAnswerer || !q) return;
    const ok = isCorrect(q, value);
    const pts = pointsFor(ok, secondsLeft(startedAt, Date.now()));
    sounds.typewriterClick();
    if (ok) sounds.pinTap();
    set({
      phase: 'reveal', pick: value, correct: ok, earned: pts,
      scores: { ...scores, [me]: (scores[me] ?? 0) + pts },
    });
  };

  const nextQuestion = () => {
    sounds.paperShuffle();
    const ni = idx + 1;
    if (ni >= deck.length) {
      const ids = [lowerId, higherId];
      const mw = (scores[ids[0]] ?? 0) === (scores[ids[1]] ?? 0)
        ? null
        : (scores[ids[0]] ?? 0) > (scores[ids[1]] ?? 0) ? ids[0] : ids[1];
      set({ phase: 'over', matchWinner: mw });
      return;
    }
    set({
      phase: 'question', idx: ni,
      answerer: ni % 2 === 0 ? lowerId : higherId,
      startedAt: Date.now(), pick: null, correct: null, earned: 0,
    });
  };

  const total = deck.length || QUESTION_COUNT;

  return (
    <div className="gk-root space-y-4">
      <SectionTitle
        eyebrow={`${QUESTION_COUNT} QUESTIONS · ALTERNATE ANSWERS`}
        title="🧠 Trivia Battle"
      />
      <ScoreHUD
        leftLabel="YOU"
        leftValue={scores[me] ?? 0}
        rightLabel="OPPONENT"
        rightValue={scores[peer?.id ?? ''] ?? 0}
      />

      {!peer && (
        <div className="glass-card p-4 text-sm">
          ⏳ Waiting for your partner… (code <span className="font-bold">{room.roomCode ?? '—'}</span>)
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card gk-modal-scope p-5">
        {phase === 'lobby' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-center text-sm opacity-70">
              {QUESTION_COUNT} questions — detective lore, forensics, and your own
              "about each other" cards from Settings. Answer fast, answer right.
            </p>
            <GameButton onClick={startMatch} disabled={!peer}>
              📁 Open the case
            </GameButton>
          </div>
        )}

        {(phase === 'question' || phase === 'reveal') && q && (
          <div className="mx-auto max-w-xl">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs tracking-widest text-amber-200/80">
                {q.category.toUpperCase()}
              </span>
              {phase === 'question' && <TimerChip seconds={left} label="TIME" />}
            </div>
            <div className="mb-4">
              <ProgressBar label="QUESTION" value={Math.min(idx + 1, total)} max={total} />
            </div>
            {phase === 'question' && (
              <TurnBanner
                isYourTurn={isAnswerer}
                yourText="Your answer"
                theirText={`${nameOf(answerer)} is answering…`}
              />
            )}
            <h3 className="mb-4 text-lg">{q.question}</h3>

            {phase === 'question' ? (
              isAnswerer ? (
                q.kind === 'mc' && q.options ? (
                  <div className="grid gap-2">
                    {q.options.map((opt, i) => (
                      <GameCard
                        key={i}
                        onClick={() => submit(String(i))}
                        ariaLabel={`Option ${'ABCD'[i]}: ${opt}`}
                        className="w-full"
                      >
                        <span className="text-left">
                          <span className="opacity-60">{'ABCD'[i]}.</span> {opt}
                        </span>
                      </GameCard>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      className="noir-input flex-1"
                      value={pick}
                      onChange={(e) => setPick(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && pick.trim() && submit(pick)}
                      placeholder="Type your answer…"
                      maxLength={80}
                    />
                    <GameButton onClick={() => pick.trim() && submit(pick)}>
                      🕵️ Answer
                    </GameButton>
                  </div>
                )
              ) : (
                <p className="py-4 text-center text-sm opacity-70">
                  {nameOf(answerer)} is answering… no coaching from the gallery. 🤫
                </p>
              )
            ) : (
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="text-3xl">{correct ? '✅' : '❌'}</div>
                <p className="text-center text-sm">
                  {correct
                    ? `${nameOf(answerer)} nails it — +${earned} pts.`
                    : `The answer was "${q.answerText}".`}
                </p>
                <GameButton onClick={nextQuestion}>
                  {idx + 1 >= deck.length ? '🏁 See results' : '➡️ Next question'}
                </GameButton>
              </div>
            )}
          </div>
        )}

        <ResultModal
          open={phase === 'over'}
          eyebrow="INTERROGATION COMPLETE"
          headline={
            matchWinner === null ? 'Dead heat' :
            matchWinner === me ? 'Case closed' : 'Out-detected'
          }
          tone={matchWinner === null ? 'draw' : matchWinner === me ? 'win' : 'lose'}
          stat={
            matchWinner === null
              ? `DEAD EVEN — ${scores[me] ?? 0} — ${scores[peer?.id ?? ''] ?? 0}`
              : `FINAL — YOU ${scores[me] ?? 0} · OPPONENT ${scores[peer?.id ?? ''] ?? 0}`
          }
          primaryLabel="🔁 New battle"
          onPrimary={startMatch}
        />
      </motion.div>
    </div>
  );
}
