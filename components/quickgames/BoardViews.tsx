'use client';

/**
 * Board views for the Phase 6 turn-based quick games: Quoridor
 * and the Vibe Check board. These are presentational:
 * the solo page or the room wrapper owns the state and passes it in,
 * so the same board serves solo (bot) and together play.
 */
import { useMemo, useState } from 'react';
import {
  legalMoves,
  pawnSteps,
  QUORIDOR_SIZE,
  type QuoridorMove,
  type QuoridorState,
} from '@/lib/quickgames/quoridor';
import type { VibePersona } from '@/lib/quickgames/vibeCheck';

// ------------------------------------------------------------------ Quoridor ----

const QUORIDOR_GLYPHS = ['●', '○'];

export function QuoridorView({
  state,
  onMove,
  myTurn,
  disabled,
  meLabel,
  foeLabel,
}: {
  state: QuoridorState;
  onMove: (m: QuoridorMove) => void;
  myTurn: boolean;
  disabled?: boolean;
  meLabel: string;
  foeLabel: string;
}) {
  const [fenceMode, setFenceMode] = useState(false);
  const [fenceDir, setFenceDir] = useState<'h' | 'v'>('h');
  const [msg, setMsg] = useState<string | null>(null);
  const legal = useMemo(() => legalMoves(state), [state]);
  const steps = useMemo(
    () => pawnSteps(state, state.turn),
    [state],
  );
  const turn = state.turn;

  const tryStep = (x: number, y: number) => {
    if (!myTurn || disabled) return;
    if (!steps.some((s) => s.x === x && s.y === y)) return;
    setMsg(null);
    onMove({ kind: 'step', to: { x, y } });
  };

  const tryFence = (x: number, y: number) => {
    if (!myTurn || disabled) return;
    const fence = { x: Math.min(7, x), y: Math.min(7, y), dir: fenceDir };
    const ok = legal.some(
      (m) =>
        m.kind === 'fence' &&
        m.fence.x === fence.x &&
        m.fence.y === fence.y &&
        m.fence.dir === fence.dir,
    );
    if (!ok) {
      setMsg('That fence does not fit — it overlaps, crosses, or would seal a route.');
      return;
    }
    setMsg(null);
    onMove({ kind: 'fence', fence });
  };

  const cell = 100 / QUORIDOR_SIZE;
  return (
    <div>
      <p className="text-sm text-[var(--ink-dim)]">
        {myTurn ? 'Your turn' : `${foeLabel}'s turn`} · {meLabel} starts at the bottom,
        first to the far edge wins. Fences left: you {state.fencesLeft[0]}, them{' '}
        {state.fencesLeft[1]}.
      </p>
      {msg && <p className="mt-1 text-sm">{msg}</p>}
      <div className="relative mx-auto mt-3 max-w-md">
        <div
          className="grid rounded-xl border"
          style={{
            gridTemplateColumns: `repeat(${QUORIDOR_SIZE}, 1fr)`,
            borderColor: 'var(--line)',
            background: 'var(--surface)',
          }}
        >
          {Array.from({ length: QUORIDOR_SIZE * QUORIDOR_SIZE }, (_, i) => {
            const x = i % QUORIDOR_SIZE;
            const y = Math.floor(i / QUORIDOR_SIZE);
            const pawnIdx = state.pawns.findIndex((p) => p.x === x && p.y === y);
            const isStep = steps.some((s) => s.x === x && s.y === y);
            return (
              <button
                key={i}
                type="button"
                className="flex aspect-square items-center justify-center text-2xl"
                style={{
                  background: isStep && myTurn && !fenceMode ? 'var(--surface)' : 'transparent',
                  outline: isStep && myTurn && !fenceMode ? '2px solid var(--accent)' : undefined,
                }}
                disabled={disabled || !myTurn}
                onClick={() => (fenceMode ? tryFence(x, y) : tryStep(x, y))}
                aria-label={`Square ${x + 1}, ${y + 1}${pawnIdx >= 0 ? `, player ${pawnIdx + 1}` : ''}`}
              >
                {pawnIdx >= 0 ? QUORIDOR_GLYPHS[pawnIdx] : ''}
              </button>
            );
          })}
        </div>
        {state.fences.map((f, i) =>
          f.dir === 'h' ? (
            <span
              key={i}
              className="absolute rounded-full bg-[var(--accent)]"
              style={{
                left: `${f.x * cell}%`,
                top: `calc(${(f.y + 1) * cell}% - 3px)`,
                width: `${cell * 2}%`,
                height: 6,
              }}
              aria-hidden
            />
          ) : (
            <span
              key={i}
              className="absolute rounded-full bg-[var(--accent)]"
              style={{
                left: `calc(${(f.x + 1) * cell}% - 3px)`,
                top: `${f.y * cell}%`,
                width: 6,
                height: `${cell * 2}%`,
              }}
              aria-hidden
            />
          ),
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={`btn ${!fenceMode ? 'btn-primary' : ''}`}
          onClick={() => setFenceMode(false)}
        >
          Move pawn
        </button>
        <button
          type="button"
          className={`btn ${fenceMode ? 'btn-primary' : ''}`}
          onClick={() => setFenceMode(true)}
        >
          Place fence
        </button>
        {fenceMode && (
          <>
            <button
              type="button"
              className={`btn ${fenceDir === 'h' ? 'btn-primary' : ''}`}
              onClick={() => setFenceDir('h')}
            >
              Horizontal
            </button>
            <button
              type="button"
              className={`btn ${fenceDir === 'v' ? 'btn-primary' : ''}`}
              onClick={() => setFenceDir('v')}
            >
              Vertical
            </button>
            <span className="text-sm text-[var(--ink-dim)]">
              Tap a square — the fence anchors at its top-left corner.
            </span>
          </>
        )}
      </div>
      <p className="mt-2 text-xs text-[var(--ink-dim)]">
        Player {turn + 1} to move · {state.fencesLeft[turn]} fences left.
      </p>
    </div>
  );
}

// ----------------------------------------------------------------- Vibe board ----

export function VibeBoard({
  board,
  eliminated,
  onToggleEliminate,
  onGuess,
  disabled,
}: {
  board: VibePersona[];
  eliminated: number[];
  onToggleEliminate: (idx: number) => void;
  onGuess: (idx: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
      {board.map((p, i) => {
        const out = eliminated.includes(i);
        return (
          <div
            key={p.name}
            className="rounded-xl border p-2 text-center"
            style={{
              borderColor: 'var(--line)',
              background: out ? 'transparent' : 'var(--surface)',
              opacity: out ? 0.35 : 1,
            }}
          >
            <span
              className="mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
              style={{ background: 'var(--accent)', color: 'white' }}
              aria-hidden
            >
              {p.name.slice(0, 2).toUpperCase()}
            </span>
            <p className="mt-1 text-xs font-semibold">{p.name}</p>
            <div className="mt-1 flex gap-1">
              <button
                type="button"
                className="btn flex-1 !px-1 !py-1 text-xs"
                disabled={disabled}
                onClick={() => onToggleEliminate(i)}
              >
                {out ? 'Back' : 'Flip'}
              </button>
              <button
                type="button"
                className="btn btn-primary flex-1 !px-1 !py-1 text-xs"
                disabled={disabled || out}
                onClick={() => onGuess(i)}
              >
                Guess
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
