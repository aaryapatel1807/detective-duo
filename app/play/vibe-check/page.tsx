'use client';

import { useMemo, useState } from 'react';
import SoloQuickShell from '@/components/quickgames/SoloQuickShell';
import { VibeBoard } from '@/components/quickgames/BoardViews';
import { hashSeed } from '@/lib/generators/rng';
import {
  generateVibe,
  VIBE_QUESTIONS,
  vibeAnswer,
  vibeBotGuessThreshold,
  vibeBotQuestion,
  vibeEliminate,
  vibeRemaining,
  type VibeQuestion,
} from '@/lib/quickgames/vibeCheck';

function VibeSolo({
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
  const game = useMemo(() => generateVibe(seed, level), [seed, level]);
  const botSecretIdx = useMemo(() => hashSeed(`${seed}|botsecret`) % 24, [seed]);
  const mySecretIdx = useMemo(() => hashSeed(`${seed}|mysecret`) % 24, [seed]);
  const [eliminated, setEliminated] = useState<number[]>([]);
  const [botEliminated, setBotEliminated] = useState<number[]>([]);
  const [asked, setAsked] = useState<string[]>([]);
  const [botQuestion, setBotQuestion] = useState<VibeQuestion | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const botSecret = game.board[botSecretIdx]!;
  const mySecret = game.board[mySecretIdx]!;

  const ask = (q: VibeQuestion) => {
    if (disabled || done || botQuestion || asked.includes(q.id)) return;
    const ans = vibeAnswer(botSecret, q.trait);
    setAsked([...asked, q.id]);
    setLog((l) => [...l, `You asked: “${q.text}” — ${ans ? 'Yes' : 'No'}`]);
    const remaining = vibeRemaining(botEliminated, 24);
    setBotQuestion(vibeBotQuestion(game.board, remaining));
  };

  const answerBot = (ans: boolean) => {
    if (!botQuestion || disabled || done) return;
    const next = vibeEliminate(game.board, botEliminated, botQuestion.trait, ans);
    setBotEliminated(next);
    setLog((l) => [...l, `Bot asked: “${botQuestion.text}” — ${ans ? 'Yes' : 'No'}`]);
    const remaining = vibeRemaining(next, 24);
    if (remaining.length <= vibeBotGuessThreshold(level) && remaining.length > 0) {
      const guess = remaining[Math.floor(Math.random() * remaining.length)]!;
      if (guess === mySecretIdx) {
        setDone(true);
        onFinish(false);
      } else {
        setBotEliminated([...next, guess]);
        setLog((l) => [...l, `Bot guessed ${game.board[guess]!.name} — wrong, flipped down.`]);
      }
    }
    setBotQuestion(null);
  };

  const guess = (idx: number) => {
    if (disabled || done || eliminated.includes(idx)) return;
    if (idx === botSecretIdx) {
      setDone(true);
      onFinish(true);
    } else {
      setEliminated([...eliminated, idx]);
      setLog((l) => [...l, `${game.board[idx]!.name} is not the secret — flipped down.`]);
    }
  };

  return (
    <div>
      <section className="panel p-4">
        <p className="text-sm">
          Your secret: <strong>{mySecret.name}</strong> — answer the bot honestly
          about them. The bot's secret is hidden on the board below.
        </p>
        <p className="mt-1 text-sm text-[var(--ink-dim)]">
          Board: {game.kind === 'desi' ? 'desi' : game.kind === 'global' ? 'global' : 'desi + global'} ·
          Fictional personas, not real celebrities.
        </p>
      </section>

      {botQuestion ? (
        <section className="card mt-4 p-4">
          <p className="font-semibold">The bot asks: “{botQuestion.text}”</p>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            Answer about {mySecret.name}, honestly — the bot flips people down from your
            answer.
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" className="btn btn-primary" onClick={() => answerBot(true)} disabled={disabled || done}>
              Yes
            </button>
            <button type="button" className="btn" onClick={() => answerBot(false)} disabled={disabled || done}>
              No
            </button>
          </div>
        </section>
      ) : (
        <section className="card mt-4 p-4">
          <p className="font-semibold">Ask the bot a question</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {VIBE_QUESTIONS.map((q) => (
              <button
                key={q.id}
                type="button"
                className="btn"
                disabled={disabled || done || asked.includes(q.id)}
                onClick={() => ask(q)}
              >
                {q.text}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="mt-4">
        <VibeBoard
          board={game.board}
          eliminated={eliminated}
          onToggleEliminate={(i) =>
            setEliminated((prev) =>
              prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i],
            )
          }
          onGuess={guess}
          disabled={disabled || done}
        />
      </div>

      {log.length > 0 && (
        <section className="panel mt-4 space-y-1 p-4 text-sm">
          {log.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </section>
      )}
    </div>
  );
}

export default function VibeCheckPage() {
  return (
    <SoloQuickShell
      gameId="vibe-check"
      title="Vibe Check"
      blurb="Guess Who with personality questions. Ask, flip down everyone it can't be, and the last face standing is your answer."
    >
      {({ level, seed, disabled, onFinish }) => (
        <VibeSolo level={level} seed={seed} disabled={disabled} onFinish={onFinish} />
      )}
    </SoloQuickShell>
  );
}
