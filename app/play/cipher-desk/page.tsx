'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, KeyRound, Lightbulb, RotateCcw, Star } from 'lucide-react';
import {
  generateLevelPuzzle,
  type CipherPuzzle,
} from '@/lib/generators/cipherDesk';
import {
  getGameProgress,
  loadLocalProgress,
  recordWin,
  type ProgressMap,
} from '@/lib/progress';
import { useTheme } from '@/components/ThemeProvider';
import StickyActionBar from '@/components/StickyActionBar';
import BotRaceBar, { useBotRace } from '@/components/BotRaceBar';
import { cipherProgress } from '@/lib/together/versus';

const GAME_ID = 'cipher-desk';

interface PlayState {
  /** Letter-position index (into plaintext) -> typed uppercase letter. */
  letters: Record<string, string>;
  revealed: number[];
  hints: number;
  mistakes: number;
  countedWrong: number[];
}

const freshState = (): PlayState => ({
  letters: {},
  revealed: [],
  hints: 0,
  mistakes: 0,
  countedWrong: [],
});

const isLetterPos = (ch: string) => /[A-Za-z]/.test(ch);

export default function CipherDeskPage() {
  const { userId } = useTheme();
  const salt = userId ?? 'guest';
  const [progress, setProgress] = useState<ProgressMap>({});
  const [level, setLevel] = useState(1);
  const [state, setState] = useState<PlayState>(freshState());
  const [won, setWon] = useState<number | null>(null);
  const [raceBot, setRaceBot] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const countedRef = useRef<Set<number>>(new Set());
  const loadedFor = useRef<string>('');

  const myProgress = getGameProgress(progress, GAME_ID);
  const unlocked = Math.max(myProgress.currentLevel, 1);

  useEffect(() => {
    const map = loadLocalProgress();
    setProgress(map);
    setLevel(getGameProgress(map, GAME_ID).currentLevel);
  }, []);

  const puzzle: CipherPuzzle = useMemo(
    () => generateLevelPuzzle(level, salt),
    [level, salt],
  );

  const bot = useBotRace(raceBot && won === null, level, `${GAME_ID}|${level}|${salt}`);
  const botWon = raceBot && bot.botFinished && won === null;

  useEffect(() => {
    const tag = `${salt}|${level}`;
    if (loadedFor.current === tag) return;
    loadedFor.current = tag;
    setWon(null);
    setMsg(null);
    countedRef.current = new Set();
    try {
      const raw = localStorage.getItem(`dd-v2-cipher-${tag}`);
      if (raw) {
        const parsed = JSON.parse(raw) as PlayState;
        setState(parsed);
        countedRef.current = new Set(parsed.countedWrong ?? []);
        return;
      }
    } catch {
      /* ignore */
    }
    setState(freshState());
  }, [level, salt]);

  useEffect(() => {
    if (loadedFor.current !== `${salt}|${level}`) return;
    try {
      localStorage.setItem(
        `dd-v2-cipher-${salt}|${level}`,
        JSON.stringify({ ...state, countedWrong: [...countedRef.current] }),
      );
    } catch {
      /* ignore */
    }
  }, [state, level, salt]);

  const letterPositions = useMemo(
    () =>
      puzzle.plaintext
        .split('')
        .map((ch, i) => (isLetterPos(ch) ? i : -1))
        .filter((i) => i >= 0),
    [puzzle],
  );

  const isComplete = (letters: Record<string, string>) =>
    letterPositions.every(
      (i) => (letters[String(i)] ?? '').toUpperCase() === puzzle.plaintext[i].toUpperCase(),
    );

  const finishIfWon = (letters: Record<string, string>, s: PlayState) => {
    if (won !== null || botWon) return;
    if (letterPositions.length > 0 && isComplete(letters)) {
      const { map, stars } = recordWin(progress, GAME_ID, level, s.hints, s.mistakes);
      setProgress(map);
      setWon(stars);
      try {
        localStorage.removeItem(`dd-v2-cipher-${salt}|${level}`);
      } catch {
        /* ignore */
      }
    }
  };

  /** The input holds the decoded message; letters map onto letter slots in order. */
  const onType = (value: string) => {
    if (won !== null || botWon) return;
    const typed = value.toUpperCase().replace(/[^A-Z]/g, '');
    const letters: Record<string, string> = {};
    letterPositions.forEach((pos, idx) => {
      if (idx < typed.length) letters[String(pos)] = typed[idx];
    });
    // Keep hint-revealed letters even if the input is shortened past them.
    for (const pos of state.revealed) {
      letters[String(pos)] = puzzle.plaintext[pos].toUpperCase();
    }
    const ns = { ...state, letters };
    setState(ns);
    setTimeout(() => finishIfWon(letters, ns), 0);
  };

  const inputValue = letterPositions
    .map((pos) => state.letters[String(pos)] ?? '')
    .join('');

  const useHint = () => {
    if (won !== null || botWon) return;
    const options = letterPositions.filter(
      (pos) => (state.letters[String(pos)] ?? '').toUpperCase() !== puzzle.plaintext[pos].toUpperCase(),
    );
    if (!options.length) return;
    const pos = options[Math.floor(Math.random() * options.length)];
    const letters = { ...state.letters, [String(pos)]: puzzle.plaintext[pos].toUpperCase() };
    const ns = { ...state, letters, revealed: [...state.revealed, pos], hints: state.hints + 1 };
    setState(ns);
    setMsg('One letter filled in for you. Hints are always free.');
    setTimeout(() => finishIfWon(letters, ns), 0);
  };

  const doCheck = () => {
    if (won !== null || botWon) return;
    const wrong = letterPositions.filter((pos) => {
      const typed = state.letters[String(pos)];
      return typed !== undefined && typed.toUpperCase() !== puzzle.plaintext[pos].toUpperCase();
    });
    const fresh = wrong.filter((pos) => !countedRef.current.has(pos));
    fresh.forEach((pos) => countedRef.current.add(pos));
    if (fresh.length) {
      setState((s) => ({ ...s, mistakes: s.mistakes + fresh.length }));
    }
    if (wrong.length === 0 && letterPositions.some((pos) => !state.letters[String(pos)])) {
      setMsg('Every letter so far is right. Keep going.');
    } else if (wrong.length === 0) {
      setMsg('That reads perfectly. Nicely decoded.');
    } else {
      setMsg(
        wrong.length === 1
          ? 'One letter to rethink. It is marked below.'
          : `${wrong.length} letters to rethink. They are marked below.`,
      );
    }
  };

  const restart = () => {
    setState(freshState());
    countedRef.current = new Set();
    setWon(null);
    setMsg(null);
    try {
      localStorage.removeItem(`dd-v2-cipher-${salt}|${level}`);
    } catch {
      /* ignore */
    }
  };

  const levelStars = myProgress.stars[String(level)] ?? 0;

  const playerPct = cipherProgress(puzzle.plaintext, inputValue);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16">
      <div className="mt-2 flex items-center justify-between gap-2">
        <Link href="/" className="btn !px-3 !py-2 text-sm">
          <ArrowLeft size={16} aria-hidden /> Games
        </Link>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="btn !px-2 !py-2"
            disabled={level <= 1}
            onClick={() => setLevel(level - 1)}
            aria-label="Previous level"
          >
            <ChevronLeft size={16} aria-hidden />
          </button>
          <span className="chip">
            Level {level} · {puzzle.tier}
          </span>
          <button
            type="button"
            className="btn !px-2 !py-2"
            disabled={level >= unlocked}
            onClick={() => setLevel(level + 1)}
            aria-label="Next level"
          >
            <ChevronRight size={16} aria-hidden />
          </button>
        </div>
      </div>

      <h1 className="mt-4 text-3xl font-bold">Cipher Desk</h1>
      <p className="mt-1 text-[var(--ink-dim)]">
        Decode the message. Type your answer and each letter checks itself as you go.
        Hints are free — they only affect stars.
      </p>
      {levelStars > 0 && (
        <p className="mt-2 flex items-center gap-1 text-sm font-semibold">
          <Star size={16} aria-hidden /> Best on this level: {'★'.repeat(levelStars)}
          {'☆'.repeat(3 - levelStars)}
        </p>
      )}

      <section className="paper mt-4 p-4 sm:p-5">
        <p className="flex items-center gap-2 text-sm font-bold">
          <KeyRound size={16} aria-hidden /> {puzzle.clue}
        </p>
        <p className="mt-3 break-words font-mono text-lg leading-relaxed sm:text-xl">
          {puzzle.ciphertext}
        </p>
        <p className="mt-3 text-sm opacity-70">
          Theme: {puzzle.theme}
          {puzzle.vigenereKeyLength !== null &&
            ` · Vigenère key length: ${puzzle.vigenereKeyLength}`}
          {puzzle.frequencyHints.length > 0 &&
            ` · Most common coded letters: ${puzzle.frequencyHints
              .map((h) => `${h.letter} (${h.count})`)
              .join(', ')}`}
        </p>
      </section>

      <section className="card mt-4 p-4 sm:p-5">
        <label htmlFor="cipher-answer" className="font-display text-lg font-bold">
          Your decoded message
        </label>
        <input
          id="cipher-answer"
          className="input mt-2 font-mono"
          value={inputValue}
          onChange={(e) => onType(e.target.value)}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="Type the decoded message here"
          aria-label="Decoded message"
        />
        <p className="mt-3 flex flex-wrap gap-x-0.5 gap-y-1 break-words font-mono text-lg leading-relaxed" aria-hidden>
          {puzzle.plaintext.split('').map((ch, i) => {
            if (!isLetterPos(ch)) {
              return (
                <span key={i} className="inline-block px-0.5 opacity-70">
                  {ch === ' ' ? '\u00A0' : ch}
                </span>
              );
            }
            const typed = state.letters[String(i)];
            const correct = typed !== undefined && typed.toUpperCase() === ch.toUpperCase();
            const wrong = typed !== undefined && !correct;
            return (
              <span
                key={i}
                className="inline-block min-w-[1.1rem] border-b-2 px-0.5 text-center"
                style={{
                  borderColor: 'var(--line)',
                  color: correct
                    ? 'var(--good)'
                    : wrong
                      ? 'var(--bad)'
                      : 'var(--ink)',
                }}
              >
                {typed ?? '\u00A0'}
              </span>
            );
          })}
        </p>
      </section>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn" onClick={useHint}>
          <Lightbulb size={18} aria-hidden /> Hint (free)
        </button>
        <button type="button" className="btn btn-accent2" onClick={doCheck}>
          Check my answer
        </button>
        <button type="button" className="btn" onClick={restart}>
          <RotateCcw size={18} aria-hidden /> Start over
        </button>
      </div>
      {msg && <p className="mt-2 text-sm font-semibold">{msg}</p>}
      <p className="mt-1 text-sm text-[var(--ink-dim)]">
        Hints used: {state.hints} · Mistakes found: {state.mistakes}
      </p>
      <section className="mt-4">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={raceBot}
            onChange={(e) => setRaceBot(e.target.checked)}
          />
          Race the bot
        </label>
        {raceBot && (
          <div className="mt-2">
            <BotRaceBar playerPct={playerPct} botPct={bot.botPct} level={level} />
          </div>
        )}
        {botWon && (
          <p className="panel mt-2 p-4 text-sm">
            The bot finished first this time — no progress recorded. Start over to
            race again.
          </p>
        )}
      </section>


      {won !== null && (
        <section className="card mt-4 p-5 text-center">
          <p className="font-display text-2xl font-bold">Decoded.</p>
          <p className="mt-1 text-lg" aria-label={`${won} of 3 stars`}>
            {'★'.repeat(won)}
            <span className="opacity-40">{'★'.repeat(3 - won)}</span>
          </p>
          <p className="text-sm text-[var(--ink-dim)]">
            The message reads: “{puzzle.plaintext}”
          </p>
          <div className="mt-3 flex justify-center gap-2">
            <button type="button" className="btn btn-primary" onClick={() => setLevel(level + 1)}>
              Next level
            </button>
            <Link href="/" className="btn">Home</Link>
          </div>
        </section>
      )}
      <StickyActionBar
        status={msg ?? `Level ${level} · Hints used: ${state.hints}`}
        actions={
          won === null
            ? [
                { label: 'Check my answer', onClick: doCheck, primary: true },
                { label: 'Hint (free)', onClick: useHint },
              ]
            : []
        }
      />
    </main>
  );
}
