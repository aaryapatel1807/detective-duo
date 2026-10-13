'use client';

/* ResultModal — end-state overlay rendered ON the dimmed board.
 * Verdict headline + one key stat + one primary action + optional
 * secondary action. Wrap the board and the modal in .gk-modal-scope
 * (position: relative) so the final board stays visible behind. */

import { GameButton } from './GameButton';

/** Outcome tone: win (gold) / lose (red headline) / draw (neutral). */
export type ResultTone = 'win' | 'lose' | 'draw';

export interface ResultModalProps {
  /** Show or hide the overlay. */
  open: boolean;
  /** Verdict headline, e.g. 'CASE CLOSED' / 'GAME OVER'. */
  headline: string;
  /** One key stat line, e.g. 'SCORE 1,436 — BEST 8,192'. */
  stat?: string;
  /** Small eyebrow above the headline, e.g. 'FILE № 0247'. */
  eyebrow?: string;
  /** Primary action label, e.g. 'Try again'. */
  primaryLabel: string;
  /** Primary action handler. */
  onPrimary: () => void;
  /** Optional secondary action label, e.g. 'Back to hub'. */
  secondaryLabel?: string;
  /** Secondary action handler (required if secondaryLabel is set). */
  onSecondary?: () => void;
  /** Visual tone of the verdict. Default 'win'. */
  tone?: ResultTone;
}

export function ResultModal({
  open,
  headline,
  stat,
  eyebrow,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  tone = 'win',
}: ResultModalProps) {
  if (!open) return null;

  return (
    <div className="gk-result-overlay" role="dialog" aria-modal="true" aria-label={headline}>
      <div className={`gk-result-card gk-result-card--${tone}`}>
        {eyebrow ? <div className="gk-result-eyebrow">{eyebrow}</div> : null}
        <h2 className="gk-result-headline">{headline}</h2>
        {stat ? <p className="gk-result-stat">{stat}</p> : null}
        <div className="gk-result-actions">
          <GameButton variant="primary" onClick={onPrimary}>
            {primaryLabel}
          </GameButton>
          {secondaryLabel ? (
            <GameButton variant="ghost" onClick={onSecondary}>
              {secondaryLabel}
            </GameButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}
