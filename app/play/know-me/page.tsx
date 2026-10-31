'use client';

/**
 * How Well Do You Know Me, solo (Duo Corner).
 * Answer six questions about yourself, guess Pip's answers (Pip is a
 * made-up friend with canned lines), then reveal them side by side.
 * Together mode is the real game: both answer, both guess, one reveal —
 * and there, each partner validates the guesses about their own
 * answers themselves. Solo keeps the app's exact-match scoring: Pip
 * cannot validate, and letting the player mark their own guesses
 * would make the stars self-reported.
 *
 * Two sections, same flow, separate state: "Questions" (free text)
 * and "Would You Rather" (pick A or B, guess Pip's pick).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  botAnswer,
  botWyrChoice,
  BOT_NAME,
  countMatches,
  KNOW_TAG_LABEL,
  pickQuestions,
  pickWyr,
  type KnowWyrChoice,
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
type Section = 'questions' | 'wyr';

interface SoloState {
  answers: Record<string, string>;
  guesses: Record<string, string>;
  phase: Phase;
  stars: number | null;
}

const freshSoloState = (): SoloState => ({ answers: {}, guesses: {}, phase: 'answer', stars: null });

interface StoredState {
  section: Section;
  questions: SoloState;
  wyr: SoloState;
}

const freshStored = (): StoredState => ({
  section: 'questions',
  questions: freshSoloState(),
  wyr: freshSoloState(),
});

export default function KnowMePage() {
  const { userId } = useTheme();
  const salt = userId ?? 'guest';
  const [progress, setProgress] = useState<ProgressMap>({});
  const [level, setLevel] = useState(1);
  const [stored, setStored] = useState<StoredState>(freshStored);
  const loadedFor = useRef('');

  const myProgress = getGameProgress(progress, GAME_ID);
  const unlocked = Math.max(myProgress.currentLevel, 1);
  const seed = levelSeed(GAME_ID, level, salt);
  const questions = useMemo(() => pickQuestions(seed), [seed]);
  const wyrPairs = useMemo(() => pickWyr(`${seed}|wyr`), [seed]);
  const pipAnswers = useMemo(() => {
    const out: Record<string, string> = {};
    for (const q of questions) out[q.id] = botAnswer(q, seed);
    return out;
  }, [questions, seed]);
  const pipWyr = useMemo(() => {
    const out: Record<string, KnowWyrChoice> = {};
    for (const w of wyrPairs) out[w.id] = botWyrChoice(w, seed);
    return out;
  }, [wyrPairs, seed]);

  useEffect(() => {
    const map = loadLocalProgress();
    setProgress(map);
    setLevel(getGameProgress(map, GAME_ID).currentLevel);
  }, []);

  useEffect(() => {
    const tag = `${salt}|${level}`;
    if (loadedFor.current === tag) return;
    loadedFor.current = tag;
    try {
      const raw = localStorage.getItem(`dd-v2-knowme-${tag}`);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<StoredState> & Partial<SoloState>;
        if (parsed.questions && parsed.wyr) {
          setStored({
            section: parsed.section ?? 'questions',
            questions: { ...freshSoloState(), ...parsed.questions },
            wyr: { ...freshSoloState(), ...parsed.wyr },
          });
          return;
        }
        // Old shape (a single SoloState): it was the questions game.
        if (parsed.answers) {
          setStored({
            section: 'questions',
            questions: { ...freshSoloState(), ...(parsed as SoloState), stars: null },
            wyr: freshSoloState(),
          });
          return;
        }
      }
    } catch {
      /* ignore */
    }
    setStored(freshStored());
  }, [level, salt]);

  useEffect(() => {
    if (loadedFor.current !== `${salt}|${level}`) return;
    try {
      localStorage.setItem(`dd-v2-knowme-${salt}|${level}`, JSON.stringify(stored));
    } catch {
      /* ignore */
    }
  }, [stored, level, salt]);

  const section = stored.section;
  const state = stored[section];
  const setState = (next: SoloState) =>
    setStored((s) => ({ ...s, [section]: next }));
  const switchSection = (next: Section) => setStored((s) => ({ ...s, section: next }));

  const items = section === 'questions' ? questions : wyrPairs;
  const answeredAll = items.every((it) => (state.answers[it.id] ?? '').trim() !== '');
  const guessedAll = items.every((it) => (state.guesses[it.id] ?? '').trim() !== '');

  const reveal = () => {
    if (!guessedAll || state.stars !== null) return;
    const matches =
      section === 'questions'
        ? countMatches(state.guesses, pipAnswers)
        : wyrPairs.filter((w) => state.guesses[w.id] === pipWyr[w.id]).length;
    const { map, stars } = recordWin(progress, GAME_ID, level, 0, items.length - matches);
    setProgress(map);
    setState({ ...state, phase: 'reveal', stars });
    try {
      localStorage.removeItem(`dd-v2-knowme-${salt}|${level}`);
    } catch {
      /* ignore */
    }
  };

  const matches =
    state.phase === 'reveal'
      ? section === 'questions'
        ? countMatches(state.guesses, pipAnswers)
        : wyrPairs.filter((w) => state.guesses[w.id] === pipWyr[w.id]).length
      : 0;

  const setAnswer = (id: string, value: string) =>
    setState({ ...state, answers: { ...state.answers, [id]: value } });
  const setGuess = (id: string, value: string) =>
    setState({ ...state, guesses: { ...state.guesses, [id]: value } });

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

      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Know Me sections">
        {(['questions', 'wyr'] as Section[]).map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={section === s}
            className={`chip ${section === s ? '!bg-[var(--accent)] !text-[var(--accent-ink)]' : ''}`}
            onClick={() => switchSection(s)}
          >
            {s === 'questions' ? 'Questions' : 'Would You Rather'}
          </button>
        ))}
      </div>
      {section === 'wyr' && (
        <p className="mt-2 text-sm text-[var(--ink-dim)]">
          Pick one of each pair for yourself, guess {BOT_NAME}’s pick, then reveal. In a
          together room, your partner marks your guesses Correct or Incorrect themselves —
          here, {BOT_NAME} can’t do that, so the app scores by exact match.
        </p>
      )}

      {state.phase === 'answer' && (
        <section className="mt-4 space-y-3">
          <h2 className="text-lg font-bold">
            {section === 'questions' ? 'First, about you' : 'First, your picks'}
          </h2>
          {section === 'questions' &&
            questions.map((q) => (
              <label key={q.id} className="card block p-4">
                <span className="font-semibold">{q.text}</span>
                <span className="chip ml-2">{KNOW_TAG_LABEL[q.tag]}</span>
                <input
                  className="input mt-2 w-full"
                  value={state.answers[q.id] ?? ''}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  placeholder="Your answer"
                />
              </label>
            ))}
          {section === 'wyr' &&
            wyrPairs.map((w) => (
              <div key={w.id} className="card p-4">
                <p className="font-semibold">Would you rather…</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(['A', 'B'] as KnowWyrChoice[]).map((choice) => (
                    <button
                      key={choice}
                      type="button"
                      className={`btn ${state.answers[w.id] === choice ? 'btn-primary' : ''}`}
                      aria-pressed={state.answers[w.id] === choice}
                      onClick={() => setAnswer(w.id, choice)}
                    >
                      {choice === 'A' ? w.optionA : w.optionB}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          <button
            type="button"
            className="btn btn-primary"
            disabled={!answeredAll}
            onClick={() => setState({ ...state, phase: 'guess' })}
          >
            {section === 'questions'
              ? `Now guess ${BOT_NAME}’s answers`
              : `Now guess ${BOT_NAME}’s picks`}
          </button>
        </section>
      )}

      {state.phase === 'guess' && (
        <section className="mt-4 space-y-3">
          <h2 className="text-lg font-bold">
            {section === 'questions'
              ? `Now guess ${BOT_NAME}’s answers`
              : `Now guess ${BOT_NAME}’s picks`}
          </h2>
          {section === 'questions' && (
            <p className="text-sm text-[var(--ink-dim)]">
              {BOT_NAME} is a made-up friend with canned answers — the fun is seeing how close
              your guesses land.
            </p>
          )}
          {section === 'questions' &&
            questions.map((q) => (
              <label key={q.id} className="card block p-4">
                <span className="font-semibold">{q.text}</span>
                <span className="mt-1 block text-sm text-[var(--ink-dim)]">
                  You answered: {state.answers[q.id]}
                </span>
                <input
                  className="input mt-2 w-full"
                  value={state.guesses[q.id] ?? ''}
                  onChange={(e) => setGuess(q.id, e.target.value)}
                  placeholder={`${BOT_NAME} would say…`}
                />
              </label>
            ))}
          {section === 'wyr' &&
            wyrPairs.map((w) => (
              <div key={w.id} className="card p-4">
                <p className="font-semibold">Would you rather…</p>
                <p className="mt-1 text-sm text-[var(--ink-dim)]">
                  You picked: {state.answers[w.id] === 'A' ? w.optionA : w.optionB}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(['A', 'B'] as KnowWyrChoice[]).map((choice) => (
                    <button
                      key={choice}
                      type="button"
                      className={`btn ${state.guesses[w.id] === choice ? 'btn-primary' : ''}`}
                      aria-pressed={state.guesses[w.id] === choice}
                      onClick={() => setGuess(w.id, choice)}
                    >
                      {choice === 'A' ? w.optionA : w.optionB}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          <button type="button" className="btn btn-primary" disabled={!guessedAll} onClick={reveal}>
            Reveal them together
          </button>
        </section>
      )}

      {state.phase === 'reveal' && (
        <section className="mt-4 space-y-3">
          <h2 className="text-lg font-bold">
            The reveal — you guessed {matches} of {items.length}
          </h2>
          {section === 'questions' &&
            questions.map((q) => {
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
          {section === 'wyr' &&
            wyrPairs.map((w) => {
              const match = state.guesses[w.id] === pipWyr[w.id];
              return (
                <div key={w.id} className="card p-4">
                  <p className="font-semibold">Would you rather…</p>
                  <p className="mt-1 text-sm">
                    You picked: {state.answers[w.id] === 'A' ? w.optionA : w.optionB}
                  </p>
                  <p className="text-sm">
                    {BOT_NAME} picked: {pipWyr[w.id] === 'A' ? w.optionA : w.optionB}
                  </p>
                  <p className="text-sm">
                    You guessed: {state.guesses[w.id] === 'A' ? w.optionA : w.optionB} —{' '}
                    <span className="font-semibold">{match ? 'Match.' : 'Not quite.'}</span>
                  </p>
                </div>
              );
            })}
          {state.stars !== null && (
            <WinPanel
              stars={state.stars}
              line={
                state.stars === 3
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
