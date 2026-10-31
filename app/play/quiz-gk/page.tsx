'use client';

/**
 * GK Quiz, Duo Corner (replaces Snake Arena on the board once wired up).
 * Original general-knowledge multiple choice: one question, four
 * options, exactly one correct answer, across science, geography,
 * history, sports, and everyday life. Solo plays the same seeded set
 * against Cosy Bot, which answers after a short pause with
 * level-based accuracy (sharper at higher levels, never perfect) —
 * a round is won by outscoring the bot. Two-player is pass-and-play:
 * players alternate questions on one device, with a turn banner as
 * the handoff. There is no timer: take as long as you like, and
 * nothing here can end a round or mark an answer wrong on time.
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Home, RotateCcw } from 'lucide-react';
import {
  botAnswer,
  botDelayForLevel,
  generateQuiz,
  QUIZ_CATEGORY_LABELS,
  quizWinner,
  scoreAnswers,
  turnForQuestion,
  type QuizRoundQuestion,
} from '@/lib/generators/quizGk';
import { rngFromSeed, tierName } from '@/lib/generators/rng';
import {
  getGameProgress,
  loadLocalProgress,
  recordWin,
  type ProgressMap,
} from '@/lib/progress';
import { useTheme } from '@/components/ThemeProvider';

const GAME_ID = 'quiz-gk';
const PLAYER_COLOURS = ['var(--accent)', 'var(--accent-2)'];

type Mode = 'solo' | 'duo';

function playerLabel(mode: Mode, index: 0 | 1): string {
  if (mode === 'solo') return index === 0 ? 'You' : 'Cosy Bot';
  return `Player ${index + 1}`;
}

export default function QuizGkPage() {
  const { userId } = useTheme();
  const salt = userId ?? 'guest';
  const [progress, setProgress] = useState<ProgressMap>({});
  const [level, setLevel] = useState(1);
  const [mode, setMode] = useState<Mode | null>(null);
  const [round, setRound] = useState(0);
  const [seedStr, setSeedStr] = useState('');
  const [questions, setQuestions] = useState<QuizRoundQuestion[]>([]);
  const [index, setIndex] = useState(0);
  /** The answering player's pick per question (solo: yours; duo: whoever's turn it was). */
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  /** Solo only: Cosy Bot's pick per question. */
  const [botAnswers, setBotAnswers] = useState<(number | null)[]>([]);
  const [botThinking, setBotThinking] = useState(false);
  const [finished, setFinished] = useState(false);
  const recordedRef = useRef(false);

  const myProgress = getGameProgress(progress, GAME_ID);
  const unlocked = Math.max(myProgress.currentLevel, 1);

  useEffect(() => {
    const map = loadLocalProgress();
    setProgress(map);
    setLevel(getGameProgress(map, GAME_ID).currentLevel);
  }, []);

  const startGame = (m: Mode, lvl: number, rnd: number) => {
    const seed = `${salt}|${Date.now()}|${rnd}`;
    recordedRef.current = false;
    setMode(m);
    setSeedStr(seed);
    setQuestions(generateQuiz(seed, lvl));
    setIndex(0);
    setAnswers([]);
    setBotAnswers([]);
    setBotThinking(false);
    setFinished(false);
  };

  const changeLevel = (lvl: number) => {
    const next = Math.max(1, Math.min(unlocked, lvl));
    setLevel(next);
    if (mode !== null) startGame(mode, next, round + 1);
  };

  const restart = () => {
    if (mode === null) return;
    setRound((r) => r + 1);
    startGame(mode, level, round + 1);
  };

  const question = questions[index];
  const answered = question ? answers[index] !== undefined && answers[index] !== null : false;
  const botRevealed =
    mode === 'solo' && answered && botAnswers[index] !== undefined && botAnswers[index] !== null;
  const revealed = mode === 'duo' ? answered : botRevealed;
  const activePlayer: 0 | 1 = mode === 'duo' && question ? turnForQuestion(index) : 0;

  // Scores and streaks over completed questions only.
  const completed = revealed ? index + 1 : index;
  const humanScore = scoreAnswers(answers.slice(0, completed), questions.slice(0, completed));
  const botScore = scoreAnswers(botAnswers.slice(0, completed), questions.slice(0, completed));
  const duoScores: [number, number] = [0, 0];
  const duoStreaks: [number, number] = [0, 0];
  if (mode === 'duo') {
    for (const p of [0, 1] as const) {
      const qs: QuizRoundQuestion[] = [];
      const picks: (number | null)[] = [];
      for (let i = 0; i < completed; i++) {
        if (turnForQuestion(i) === p) {
          qs.push(questions[i]!);
          picks.push(answers[i] ?? null);
        }
      }
      const s = scoreAnswers(picks, qs);
      duoScores[p] = s.score;
      duoStreaks[p] = s.currentStreak;
    }
  }
  const scores: [number, number] = mode === 'solo' ? [humanScore.score, botScore.score] : duoScores;
  const streaks: [number, number] =
    mode === 'solo' ? [humanScore.currentStreak, botScore.currentStreak] : duoStreaks;
  const winner = finished ? quizWinner(scores) : null;

  // Record a solo human win once (a bot win is never recorded).
  useEffect(() => {
    if (!finished || winner === null || mode !== 'solo' || recordedRef.current) return;
    recordedRef.current = true;
    if (winner !== 0) return;
    const wrong = questions.length - scores[0];
    const { map } = recordWin(progress, GAME_ID, level, 0, wrong);
    setProgress(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, winner, mode]);

  const onPick = (pick: number) => {
    if (!question || answered) return;
    const next = [...answers];
    next[index] = pick;
    setAnswers(next);
    if (mode === 'solo') {
      setBotThinking(true);
      const delay = botDelayForLevel(level);
      const q = question;
      const seed = seedStr;
      const qi = index;
      setTimeout(() => {
        const botPick = botAnswer(q, level, rngFromSeed(`bot|${seed}|${qi}`));
        setBotAnswers((prev) => {
          const copy = [...prev];
          copy[qi] = botPick;
          return copy;
        });
        setBotThinking(false);
      }, delay);
    }
  };

  const onNext = () => {
    if (!question || !revealed) return;
    if (index + 1 >= questions.length) {
      setFinished(true);
      return;
    }
    setIndex(index + 1);
  };

  const levelControls = (
    <div className="mt-4 flex items-center gap-2">
      <button
        type="button"
        className="btn min-h-[48px] min-w-[48px] !px-3 !py-2"
        disabled={level <= 1}
        onClick={() => changeLevel(level - 1)}
        aria-label="Previous level"
      >
        <ChevronLeft size={18} aria-hidden />
      </button>
      <span className="chip">
        Level {level} · {tierName(level)}
      </span>
      <button
        type="button"
        className="btn min-h-[48px] min-w-[48px] !px-3 !py-2"
        disabled={level >= unlocked}
        onClick={() => changeLevel(level + 1)}
        aria-label="Next level"
      >
        <ChevronRight size={18} aria-hidden />
      </button>
      {mode !== null && (
        <button type="button" className="btn min-h-[48px] !px-3 !py-2" onClick={restart}>
          <RotateCcw size={16} aria-hidden /> Restart
        </button>
      )}
    </div>
  );

  if (mode === null) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 pb-16">
        <div className="mt-2">
          <Link href="/" className="btn min-h-[48px] !px-3 !py-2 text-sm">
            <ArrowLeft size={16} aria-hidden /> Home
          </Link>
        </div>
        <h1 className="mt-4 text-3xl font-bold">GK Quiz</h1>
        <p className="mt-1 text-sm text-[var(--ink-dim)]">
          Original general-knowledge questions — science, geography, history,
          sports, and everyday life. Four options, one correct answer, no
          timer, and a streak to protect.
        </p>
        {levelControls}
        <section className="card mt-4 p-5 text-center">
          <p className="font-semibold">How do you want to play?</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button type="button" className="btn btn-primary min-h-[48px]" onClick={() => startGame('solo', level, round)}>
              Solo vs Cosy Bot
            </button>
            <button type="button" className="btn btn-primary min-h-[48px]" onClick={() => startGame('duo', level, round)}>
              Two players, one device
            </button>
          </div>
          <p className="mt-3 text-sm text-[var(--ink-dim)]">
            {generateQuiz('preview', level).length} questions at this level ·
            solo: outscore Cosy Bot · two players: alternate questions, most
            correct answers wins.
          </p>
        </section>
      </main>
    );
  }

  if (!question) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 pb-16">
        <p className="mt-4 text-[var(--ink-dim)]">Writing your questions…</p>
      </main>
    );
  }

  const picked = answers[index] ?? null;
  const botPicked = botAnswers[index] ?? null;
  const pickCorrect = picked !== null && picked === question.correctIndex;
  const botCorrect = botPicked !== null && botPicked === question.correctIndex;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16">
      <div className="mt-2 flex items-center justify-between gap-2">
        <Link href="/" className="btn min-h-[48px] !px-3 !py-2 text-sm">
          <ArrowLeft size={16} aria-hidden /> Home
        </Link>
        <span className="chip">{mode === 'solo' ? 'Solo vs Cosy Bot' : 'Two players'}</span>
      </div>
      <h1 className="mt-4 text-3xl font-bold">GK Quiz</h1>
      <p className="mt-1 text-sm text-[var(--ink-dim)]">
        {mode === 'solo'
          ? 'Answer the same questions as Cosy Bot — outscore it to win the round. No timer — take as long as you like.'
          : 'Pass the device when the banner changes — each question belongs to one player. No timer.'}
      </p>
      {levelControls}

      {/* Turn banner — in duo mode this is the pass-and-play handoff. */}
      <section
        className="card mt-4 p-4 text-center"
        style={{ borderColor: finished ? undefined : PLAYER_COLOURS[mode === 'duo' ? activePlayer : 0] }}
      >
        <p
          className="text-lg font-bold"
          style={{ color: finished ? undefined : PLAYER_COLOURS[mode === 'duo' ? activePlayer : 0] }}
        >
          {finished
            ? winner === null
              ? 'A perfect tie!'
              : `${playerLabel(mode, winner)} wins the round!`
            : mode === 'solo' && botThinking
              ? 'Cosy Bot is thinking…'
              : mode === 'duo'
                ? `${playerLabel(mode, activePlayer)} — your turn`
                : 'Your turn'}
        </p>
        <p className="text-sm text-[var(--ink-dim)]">
          {finished
            ? `${playerLabel(mode, 0)} ${scores[0]} · ${playerLabel(mode, 1)} ${scores[1]}`
            : mode === 'duo' && !answered
              ? 'Pass the device to the player above, then answer.'
              : `Question ${index + 1} of ${questions.length}`}
        </p>
      </section>

      {/* Score + streak panels */}
      <section className="mt-4 grid grid-cols-2 gap-2">
        {([0, 1] as const).map((p) => (
          <div
            key={p}
            className="card p-3"
            style={{
              borderColor:
                !finished && ((mode === 'duo' && activePlayer === p) || (mode === 'solo' && p === 0))
                  ? PLAYER_COLOURS[p]
                  : undefined,
            }}
          >
            <p className="font-bold" style={{ color: PLAYER_COLOURS[p] }}>
              {playerLabel(mode, p)}
            </p>
            <p className="text-lg font-bold">
              {scores[p]} correct
            </p>
            <p className="text-sm text-[var(--ink-dim)]">
              Streak: {streaks[p]} in a row
            </p>
          </div>
        ))}
      </section>

      {!finished && (
        <section className="card mt-4 p-4 sm:p-5">
          <div
            className="h-2 overflow-hidden rounded-full"
            style={{ background: 'var(--line)' }}
            role="progressbar"
            aria-valuenow={index + 1}
            aria-valuemin={1}
            aria-valuemax={questions.length}
            aria-label={`Question ${index + 1} of ${questions.length}`}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${((index + 1) / questions.length) * 100}%`, background: 'var(--accent)' }}
            />
          </div>
          <p className="mt-3 text-sm text-[var(--ink-dim)]">
            Question {index + 1} of {questions.length} · {QUIZ_CATEGORY_LABELS[question.category]}
          </p>
          <p className="mt-1 text-lg font-bold sm:text-xl">{question.question}</p>

          <div className="mt-4 space-y-2">
            {question.options.map((option, i) => {
              const isPicked = picked === i;
              const isCorrect = i === question.correctIndex;
              const isBotPick = botPicked === i;
              return (
                <button
                  key={option}
                  type="button"
                  className="btn min-h-[48px] w-full justify-start !px-4 !py-3 text-left text-base"
                  style={{
                    borderColor: revealed && isCorrect ? 'var(--good)' : revealed && isPicked ? 'var(--bad)' : undefined,
                    background: revealed && isCorrect ? 'color-mix(in srgb, var(--good) 12%, transparent)' : undefined,
                    opacity: revealed && !isCorrect && !isPicked ? 0.7 : 1,
                  }}
                  disabled={answered || botThinking}
                  onClick={() => onPick(i)}
                  aria-label={`Answer: ${option}`}
                >
                  <span className="font-bold">{String.fromCharCode(65 + i)}.</span>
                  <span className="ml-2">{option}</span>
                  {revealed && isPicked && (
                    <span className="ml-auto font-bold">{isCorrect ? '✓ Yours' : '✗ Yours'}</span>
                  )}
                  {revealed && isCorrect && !isPicked && (
                    <span className="ml-auto font-bold">✓ Correct answer</span>
                  )}
                  {revealed && mode === 'solo' && isBotPick && !isPicked && (
                    <span className="ml-auto font-bold">Cosy Bot</span>
                  )}
                </button>
              );
            })}
          </div>

          {mode === 'solo' && botThinking && (
            <p className="mt-3 text-sm text-[var(--ink-dim)]">
              Cosy Bot is choosing… your answer is locked in.
            </p>
          )}

          {revealed && (
            <div className="mt-4">
              <p className="font-bold">
                {pickCorrect
                  ? '✓ Correct — nicely answered.'
                  : `✗ Not quite — the answer was ${question.options[question.correctIndex]}.`}
              </p>
              {mode === 'solo' && (
                <p className="mt-1 text-sm text-[var(--ink-dim)]">
                  Cosy Bot picked {botPicked !== null ? question.options[botPicked] : 'nothing'} —{' '}
                  {botCorrect ? 'it got this one right.' : 'it missed this one.'}
                </p>
              )}
              <button type="button" className="btn btn-primary min-h-[48px] mt-3" onClick={onNext}>
                {index + 1 >= questions.length ? 'See the result' : 'Next question'}
              </button>
            </div>
          )}
        </section>
      )}

      {finished && (
        <section className="card mt-4 p-5 text-center">
          <p className="font-display text-2xl font-bold">
            {winner === null
              ? 'A perfect tie.'
              : mode === 'solo' && winner === 0
                ? 'You outscored Cosy Bot!'
                : mode === 'solo'
                  ? 'Cosy Bot takes this round.'
                  : `${playerLabel(mode, winner)} wins!`}
          </p>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            {playerLabel(mode, 0)} {scores[0]} correct · {playerLabel(mode, 1)} {scores[1]} correct
            {mode === 'solo' && winner === 0 ? ' — the next level is unlocked.' : ''}
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button type="button" className="btn btn-primary min-h-[48px]" onClick={restart}>
              Play again
            </button>
            <button
              type="button"
              className="btn min-h-[48px]"
              onClick={() => {
                setMode(null);
                setQuestions([]);
              }}
            >
              <Home size={16} aria-hidden /> Change mode
            </button>
            <Link href="/" className="btn min-h-[48px]">Home</Link>
          </div>
        </section>
      )}
    </main>
  );
}
