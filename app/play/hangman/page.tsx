'use client';

/**
 * Hangman, Duo Corner — replaces The Bridge.
 * Guess the hidden word one letter at a time: a correct letter fills
 * every matching spot, a wrong letter costs one of 6 lives. Win by
 * completing the word, lose when the lives run out. A free hint reveals
 * one unrevealed letter and never costs a life. Solo plays a seeded
 * word per level (words get longer as levels climb); two-player is
 * pass-and-play on one device, either with a seeded word or with a
 * word Player 1 sets for their partner. No timers, no animation that
 * needs reduced-motion handling — nothing here moves on its own.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Eye, EyeOff, Home, Lightbulb, RotateCcw } from 'lucide-react';
import SoloQuickShell from '@/components/quickgames/SoloQuickShell';
import {
  MAX_LIVES,
  createCustomHangmanGame,
  createHangmanGame,
  createHangmanWord,
  generateAnyHangman,
  guessLetter,
  maskedWord,
  parseCustomWord,
  revealHint,
  wrongGuesses,
  type HangmanState,
} from '@/lib/generators/hangman';

const GAME_ID = 'hangman';
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

type Mode = 'solo' | 'duo';
type DuoStep = 'choose' | 'set' | 'handoff' | 'play';

function Lives({ lives }: { lives: number }) {
  return (
    <span className="flex items-center gap-1" aria-label={`${lives} of ${MAX_LIVES} lives left`}>
      {Array.from({ length: MAX_LIVES }, (_, i) => (
        <span
          key={i}
          aria-hidden
          style={{
            display: 'inline-block',
            width: 12,
            height: 12,
            borderRadius: 999,
            background: i < lives ? 'var(--accent)' : 'var(--line)',
            opacity: i < lives ? 1 : 0.5,
          }}
        />
      ))}
      <span className="ml-1 text-sm font-semibold">
        {lives} {lives === 1 ? 'life' : 'lives'} left
      </span>
    </span>
  );
}

function HangmanBoard({
  state,
  disabled,
  onGuess,
  onHint,
  turnLabel,
}: {
  state: HangmanState;
  disabled: boolean;
  onGuess: (letter: string) => void;
  onHint: () => void;
  turnLabel: string;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const finished = state.status !== 'playing';
  const masked = maskedWord(state);
  const wrong = wrongGuesses(state);

  const handleGuess = (letter: string) => {
    setMsg(
      state.word.includes(letter)
        ? `✓ Nice — ${letter.toUpperCase()} is in the word.`
        : `✗ No ${letter.toUpperCase()} this time — one life lost.`,
    );
    onGuess(letter);
  };

  const handleHint = () => {
    setMsg('💡 Hint used — a letter was revealed, free, no life lost.');
    onHint();
  };

  return (
    <section className="card p-4 sm:p-5">
      <div className="text-center">
        <p className="text-lg font-bold" aria-live="polite">
          {finished
            ? state.status === 'won'
              ? `✓ You got it — the word was ${state.word.toUpperCase()}!`
              : `✗ Out of lives — the word was ${state.word.toUpperCase()}.`
            : turnLabel}
        </p>
        <p className="mt-1 text-sm text-[var(--ink-dim)]">
          {masked.filter((ch) => ch !== '_').length} of {state.word.length} letters revealed ·{' '}
          {state.lives} {state.lives === 1 ? 'life' : 'lives'} left
        </p>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="chip">Category: {state.category}</span>
        <Lives lives={state.lives} />
      </div>

      <div
        className="mt-4 flex flex-wrap justify-center gap-1.5 sm:gap-2"
        role="img"
        aria-label={`Word: ${masked.join(' ')}`}
      >
        {masked.map((ch, i) => (
          <span
            key={i}
            className="flex h-12 w-9 items-center justify-center rounded-lg border text-2xl font-bold uppercase sm:h-14 sm:w-11"
            style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
          >
            {ch === '_' ? '' : ch}
          </span>
        ))}
      </div>
      <p className="mt-2 text-center text-sm text-[var(--ink-dim)]">
        {state.word.length} letters
        {wrong.length > 0 ? ` · Wrong guesses: ${wrong.join(', ').toUpperCase()}` : ' · No wrong guesses yet'}
        {state.hintsUsed > 0 ? ` · ${state.hintsUsed} free ${state.hintsUsed === 1 ? 'hint' : 'hints'} used` : ''}
      </p>

      {msg && !finished && (
        <p className="mt-3 text-center text-sm font-semibold" aria-live="polite">
          {msg}
        </p>
      )}

      <div
        className="mt-4 grid gap-2"
        style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
        aria-label="Letter keyboard"
      >
        {LETTERS.map((letter) => {
          const guessed = state.guessed.includes(letter);
          const isWrong = guessed && !state.word.includes(letter);
          return (
            <button
              key={letter}
              type="button"
              className="btn min-h-[48px] !px-1 !py-3 text-base font-bold uppercase"
              style={
                guessed
                  ? isWrong
                    ? { opacity: 0.45, textDecoration: 'line-through' }
                    : { background: 'var(--accent)', color: 'var(--accent-ink)' }
                  : undefined
              }
              disabled={guessed || disabled || finished}
              onClick={() => handleGuess(letter)}
              aria-label={
                guessed
                  ? `Letter ${letter.toUpperCase()}, already guessed${isWrong ? ', wrong' : ', correct'}`
                  : `Guess letter ${letter.toUpperCase()}`
              }
            >
              {letter}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          className="btn min-h-[48px]"
          disabled={disabled || finished}
          onClick={handleHint}
        >
          <Lightbulb size={16} aria-hidden /> Free hint
        </button>
      </div>
    </section>
  );
}

function SoloBoard({
  level,
  seed,
  disabled,
  onFinish,
}: {
  level: number;
  seed: string;
  disabled: boolean;
  onFinish: (won: boolean) => void;
}) {
  const [state, setState] = useState<HangmanState>(() => createHangmanGame(seed, level));

  useEffect(() => {
    if (state.status === 'won') onFinish(true);
    else if (state.status === 'lost') onFinish(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  return (
    <HangmanBoard
      state={state}
      disabled={disabled}
      turnLabel="Your turn" 
      onGuess={(letter) => setState((s) => guessLetter(s, letter))}
      onHint={() => setState((s) => revealHint(s))}
    />
  );
}

export default function HangmanPage() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [duoStep, setDuoStep] = useState<DuoStep>('choose');
  const [duoGame, setDuoGame] = useState<HangmanState | null>(null);
  const [customWord, setCustomWord] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  const startDuoSeeded = () => {
    setDuoGame(createHangmanWord(generateAnyHangman(`duo|${Date.now()}`)));
    setDuoStep('play');
  };

  const submitCustomWord = () => {
    const parsed = parseCustomWord(customWord);
    if (parsed === null) {
      setCustomError('Use letters only, 3–12 letters — no spaces, numbers, or symbols.');
      return;
    }
    const game = createCustomHangmanGame(parsed);
    if (game === null) {
      setCustomError('That word did not work — try another one.');
      return;
    }
    setCustomError(null);
    setDuoGame(game);
    setCustomWord('');
    setDuoStep('handoff');
  };

  const resetDuo = () => {
    setDuoStep('choose');
    setDuoGame(null);
    setCustomWord('');
    setCustomError(null);
  };

  const backToModes = () => {
    setMode(null);
    resetDuo();
  };

  if (mode === null) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 pb-16">
        <div className="mt-2">
          <Link href="/" className="btn min-h-[48px] !px-3 !py-2 text-sm">
            <ArrowLeft size={16} aria-hidden /> Games
          </Link>
        </div>
        <h1 className="mt-4 text-3xl font-bold">Hangman</h1>
        <p className="mt-1 text-[var(--ink-dim)]">
          Guess the hidden word one letter at a time. A correct letter fills
          every matching spot; a wrong letter costs one of 6 lives. Finish
          the word to win, or run out of lives and the word is revealed.
          Stuck? A free hint reveals a letter — no penalty.
        </p>
        <section className="card mt-4 p-5">
          <p className="font-semibold">How do you want to play?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary min-h-[48px]" onClick={() => setMode('solo')}>
              Solo
            </button>
            <button type="button" className="btn min-h-[48px]" onClick={() => setMode('duo')}>
              Two players, one device
            </button>
          </div>
          <p className="mt-3 text-sm text-[var(--ink-dim)]">
            Solo words get longer as levels climb: short everyday words at
            first, long ones at Expert. Two-player rounds are single rounds —
            no levels, no scores carried over.
          </p>
        </section>
      </main>
    );
  }

  if (mode === 'solo') {
    return (
      <SoloQuickShell
        gameId={GAME_ID}
        title="Hangman"
        blurb="Guess the hidden word one letter at a time — 6 lives, a free hint whenever you need one, and longer words as levels climb."
      >
        {({ level, seed, disabled, onFinish }) => (
          // SoloQuickShell remounts its children on level/replay, so
          // SoloBoard's state is fresh per round.
          <SoloBoard level={level} seed={seed} disabled={disabled} onFinish={onFinish} />
        )}
      </SoloQuickShell>
    );
  }

  // Two-player pass-and-play.
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16">
      <div className="mt-2 flex items-center justify-between gap-2">
        <Link href="/" className="btn min-h-[48px] !px-3 !py-2 text-sm">
          <ArrowLeft size={16} aria-hidden /> Games
        </Link>
        <span className="chip">Two players, one device</span>
      </div>
      <h1 className="mt-4 text-3xl font-bold">Hangman</h1>
      <p className="mt-1 text-[var(--ink-dim)]">
        One device, two players. Guess the hidden word one letter at a time —
        6 lives, free hints, and the word is revealed at the end.
      </p>

      {duoStep === 'choose' && (
        <section className="card mt-4 p-5">
          <p className="font-semibold">How should the word be picked?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary min-h-[48px]" onClick={startDuoSeeded}>
              Seeded word
            </button>
            <button type="button" className="btn min-h-[48px]" onClick={() => setDuoStep('set')}>
              Set a word for your partner
            </button>
          </div>
          <p className="mt-3 text-sm text-[var(--ink-dim)]">
            Seeded word: a surprise word from any category. Set a word: Player 1
            types a word in secret, then passes the device to Player 2.
          </p>
          <button type="button" className="btn min-h-[48px] mt-4" onClick={backToModes}>
            <Home size={16} aria-hidden /> Change mode
          </button>
        </section>
      )}

      {duoStep === 'set' && (
        <section className="card mt-4 p-5">
          <p className="font-semibold">Player 1 — set a word for your partner</p>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            Letters only, 3–12 letters. Player 2 will see only the category
            “Set by your partner” and the blanks — never this word.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="custom-word">Word for your partner</label>
            <input
              id="custom-word"
              type={showCustom ? 'text' : 'password'}
              className="btn min-h-[48px] flex-1 !cursor-text text-left normal-case"
              value={customWord}
              onChange={(e) => {
                setCustomWord(e.target.value);
                setCustomError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitCustomWord();
              }}
              placeholder="Type a secret word…"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            <button
              type="button"
              className="btn min-h-[48px] min-w-[48px] !px-3 !py-2"
              onClick={() => setShowCustom((s) => !s)}
              aria-label={showCustom ? 'Hide word' : 'Show word'}
            >
              {showCustom ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
            </button>
          </div>
          {customError && <p className="mt-2 text-sm font-semibold" role="alert">{customError}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary min-h-[48px]" onClick={submitCustomWord}>
              Pass the device
            </button>
            <button type="button" className="btn min-h-[48px]" onClick={resetDuo}>
              Back
            </button>
          </div>
        </section>
      )}

      {duoStep === 'handoff' && (
        <section className="card mt-4 p-5 text-center">
          <p className="font-display text-2xl font-bold">Word set — pass the device!</p>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            Player 1, look away now. Player 2, tap below when you are ready to guess.
          </p>
          <div className="mt-3 flex justify-center gap-2">
            <button type="button" className="btn btn-primary min-h-[48px]" onClick={() => setDuoStep('play')}>
              I&apos;m Player 2 — start guessing
            </button>
          </div>
        </section>
      )}

      {duoStep === 'play' && duoGame !== null && (
        <>
          <div className="mt-4">
            <HangmanBoard
              state={duoGame}
              disabled={false}
              turnLabel="Player 2's turn" 
              onGuess={(letter) => setDuoGame((s) => (s ? guessLetter(s, letter) : s))}
              onHint={() => setDuoGame((s) => (s ? revealHint(s) : s))}
            />
          </div>
          {duoGame.status !== 'playing' && (
            <section className="card mt-4 p-5 text-center">
              <p className="font-display text-2xl font-bold">
                {duoGame.status === 'won' ? '✓ Player 2 wins!' : '✗ Player 2 ran out of lives.'}
              </p>
              <p className="mt-1 text-sm text-[var(--ink-dim)]">
                The word was {duoGame.word.toUpperCase()} · {MAX_LIVES - duoGame.lives} wrong{' '}
                {MAX_LIVES - duoGame.lives === 1 ? 'guess' : 'guesses'}
                {duoGame.hintsUsed > 0 ? ` · ${duoGame.hintsUsed} free ${duoGame.hintsUsed === 1 ? 'hint' : 'hints'}` : ''}.
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <button type="button" className="btn btn-primary min-h-[48px]" onClick={resetDuo}>
                  <RotateCcw size={16} aria-hidden /> New round
                </button>
                <button type="button" className="btn min-h-[48px]" onClick={backToModes}>
                  <Home size={16} aria-hidden /> Change mode
                </button>
              </div>
            </section>
          )}
          {duoGame.status === 'playing' && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="btn min-h-[48px]" onClick={resetDuo}>
                <RotateCcw size={16} aria-hidden /> New round
              </button>
              <button type="button" className="btn min-h-[48px]" onClick={backToModes}>
                <Home size={16} aria-hidden /> Change mode
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
