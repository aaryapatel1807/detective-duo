'use client';

/**
 * Versus + shared grid views. One GridBoard serves both: versus uses
 * each player's own marks, co-op Logic Grids uses one shared marks map.
 * Progress bars are friendly fractions, never scores.
 */
import type { LogicGridPuzzle } from '@/lib/generators/logicGrid';
import type { CipherPuzzle } from '@/lib/generators/cipherDesk';
import type { NonogramPuzzle } from '@/lib/generators/nonogram';
import { progressLabel } from '@/lib/together/versus';

export function ProgressBars({
  rows,
}: {
  rows: { name: string; pct: number; isMe: boolean }[];
}) {
  return (
    <div className="panel space-y-2 p-4">
      {rows.map((r) => (
        <div key={r.name}>
          <p className="flex justify-between text-sm font-semibold">
            <span>
              {r.isMe ? 'You' : r.name} — {progressLabel(r.pct)}
            </span>
            <span>{Math.round(r.pct * 100)}%</span>
          </p>
          <div
            className="mt-1 h-3 overflow-hidden rounded-full bg-black/10"
            role="progressbar"
            aria-valuenow={Math.round(r.pct * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all"
              style={{ width: `${Math.round(r.pct * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function cycleMark(m: 'yes' | 'no' | undefined): 'yes' | 'no' | undefined {
  if (!m) return 'yes';
  if (m === 'yes') return 'no';
  return undefined;
}

export function GridBoard({
  puzzle,
  marks,
  onCycle,
  struckClues,
  onStrikeClue,
  disabled,
}: {
  puzzle: LogicGridPuzzle;
  marks: Record<string, 'yes' | 'no'>;
  onCycle: (key: string) => void;
  struckClues?: number[];
  onStrikeClue?: (id: number) => void;
  disabled?: boolean;
}) {
  const friends = puzzle.categories[0].items;
  return (
    <div>
      <section className="paper p-4 sm:p-5">
        <h2 className="font-display text-lg font-bold">Clues</h2>
        {onStrikeClue && (
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            Tap a clue to cross it off once you have used it.
          </p>
        )}
        <ol className="mt-2 space-y-1.5">
          {puzzle.clues.map((clue) => {
            const struck = struckClues?.includes(clue.id);
            return (
              <li key={clue.id}>
                <button
                  type="button"
                  className={`w-full text-left ${struck ? 'line-through opacity-50' : ''}`}
                  onClick={() => onStrikeClue?.(clue.id)}
                  disabled={disabled || !onStrikeClue}
                >
                  {clue.text}
                </button>
              </li>
            );
          })}
        </ol>
      </section>
      {puzzle.categories.slice(1).map((cat, ci) => {
        const catIdx = ci + 1;
        return (
          <section key={cat.name} className="card mt-4 p-4">
            <h3 className="font-display text-lg font-bold">{cat.name}</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full border-collapse text-center">
                <thead>
                  <tr>
                    <th className="p-1 text-left text-sm" />
                    {cat.items.map((item) => (
                      <th key={item} className="p-1 text-xs font-semibold">
                        {item}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {friends.map((friend, fi) => (
                    <tr key={friend}>
                      <th className="p-1 text-left text-sm font-semibold">{friend}</th>
                      {cat.items.map((_, ii) => {
                        const key = `${catIdx}:${ii}`;
                        const mark = marks[key];
                        return (
                          <td key={ii} className="p-1">
                            <button
                              type="button"
                              className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg border text-lg font-bold"
                              style={{
                                borderColor: 'var(--line)',
                                background: mark ? 'var(--surface)' : 'transparent',
                              }}
                              onClick={() => onCycle(key)}
                              disabled={disabled}
                              aria-label={`${friend} and ${cat.items[ii]}: ${mark ?? 'unmarked'}`}
                            >
                              {mark === 'yes' ? '✓' : mark === 'no' ? '✗' : ''}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function VersusCipherView({
  puzzle,
  answer,
  onAnswer,
  disabled,
}: {
  puzzle: CipherPuzzle;
  answer: string;
  onAnswer: (a: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <section className="paper p-4 sm:p-5">
        <p className="font-mono text-lg leading-relaxed break-words">{puzzle.ciphertext}</p>
        <p className="mt-3 text-sm text-[var(--ink-dim)]">{puzzle.clue}</p>
        {puzzle.frequencyHints.length > 0 && (
          <p className="mt-2 text-sm">
            Frequent letters in this note:{' '}
            {puzzle.frequencyHints.map((f) => `${f.letter} (${f.count})`).join(', ')}
          </p>
        )}
        {puzzle.vigenereKeyLength !== null && (
          <p className="mt-2 text-sm">The keyword is {puzzle.vigenereKeyLength} letters long.</p>
        )}
      </section>
      <label className="mt-4 flex flex-col gap-1 text-sm font-semibold">
        Your decoded message
        <textarea
          className="input min-h-24 w-full"
          value={answer}
          onChange={(e) => onAnswer(e.target.value)}
          disabled={disabled}
          placeholder="Type what you think it says…"
          aria-label="Decoded message"
        />
      </label>
      <p className="mt-1 text-sm text-[var(--ink-dim)]">
        Progress counts letters in the right place. First to the full message wins the round.
      </p>
    </div>
  );
}

export function VersusNonogramView({
  puzzle,
  marks,
  onCycle,
  disabled,
}: {
  puzzle: NonogramPuzzle;
  marks: Record<string, 'fill' | 'x'>;
  onCycle: (key: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="card overflow-x-auto p-4">
      <table className="border-collapse">
        <thead>
          <tr>
            <th />
            {puzzle.colClues.map((clue, c) => (
              <th key={c} className="p-1 align-bottom text-xs font-semibold">
                {clue.join(' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {puzzle.rowClues.map((clue, r) => (
            <tr key={r}>
              <th className="p-1 text-right text-xs font-semibold">{clue.join(' ')}</th>
              {Array.from({ length: puzzle.size }, (_, c) => {
                const mark = marks[`${r},${c}`];
                return (
                  <td key={c} className="p-0.5">
                    <button
                      type="button"
                      className="flex h-7 w-7 items-center justify-center rounded border text-sm font-bold sm:h-8 sm:w-8"
                      style={{
                        borderColor: 'var(--line)',
                        background: mark === 'fill' ? 'var(--accent)' : 'transparent',
                        color: mark === 'fill' ? 'white' : 'inherit',
                      }}
                      onClick={() => onCycle(`${r},${c}`)}
                      disabled={disabled}
                      aria-label={`Row ${r + 1}, column ${c + 1}: ${mark ?? 'blank'}`}
                    >
                      {mark === 'fill' ? '■' : mark === 'x' ? '✗' : ''}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-sm text-[var(--ink-dim)]">
        Tap a square to fill it, again to cross it out, again to clear.
      </p>
    </div>
  );
}
