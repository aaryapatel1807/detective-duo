'use client';

/* DifficultySelect — 3-option selector cards.
 * Each card communicates difficulty via concrete detail
 * (grid size, time limit, hint count) — pass via `hint`. */

import type { Difficulty } from './Badge';

export interface DifficultyOption {
  /** Difficulty value for this card. */
  value: Difficulty;
  /** Card title, e.g. 'ROUTINE', 'TRICKY', 'CLASSIFIED'. */
  label: string;
  /** Concrete detail, e.g. '9×9 · 10 MINES'. */
  hint?: string;
}

export interface DifficultySelectProps {
  /** The three (or more) difficulty options to show. */
  options: DifficultyOption[];
  /** Currently selected difficulty. */
  value: Difficulty;
  /** Selection handler. */
  onChange: (d: Difficulty) => void;
  /** Field label above the cards. Default 'DIFFICULTY'. */
  label?: string;
  /** Extra className merged with kit classes. */
  className?: string;
}

export function DifficultySelect({
  options,
  value,
  onChange,
  label = 'DIFFICULTY',
  className = '',
}: DifficultySelectProps) {
  return (
    <div className={className || undefined} role="radiogroup" aria-label={label}>
      <div className="gk-diff-label">{label}</div>
      <div className="gk-diff-grid">
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(opt.value)}
              className={`gk-diff-option gk-diff-option--${opt.value}${
                selected ? ' gk-diff-option--selected' : ''
              }`}
            >
              <span className="gk-diff-name">{opt.label}</span>
              {opt.hint ? <span className="gk-diff-hint">{opt.hint}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
