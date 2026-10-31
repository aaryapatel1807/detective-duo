'use client';

/**
 * Sketch the Clue, solo (Duo Corner).
 * Draw the word, then ask the toy guesser what it thinks it is. The
 * guesser only sees shapes, not art — it is often wrong, and that is
 * the joke. Together mode is the real game: one draws, the other guesses.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Eraser, Lightbulb, RotateCcw } from 'lucide-react';
import {
  CLASSIFIER_NOTE,
  classifyDrawing,
  normaliseGuess,
  pickWord,
  SKETCH_THEMES,
  type SketchTheme,
  type Stroke,
  type ToyGuess,
} from '@/lib/generators/sketchWords';
import { levelSeed } from '@/lib/generators/rng';
import {
  getGameProgress,
  loadLocalProgress,
  recordWin,
  type ProgressMap,
} from '@/lib/progress';
import { useTheme } from '@/components/ThemeProvider';
import { PlayHeader } from '@/components/duo/PlayBits';
import SketchCanvas from '@/components/duo/SketchCanvas';

const GAME_ID = 'sketch-clue';

export default function SketchCluePage() {
  const { userId } = useTheme();
  const salt = userId ?? 'guest';
  const [progress, setProgress] = useState<ProgressMap>({});
  const [level, setLevel] = useState(1);
  const [theme, setTheme] = useState<SketchTheme>('cozy');
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [guess, setGuess] = useState<ToyGuess | null>(null);
  const [won, setWon] = useState<number | null>(null);
  const loadedFor = useRef('');

  const myProgress = getGameProgress(progress, GAME_ID);
  const unlocked = Math.max(myProgress.currentLevel, 1);
  const word = useMemo(
    () => pickWord(levelSeed(GAME_ID, level, `${salt}|${theme}`), level, theme),
    [level, salt, theme],
  );

  useEffect(() => {
    const map = loadLocalProgress();
    setProgress(map);
    setLevel(getGameProgress(map, GAME_ID).currentLevel);
  }, []);

  useEffect(() => {
    const tag = `${salt}|${level}|${theme}`;
    if (loadedFor.current === tag) return;
    loadedFor.current = tag;
    setStrokes([]);
    setGuess(null);
    setWon(null);
    try {
      const raw = localStorage.getItem(`dd-v2-sketch-${tag}`);
      if (raw) setStrokes(JSON.parse(raw) as Stroke[]);
    } catch {
      /* ignore */
    }
  }, [level, salt, theme]);

  useEffect(() => {
    if (loadedFor.current !== `${salt}|${level}|${theme}`) return;
    try {
      localStorage.setItem(`dd-v2-sketch-${salt}|${level}|${theme}`, JSON.stringify(strokes));
    } catch {
      /* ignore */
    }
  }, [strokes, level, salt, theme]);

  const askGuesser = () => {
    if (won !== null || !strokes.length) return;
    const g = classifyDrawing(strokes, `${salt}|${level}|${theme}`, theme);
    setGuess(g);
    const right = normaliseGuess(g.guess) === normaliseGuess(word.word);
    const { map, stars } = recordWin(progress, GAME_ID, level, 0, right ? 0 : 2);
    setProgress(map);
    setWon(stars);
    try {
      localStorage.removeItem(`dd-v2-sketch-${salt}|${level}|${theme}`);
    } catch {
      /* ignore */
    }
  };

  const clear = () => {
    setStrokes([]);
    setGuess(null);
    setWon(null);
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16">
      <PlayHeader
        title="Sketch the Clue"
        intro="Draw the word below. Then ask the toy guesser what it thinks it is — it only sees shapes, so expect surprises."
        level={level}
        unlocked={unlocked}
        onLevel={setLevel}
        bestStars={myProgress.stars[String(level)] ?? 0}
      />

      <section className="card mt-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">Theme:</span>
          {SKETCH_THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`chip ${theme === t.id ? '!bg-[var(--accent)] !text-[var(--accent-ink)]' : ''}`}
              onClick={() => setTheme(t.id)}
              aria-pressed={theme === t.id}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-lg">
          Draw: <span className="font-display text-xl font-bold">{word.word}</span>
          <span className="ml-2 text-sm text-[var(--ink-dim)]">{word.hint}</span>
        </p>
        <div className="mt-3">
          <SketchCanvas
            strokes={strokes}
            onStrokeEnd={(s) => setStrokes((prev) => [...prev, s])}
            disabled={won !== null}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={askGuesser} disabled={!strokes.length || won !== null}>
            <Lightbulb size={18} aria-hidden /> Ask the guesser
          </button>
          <button type="button" className="btn" onClick={() => setStrokes(strokes.slice(0, -1))} disabled={!strokes.length || won !== null}>
            <Eraser size={18} aria-hidden /> Undo stroke
          </button>
          <button type="button" className="btn" onClick={clear}>
            <RotateCcw size={18} aria-hidden /> Clear
          </button>
        </div>
        {guess && (
          <div className="panel mt-4 p-4">
            <p className="font-display text-lg font-bold">
              The guesser says: {guess.guess}
            </p>
            {guess.secondGuess && normaliseGuess(guess.guess) !== normaliseGuess(word.word) && (
              <p className="mt-1 text-sm text-[var(--ink-dim)]">
                Also possible: {guess.secondGuess} (a hint only — it does not count as a win).
              </p>
            )}
            <p className="mt-1 text-sm text-[var(--ink-dim)]">{guess.note}</p>
            <p className="mt-1 text-sm">
              {normaliseGuess(guess.guess) === normaliseGuess(word.word)
                ? 'It got it! Either a great drawing or a lucky guess.'
                : `The word was ${word.word}. Close in spirit, maybe.`}
            </p>
            <p className="mt-1 text-sm text-[var(--ink-dim)]">{CLASSIFIER_NOTE}</p>
          </div>
        )}
        {won !== null && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={() => setLevel(level + 1)}>
              Next word
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
