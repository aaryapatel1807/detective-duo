'use client';

/* Trivia Battle — 10 questions, alternate answers, faster correct = more points.
 * Mixes the offline bank (lib/content/trivia.ts) with the couple's custom
 * "about each other" questions from Settings (localStorage 'dd-custom-trivia').
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 style={{ fontFamily: 'var(--font-type)' }} className="text-xl tracking-wide">
          🧠 TRIVIA BATTLE
        </h2>
        <div className="text-sm opacity-80" style={{ fontFamily: 'var(--font-type)' }}>
          Q {Math.min(idx + 1, deck.length || QUESTION_COUNT)}/{deck.length || QUESTION_COUNT} ·{' '}
          {nameOf(me)} {scores[me] ?? 0} — {scores[peer?.id ?? ''] ?? 0} {nameOf(peer?.id ?? null)}
        </div>
      </div>

      {!peer && (
        <div className="glass-card p-4 text-sm" style={{ fontFamily: 'var(--font-type)' }}>
          ⏳ Waiting for your partner… (code <span className="font-bold">{room.roomCode ?? '—'}</span>)
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
        {phase === 'lobby' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-center text-sm opacity-70" style={{ fontFamily: 'var(--font-type)' }}>
              {QUESTION_COUNT} questions — detective lore, forensics, and your own
              "about each other" cards from Settings. Answer fast, answer right.
            </p>
            <button className="noir-btn" onClick={startMatch} disabled={!peer}>
              📁 Open the case
            </button>
          </div>
        )}

        {phase === 'over' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="text-4xl">{matchWinner === me ? '🏆' : matchWinner === null ? '🤝' : '🕯️'}</div>
            <p className="text-center text-sm" style={{ fontFamily: 'var(--font-type)' }}>
              {matchWinner === null
                ? 'A dead-even interrogation — nobody breaks.'
                : matchWinner === me
                  ? 'Case closed — your recall is razor sharp.'
                  : `${nameOf(matchWinner)} out-detectives you this time.`}
            </p>
            <button className="noir-btn" onClick={startMatch}>🔁 New battle</button>
          </div>
        )}

        {(phase === 'question' || phase === 'reveal') && q && (
          <div className="mx-auto max-w-xl">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs tracking-widest text-amber-200/80" style={{ fontFamily: 'var(--font-type)' }}>
                {q.category.toUpperCase()}
              </span>
              {phase === 'question' && (
                <span className={`text-sm ${left <= 4 ? 'text-red-300' : 'text-amber-200'}`} style={{ fontFamily: 'var(--font-type)' }}>
                  ⏱ {left}s
                </span>
              )}
            </div>
            <div className="mb-2 h-1 overflow-hidden rounded bg-white/10">
              <div
                className="h-full bg-amber-400 transition-all"
                style={{ width: `${(left / QUESTION_SECONDS) * 100}%` }}
              />
            </div>
            <h3 className="mb-4 text-lg" style={{ fontFamily: 'var(--font-type)' }}>{q.question}</h3>

            {phase === 'question' ? (
              isAnswerer ? (
                q.kind === 'mc' && q.options ? (
                  <div className="grid gap-2">
                    {q.options.map((opt, i) => (
                      <button key={i} onClick={() => submit(String(i))} className="noir-btn noir-btn-ghost text-left">
                        <span className="mr-2 opacity-60">{'ABCD'[i]}.</span> {opt}
                      </button>
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
                    <button className="noir-btn" onClick={() => pick.trim() && submit(pick)}>
                      🕵️ Answer
                    </button>
                  </div>
                )
              ) : (
                <p className="py-4 text-center text-sm opacity-70" style={{ fontFamily: 'var(--font-type)' }}>
                  {nameOf(answerer)} is answering… no coaching from the gallery. 🤫
                </p>
              )
            ) : (
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="text-3xl">{correct ? '✅' : '❌'}</div>
                <p className="text-center text-sm" style={{ fontFamily: 'var(--font-type)' }}>
                  {correct
                    ? `${nameOf(answerer)} nails it — +${earned} pts.`
                    : `The answer was "${q.answerText}".`}
                </p>
                <button className="noir-btn" onClick={nextQuestion}>
                  {idx + 1 >= deck.length ? '🏁 See results' : '➡️ Next question'}
                </button>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
