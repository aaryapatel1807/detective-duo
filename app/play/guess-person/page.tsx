'use client';

/**
 * Guess the Person, Duo Corner.
 * Cosy Bot (solo) or Player 1 (two-player, hidden pick screen) holds
 * a secret person from an original roster of fictional personas. The
 * guesser asks yes/no trait questions to eliminate candidates, then
 * taps one persona to guess. Correct guess wins; a wrong guess, or
 * spending the whole question budget without guessing, loses.
 * No faces or artwork are copied from anywhere — persona cards are
 * text trait chips only. Solo wins record through SoloQuickShell;
 * pass-and-play records nothing. No timers, no motion effects.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, HelpCircle, RotateCcw, Users } from 'lucide-react';
import {
  QUESTIONS,
  ROSTER,
  askQuestion,
  budgetForLevel,
  generateGuessPerson,
  makeGuess,
  rosterSizeForLevel,
  splitsCandidates,
  traitChips,
  type GuessPersonState,
  type Persona,
} from '@/lib/generators/guessPerson';
import { rngFromSeed, shuffle } from '@/lib/generators/rng';
import SoloQuickShell from '@/components/quickgames/SoloQuickShell';
import StickyActionBar from '@/components/StickyActionBar';

const GAME_ID = 'guess-person';

type Mode = 'solo' | 'duo';
type DuoStep = 'setup' | 'pick' | 'pass' | 'guess';

const TIERS = [
  { label: 'Easy', level: 1 },
  { label: 'Medium', level: 11 },
  { label: 'Hard', level: 31 },
  { label: 'Expert', level: 61 },
] as const;

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('');
}

/** Shared board: questions on top, candidate grid below, guess to finish. */
function GuessBoard({
  initial,
  disabled,
  onFinish,
  footer,
  turnLabel,
}: {
  initial: GuessPersonState;
  disabled?: boolean;
  onFinish?: (won: boolean) => void;
  footer?: ReactNode;
  turnLabel: string;
}) {
  const [game, setGame] = useState(initial);
  const [selected, setSelected] = useState<string | null>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (game.finished && !finishedRef.current) {
      finishedRef.current = true;
      onFinish?.(game.won);
    }
  }, [game.finished, game.won, onFinish]);

  const questionsLeft = game.budget - game.questionsUsed;
  const available = QUESTIONS.filter(
    (q) =>
      !game.asked.some((a) => a.question.id === q.id) &&
      splitsCandidates(game.remaining, q),
  );
  const interactive = !disabled && !game.finished;

  return (
    <div>
      <section className="card mt-4 p-4 text-center" aria-label="Turn and progress">
        <p className="text-lg font-bold">{game.finished ? 'Round over' : turnLabel}</p>
        <p className="mt-1 text-sm text-[var(--ink-dim)]">
          Questions used: {game.questionsUsed} of {game.budget} · {game.remaining.length}{' '}
          candidate{game.remaining.length === 1 ? '' : 's'} left
        </p>
      </section>
      <section className="card mt-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
          <span>
            {game.remaining.length} candidate{game.remaining.length === 1 ? '' : 's'} left
          </span>
          <span className="chip">
            <HelpCircle size={14} aria-hidden /> {questionsLeft} question
            {questionsLeft === 1 ? '' : 's'} left
          </span>
        </div>
        <p className="mt-2 text-sm text-[var(--ink-dim)]">
          {game.finished
            ? game.won
              ? 'You found them!'
              : 'Round over — the secret is revealed below.'
            : questionsLeft === 0
              ? 'No questions left.'
              : 'Ask a question to narrow the field, or guess when you feel sure — a wrong guess ends the round, and so does spending your last question.'}
        </p>

        {game.asked.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Questions asked">
            {game.asked.map((a) => (
              <li key={a.question.id} className="chip">
                {a.question.label} {a.answer ? '✓ Yes' : '✗ No'}
              </li>
            ))}
          </ul>
        )}

        {interactive && available.length > 0 && (
          <div className="mt-3">
            <p className="text-sm font-semibold">Ask a question</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {available.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  className="btn min-h-[48px] !px-3 !py-2 text-sm"
                  onClick={() => setGame((g) => askQuestion(g, q.id))}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {interactive && available.length === 0 && !game.finished && (
          <p className="mt-3 text-sm font-semibold">
            No question can narrow it further — time to guess!
          </p>
        )}
      </section>

      <section className="card mt-4 p-4" aria-label="Candidate personas">
        <p className="text-sm font-semibold">Tap a persona, then confirm your guess</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {game.remaining.map((p) => {
            const isSelected = selected === p.name;
            return (
              <button
                key={p.name}
                type="button"
                className="min-h-[96px] rounded-xl border-2 p-3 text-left"
                style={{
                  borderColor: isSelected ? 'var(--accent)' : 'var(--line)',
                  background: isSelected ? 'var(--surface)' : 'transparent',
                  opacity: game.finished ? 0.7 : 1,
                }}
                disabled={!interactive}
                onClick={() => setSelected(p.name)}
                aria-pressed={isSelected}
                aria-label={`${p.name}: ${traitChips(p).join(', ')}`}
              >
                <span
                  aria-hidden
                  className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
                  style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
                >
                  {initials(p.name)}
                </span>
                <span className="mt-1 block font-bold">{p.name}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-[var(--ink-dim)]">
                  {traitChips(p).join(' · ')}
                </span>
              </button>
            );
          })}
        </div>

        {interactive && selected && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn btn-primary min-h-[48px]"
              onClick={() => setGame((g) => makeGuess(g, selected))}
            >
              Guess {selected}
            </button>
            <button type="button" className="btn min-h-[48px]" onClick={() => setSelected(null)}>
              Not yet
            </button>
          </div>
        )}
      </section>

      {game.finished && (
        <section className="card mt-4 p-5 text-center">
          <p className="font-display text-2xl font-bold">
            {game.won ? '✓ You found them!' : '✗ So close — not this time.'}
          </p>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            The secret person was <span className="font-bold">{game.secret.name}</span> —{' '}
            {traitChips(game.secret).join(' · ')}. Questions used: {game.questionsUsed} of{' '}
            {game.budget}.
          </p>
          {footer && <div className="mt-3 flex flex-wrap justify-center gap-2">{footer}</div>}
        </section>
      )}
      {!game.finished && footer && (
        <div className="mt-4 flex flex-wrap gap-2">{footer}</div>
      )}
      <StickyActionBar
        status={`${game.remaining.length} left · ${game.questionsUsed} of ${game.budget} questions`}
        actions={
          interactive && selected
            ? [{ label: `Guess ${selected}`, onClick: () => setGame((g) => makeGuess(g, selected)), primary: true }]
            : []
        }
      />
    </div>
  );
}

export default function GuessPersonPage() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [duoStep, setDuoStep] = useState<DuoStep>('setup');
  const [duoLevel, setDuoLevel] = useState(1);
  const [duoRound, setDuoRound] = useState(0);
  const [pickRoster, setPickRoster] = useState<Persona[]>([]);
  const [picked, setPicked] = useState<Persona | null>(null);
  const [duoGame, setDuoGame] = useState<GuessPersonState | null>(null);

  const startDuoPick = (level: number) => {
    const size = rosterSizeForLevel(level);
    const roster = shuffle(ROSTER, rngFromSeed(`duo|${Date.now()}|${duoRound}`)).slice(0, size);
    setDuoLevel(level);
    setPickRoster(roster);
    setPicked(null);
    setDuoGame(null);
    setDuoStep('pick');
  };

  const startDuoGuess = () => {
    if (!picked) return;
    setDuoGame({
      roster: pickRoster,
      secret: picked,
      remaining: [...pickRoster],
      asked: [],
      questionsUsed: 0,
      budget: budgetForLevel(duoLevel),
      finished: false,
      won: false,
    });
    setDuoStep('guess');
  };

  const resetDuo = () => {
    setDuoRound((r) => r + 1);
    setDuoStep('setup');
    setPicked(null);
    setDuoGame(null);
  };

  const duoTier = useMemo(
    () => TIERS.find((t) => t.level === duoLevel) ?? TIERS[0]!,
    [duoLevel],
  );

  if (mode === null) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 pb-16">
        <div className="mt-2">
          <Link href="/" className="btn min-h-[48px] !px-3 !py-2 text-sm">
            <ArrowLeft size={16} aria-hidden /> Home
          </Link>
        </div>
        <h1 className="mt-4 text-3xl font-bold">Guess the Person</h1>
        <p className="mt-1 text-sm text-[var(--ink-dim)]">
          Someone is hiding in this crowd of fictional faces. Ask yes-or-no
          questions about glasses, hats, hair, facial hair, and smiles to
          narrow the field — then tap one person to guess. A wrong guess
          ends the round, and so does spending your last question, so
          guess before the budget runs out.
        </p>
        <section className="card mt-4 p-5">
          <p className="font-semibold">How do you want to play?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary min-h-[48px]" onClick={() => setMode('solo')}>
              Solo vs Cosy Bot
            </button>
            <button type="button" className="btn min-h-[48px]" onClick={() => setMode('duo')}>
              <Users size={18} aria-hidden /> Two players, one device
            </button>
          </div>
          <p className="mt-3 text-sm text-[var(--ink-dim)]">
            Easy starts with 12 candidates and 8 questions; Expert shows all
            24 with only 4 questions. Higher levels, tighter budgets.
          </p>
        </section>
      </main>
    );
  }

  if (mode === 'solo') {
    return (
      <SoloQuickShell
        gameId={GAME_ID}
        title="Guess the Person"
        blurb="Cosy Bot secretly picked one person. Ask yes-or-no trait questions to narrow the field, then tap one person to guess — a wrong guess, or your last question, ends the round."
      >
        {({ level, seed, disabled, onFinish }) => (
          <GuessBoard
            initial={generateGuessPerson(seed, level)}
            disabled={disabled}
            onFinish={onFinish}
            turnLabel="Your turn"
          />
        )}
      </SoloQuickShell>
    );
  }

  // Two-player pass-and-play: nothing is recorded.
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16">
      <div className="mt-2 flex items-center justify-between gap-2">
        <Link href="/" className="btn min-h-[48px] !px-3 !py-2 text-sm">
          <ArrowLeft size={16} aria-hidden /> Home
        </Link>
        <span className="chip">Two players</span>
      </div>
      <h1 className="mt-4 text-3xl font-bold">Guess the Person</h1>
      <p className="mt-1 text-sm text-[var(--ink-dim)]">
        Player 1 picks the secret in private, passes the device, and Player 2
        guesses. Nothing from this mode is recorded.
      </p>

      {duoStep === 'setup' && (
        <section className="card mt-4 p-5">
          <p className="font-semibold">Player 1 — pick a difficulty first</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {TIERS.map((t) => (
              <button
                key={t.label}
                type="button"
                className="btn min-h-[48px]"
                onClick={() => startDuoPick(t.level)}
              >
                {t.label} · {rosterSizeForLevel(t.level)} people,{' '}
                {budgetForLevel(t.level)} questions
              </button>
            ))}
          </div>
          <div className="mt-4">
            <button type="button" className="btn min-h-[48px]" onClick={() => setMode(null)}>
              Change mode
            </button>
          </div>
        </section>
      )}

      {duoStep === 'pick' && (
        <section className="card mt-4 p-5">
          <p className="font-semibold">
            Player 1 — secretly pick one person ({duoTier.label}: {pickRoster.length}{' '}
            candidates, {budgetForLevel(duoLevel)} questions for the guesser)
          </p>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            Keep the screen to yourself. Player 2 must not see this pick.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {pickRoster.map((p) => {
              const isSelected = picked?.name === p.name;
              return (
                <button
                  key={p.name}
                  type="button"
                  className="min-h-[96px] rounded-xl border-2 p-3 text-left"
                  style={{
                    borderColor: isSelected ? 'var(--accent)' : 'var(--line)',
                    background: isSelected ? 'var(--surface)' : 'transparent',
                  }}
                  onClick={() => setPicked(p)}
                  aria-pressed={isSelected}
                >
                  <span className="block font-bold">{p.name}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-[var(--ink-dim)]">
                    {traitChips(p).join(' · ')}
                  </span>
                </button>
              );
            })}
          </div>
          {picked && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-primary min-h-[48px]"
                onClick={() => setDuoStep('pass')}
              >
                Lock in {picked.name} &amp; pass the device
              </button>
              <button type="button" className="btn min-h-[48px]" onClick={() => setPicked(null)}>
                Pick someone else
              </button>
            </div>
          )}
        </section>
      )}

      {duoStep === 'pass' && (
        <section className="card mt-4 p-5 text-center">
          <p className="font-display text-2xl font-bold">Pass the device to Player 2</p>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            The secret is locked in. Player 1, look away — Player 2, tap when
            you are ready to start guessing.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              className="btn btn-primary min-h-[48px]"
              onClick={startDuoGuess}
            >
              I&apos;m Player 2 — start guessing
            </button>
            <button type="button" className="btn min-h-[48px]" onClick={() => setDuoStep('pick')}>
              Back to picking
            </button>
          </div>
        </section>
      )}

      {duoStep === 'guess' && duoGame && (
        <>
          <div className="mt-4 flex items-center gap-2">
            <span className="chip">
              Player 2 guessing · {duoTier.label} · {duoGame.budget} questions
            </span>
          </div>
          <GuessBoard
            key={`${duoRound}-${duoLevel}-${duoGame.secret.name}`}
            initial={duoGame}
            turnLabel="Player 2's turn"
            footer={
              <>
                <button type="button" className="btn btn-primary min-h-[48px]" onClick={resetDuo}>
                  <RotateCcw size={16} aria-hidden /> New round
                </button>
                <button type="button" className="btn min-h-[48px]" onClick={() => setMode(null)}>
                  Change mode
                </button>
              </>
            }
          />
        </>
      )}
    </main>
  );
}
