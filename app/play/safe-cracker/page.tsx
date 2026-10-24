'use client';

/**
 * Safe Cracker, solo vs the bot (Duo Corner).
 * One secret code. Every guess comes back marked: how many digits are
 * right, and how many of those are in the right place. Fewest guesses
 * wins the round — the bot is solving the same code beside you.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Delete, Lightbulb, RotateCcw } from 'lucide-react';
import {
  allCandidates,
  botGuess,
  botOpener,
  filterCandidates,
  generateCode,
  isCracked,
  markGuess,
  paramsForLevel,
  type GuessRecord,
  type SafeParams,
} from '@/lib/generators/safeCracker';
import { levelSeed } from '@/lib/generators/rng';
import {
  getGameProgress,
  loadLocalProgress,
  recordWin,
  type ProgressMap,
} from '@/lib/progress';
import { useTheme } from '@/components/ThemeProvider';
import { PlayHeader, WinPanel } from '@/components/duo/PlayBits';

const GAME_ID = 'safe-cracker';

function parForLevel(level: number): number {
  if (level <= 10) return 6;
  if (level <= 30) return 6;
  if (level <= 60) return 7;
  return 8;
}

interface SoloState {
  secret: number[];
  guesses: GuessRecord[];
  current: number[];
  botGuesses: GuessRecord[];
  botCandidates: number[][];
  hintedDigits: number[];
  hints: number;
}

export default function SafeCrackerPage() {
  const { userId } = useTheme();
  const salt = userId ?? 'guest';
  const [progress, setProgress] = useState<ProgressMap>({});
  const [level, setLevel] = useState(1);
  const [state, setState] = useState<SoloState | null>(null);
  const [won, setWon] = useState<number | null>(null);
  const [botWon, setBotWon] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const loadedFor = useRef('');

  const myProgress = getGameProgress(progress, GAME_ID);
  const unlocked = Math.max(myProgress.currentLevel, 1);
  const params: SafeParams = useMemo(() => paramsForLevel(level), [level]);
  const par = parForLevel(level);

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
    setBotWon(false);
    setMsg(null);
    try {
      const raw = localStorage.getItem(`dd-v2-safe-${tag}`);
      if (raw) {
        const parsed = JSON.parse(raw) as SoloState;
        if (parsed.secret && parsed.secret.length === params.digits) {
          setState(parsed);
          return;
        }
      }
    } catch {
      /* ignore */
    }
    setState({
      secret: generateCode(levelSeed(GAME_ID, level, salt), level),
      guesses: [],
      current: [],
      botGuesses: [],
      botCandidates: allCandidates(params),
      hintedDigits: [],
      hints: 0,
    });
  }, [level, salt, params]);

  useEffect(() => {
    if (!state || loadedFor.current !== `${salt}|${level}`) return;
    try {
      localStorage.setItem(`dd-v2-safe-${salt}|${level}`, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, level, salt]);

  const playerCracked = state?.guesses.some((g) => isCracked(g.guess, state.secret)) ?? false;
  const botCracked = state?.botGuesses.some((g) => isCracked(g.guess, state.secret)) ?? false;

  const submitGuess = () => {
    if (!state || won !== null || botWon || playerCracked || botCracked) return;
    if (state.current.length !== params.digits) return;
    if (!params.repeats && new Set(state.current).size !== state.current.length) {
      setMsg('Easy codes never repeat a digit. Swap one out.');
      return;
    }
    const guess = [...state.current];
    const mark = markGuess(guess, state.secret);
    const guesses = [...state.guesses, { guess, mark }];
    if (isCracked(guess, state.secret)) {
      const mistakes = Math.max(0, guesses.length - par);
      const { map, stars } = recordWin(progress, GAME_ID, level, state.hints, mistakes);
      setProgress(map);
      setWon(stars);
      setState({ ...state, guesses, current: [] });
      try {
        localStorage.removeItem(`dd-v2-safe-${salt}|${level}`);
      } catch {
        /* ignore */
      }
      return;
    }
    // The bot takes its turn on the same code.
    let botCands = state.botCandidates;
    let botGuessMade: GuessRecord;
    if (state.botGuesses.length === 0) {
      const g = botOpener(params);
      botGuessMade = { guess: g, mark: markGuess(g, state.secret) };
    } else {
      const g = botGuess(params, botCands, level, Math.random);
      botGuessMade = { guess: g, mark: markGuess(g, state.secret) };
    }
    botCands = filterCandidates(botCands, botGuessMade.guess, botGuessMade.mark);
    const botGuesses = [...state.botGuesses, botGuessMade];
    const ns: SoloState = {
      ...state,
      guesses,
      current: [],
      botGuesses,
      botCandidates: botCands,
    };
    setState(ns);
    if (isCracked(botGuessMade.guess, state.secret)) {
      setBotWon(true);
      setMsg(`The bot cracked it in ${botGuesses.length} guesses.`);
    } else {
      setMsg(
        mark.rightPlace === 0 && mark.rightDigit === 0
          ? 'None of those digits are in the code. That rules out a lot.'
          : `${mark.rightPlace} in the right place, ${mark.rightDigit} right digit, wrong place.`,
      );
    }
  };

  const useHint = () => {
    if (!state || won !== null || botWon) return;
    const pool = Array.from({ length: params.pool }, (_, i) => i).filter(
      (d) => !state.hintedDigits.includes(d),
    );
    if (!pool.length) return;
    const d = pool[Math.floor(Math.random() * pool.length)];
    const inCode = state.secret.includes(d);
    setState({ ...state, hintedDigits: [...state.hintedDigits, d], hints: state.hints + 1 });
    setMsg(inCode ? `${d} is in the code somewhere.` : `${d} is not in the code at all.`);
  };

  const restart = () => {
    setState({
      secret: generateCode(levelSeed(GAME_ID, level, `${salt}|${Date.now()}`), level),
      guesses: [],
      current: [],
      botGuesses: [],
      botCandidates: allCandidates(params),
      hintedDigits: [],
      hints: 0,
    });
    setWon(null);
    setBotWon(false);
    setMsg(null);
    try {
      localStorage.removeItem(`dd-v2-safe-${salt}|${level}`);
    } catch {
      /* ignore */
    }
  };

  if (!state) {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-md items-center justify-center px-4">
        <p className="text-[var(--ink-dim)]">Setting the safe…</p>
      </main>
    );
  }

  const renderRow = (g: GuessRecord, key: string) => (
    <div key={key} className="panel flex items-center justify-between gap-2 p-3">
      <span className="flex gap-1.5">
        {g.guess.map((d, i) => (
          <span key={i} className="chip !px-3 !py-1.5 text-base font-bold">
            {d}
          </span>
        ))}
      </span>
      <span className="text-sm text-[var(--ink-dim)]">
        {g.mark.rightPlace} right place · {g.mark.rightDigit} right digit
      </span>
    </div>
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16">
      <PlayHeader
        title="Safe Cracker"
        intro={`One secret ${params.digits}-digit code${params.repeats ? ' (digits may repeat)' : ' (no digit repeats)'}. Fewest guesses wins — the bot is solving the same code beside you.`}
        level={level}
        unlocked={unlocked}
        onLevel={setLevel}
        bestStars={myProgress.stars[String(level)] ?? 0}
      />

      <section className="card mt-4 p-4">
        <p className="text-sm font-semibold">Your guesses</p>
        <div className="mt-2 space-y-2">
          {state.guesses.length === 0 && (
            <p className="text-sm text-[var(--ink-dim)]">No guesses yet. Pick {params.digits} digits.</p>
          )}
          {state.guesses.map((g, i) => renderRow(g, `y-${i}`))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {state.current.map((d, i) => (
            <span key={i} className="chip !px-3 !py-1.5 text-base font-bold">
              {d}
            </span>
          ))}
          {Array.from({ length: params.digits - state.current.length }, (_, i) => (
            <span key={`e-${i}`} className="chip !px-3 !py-1.5 text-base opacity-40">
              ·
            </span>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {Array.from({ length: params.pool }, (_, d) => (
            <button
              key={d}
              type="button"
              className="btn !px-3.5 !py-2 text-base font-bold"
              disabled={state.current.length >= params.digits || won !== null || botWon}
              onClick={() => setState({ ...state, current: [...state.current, d] })}
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            className="btn !px-3 !py-2"
            onClick={() => setState({ ...state, current: state.current.slice(0, -1) })}
            aria-label="Delete last digit"
          >
            <Delete size={18} aria-hidden />
          </button>
          <button
            type="button"
            className="btn btn-primary !px-4 !py-2"
            disabled={state.current.length !== params.digits || won !== null || botWon}
            onClick={submitGuess}
          >
            Guess
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn" onClick={useHint} disabled={won !== null || botWon}>
            <Lightbulb size={18} aria-hidden /> Hint (free)
          </button>
          <button type="button" className="btn" onClick={restart}>
            <RotateCcw size={18} aria-hidden /> New code
          </button>
        </div>
        {msg && <p className="mt-2 text-sm font-semibold">{msg}</p>}
        <p className="mt-1 text-sm text-[var(--ink-dim)]">
          Hints used: {state.hints} · Your guesses: {state.guesses.length} · Bot guesses:{' '}
          {state.botGuesses.length}
        </p>
      </section>

      {state.botGuesses.length > 0 && (
        <section className="mt-5">
          <h2 className="text-lg font-bold">The bot’s guesses</h2>
          <div className="mt-2 space-y-2">
            {state.botGuesses.map((g, i) => renderRow(g, `b-${i}`))}
          </div>
        </section>
      )}

      {won !== null && (
        <WinPanel
          stars={won}
          line={`Cracked in ${state.guesses.length} guesses (the bot needed ${state.botGuesses.length}). The next code is longer or trickier.`}
          onNext={() => setLevel(level + 1)}
        />
      )}
      {botWon && (
        <section className="card mt-4 p-5 text-center">
          <p className="font-display text-2xl font-bold">The bot cracked it first.</p>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            The code was {state.secret.join('')}. No harm done — the level stays open, and
            watching the bot’s guesses teaches the elimination trick.
          </p>
          <div className="mt-3 flex justify-center gap-2">
            <button type="button" className="btn btn-primary" onClick={restart}>
              Try another code
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
