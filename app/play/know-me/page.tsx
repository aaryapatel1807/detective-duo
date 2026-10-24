'use client';

/**
 * How Well Do You Know Me, solo (Duo Corner).
 * Answer six questions about yourself, guess Pip's answers (Pip is a
 * made-up friend with canned lines), then reveal them side by side.
 * Together mode is the real game: both answer, both guess, one reveal.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  botAnswer,
  BOT_NAME,
  countMatches,
  KNOW_TAG_LABEL,
  pickQuestions,
} from '@/lib/generators/knowMe';
import { levelSeed } from '@/lib/generators/rng';
import {
  getGameProgress,
  loadLocalProgress,
  recordWin,
  type ProgressMap,
} from '@/lib/progress';
import { useTheme } from '@/components/ThemeProvider';
import { PlayHeader, WinPanel } from '@/components/duo/PlayBits';

const GAME_ID = 'know-me';

type Phase = 'answer' | 'guess' | 'reveal';

interface SoloState {
  answers: Record<string, string>;
  guesses: Record<string, string>;
  phase: Phase;
}

export default function KnowMePage() {
  const { userId } = useTheme();
  const salt = userId ?? 'guest';
  const [progress, setProgress] = useState<ProgressMap>({});
  const [level, setLevel] = useState(1);
  const [state, setState] = useState<SoloState>({ answers: {}, guesses: {}, phase: 'answer' });
  const [won, setWon] = useState<number | null>(null);
  const loadedFor = useRef('');

  const myProgress = getGameProgress(progress, GAME_ID);
  const unlocked = Math.max(myProgress.currentLevel, 1);
  const seed = levelSeed(GAME_ID, level, salt);
  const questions = useMemo(() => pickQuestions(seed), [seed]);
  const pipAnswers = useMemo(() => {
    const out: Record<string, string> = {};
    for (const q of questions) out[q.id] = botAnswer(q, seed);
    return out;
  }, [questions, seed]);

  useEffect(() => {
    const map = loadLocalProgress();
    setProgress(map);
    setLevel(getGameProgress(map, GAME_ID).currentLevel);
  }, []);

  useEffect(() => {
    const tag = `${salt}|${level}`;
    if (loadedFor.current === tag) return;
    loadedFor.current = tag;
    setWon(null);
    try {
      const raw = localStorage.getItem(`dd-v2-knowme-${tag}`);
      if (raw) {
        const parsed = JSON.parse(raw) as SoloState;
        if (parsed.answers) {
          setState(parsed);
          return;
        }
      }
    } catch {
      /* ignore */
    }
    setState({ answers: {}, guesses: {}, phase: 'answer' });
  }, [level, salt]);

  useEffect(() => {
    if (loadedFor.current !== `${salt}|${level}`) return;
    try {
      localStorage.setItem(`dd-v2-knowme-${salt}|${level}`, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, level, salt]);

  const answeredAll = questions.every((q) => (state.answers[q.id] ?? '').trim() !== '');
  const guessedAll = questions.every((q) => (state.guesses[q.id] ?? '').trim() !== '');

  const reveal = () => {
    if (!guessedAll || won !== null) return;
    const matches = countMatches(state.guesses, pipAnswers);
    const { map, stars } = recordWin(progress, GAME_ID, level, 0, questions.length - matches);
    setProgress(map);
    setWon(stars);
    setState({ ...state, phase: 'reveal' });
    try {
      localStorage.removeItem(`dd-v2-knowme-${salt}|${level}`);
    } catch {
      /* ignore */
    }
  };

  const matches = state.phase === 'reveal' ? countMatches(state.guesses, pipAnswers) : 0;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16">
      <PlayHeader
        title="How Well Do You Know Me"
        intro={`Six questions, three moods. Answer about yourself, then guess ${BOT_NAME}'s answers, then reveal them together.`}
        level={level}
        unlocked={unlocked}
        onLevel={setLevel}
        bestStars={myProgress.stars[String(level)] ?? 0}
      />

      {state.phase === 'answer' && (
        <section className="mt-4 space-y-3">
          <h2 className="text-lg font-bold">First, about you</h2>
          {questions.map((q) => (
            <label key={q.id} className="card block p-4">
              <span className="font-semibold">{q.text}</span>
              <span className="chip ml-2">{KNOW_TAG_LABEL[q.tag]}</span>
              <input
                className="input mt-2 w-full"
                value={state.answers[q.id] ?? ''}
                onChange={(e) =>
                  setState({ ...state, answers: { ...state.answers, [q.id]: e.target.value } })
                }
                placeholder="Your answer"
              />
            </label>
          ))}
          <button
            type="button"
            className="btn btn-primary"
            disabled={!answeredAll}
            onClick={() => setState({ ...state, phase: 'guess' })}
          >
            Now guess {BOT_NAME}’s answers
          </button>
        </section>
      )}

      {state.phase === 'guess' && (
        <section className="mt-4 space-y-3">
          <h2 className="text-lg font-bold">Now guess {BOT_NAME}’s answers</h2>
          <p className="text-sm text-[var(--ink-dim)]">
            {BOT_NAME} is a made-up friend with canned answers — the fun is seeing how close
            your guesses land.
          </p>
          {questions.map((q) => (
            <label key={q.id} className="card block p-4">
              <span className="font-semibold">{q.text}</span>
              <span className="mt-1 block text-sm text-[var(--ink-dim)]">
                You answered: {state.answers[q.id]}
              </span>
              <input
                className="input mt-2 w-full"
                value={state.guesses[q.id] ?? ''}
                onChange={(e) =>
                  setState({ ...state, guesses: { ...state.guesses, [q.id]: e.target.value } })
                }
                placeholder={`${BOT_NAME} would say…`}
              />
            </label>
          ))}
          <button type="button" className="btn btn-primary" disabled={!guessedAll} onClick={reveal}>
            Reveal them together
          </button>
        </section>
      )}

      {state.phase === 'reveal' && (
        <section className="mt-4 space-y-3">
          <h2 className="text-lg font-bold">
            The reveal — you guessed {matches} of {questions.length}
          </h2>
          {questions.map((q) => {
            const match =
              state.guesses[q.id]?.trim().toLowerCase() ===
              pipAnswers[q.id]?.trim().toLowerCase();
            return (
              <div key={q.id} className="card p-4">
                <p className="font-semibold">{q.text}</p>
                <p className="mt-1 text-sm">You: {state.answers[q.id]}</p>
                <p className="text-sm">
                  {BOT_NAME}: {pipAnswers[q.id]}
                </p>
                <p className="text-sm">
                  You guessed: {state.guesses[q.id]} —{' '}
                  <span className="font-semibold">{match ? 'Match.' : 'Not quite.'}</span>
                </p>
              </div>
            );
          })}
          {won !== null && (
            <WinPanel
              stars={won}
              line={
                won === 3
                  ? 'You know Pip scarily well. The next set of questions is fresh.'
                  : 'A new set of questions waits on the next level.'
              }
              onNext={() => setLevel(level + 1)}
            />
          )}
        </section>
      )}
    </main>
  );
}
