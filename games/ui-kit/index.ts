/* ============================================================
 * DETECTIVE DUO — shared noir GAME-UI KIT.
 *
 * Usage (inside any games/<slug>/Game.tsx):
 *
 *   import './kit.css';   // or '../ui-kit/kit.css' — import once per game
 *   import { ScoreHUD, GameButton } from '../ui-kit';
 *
 * Kit tokens inherit the hub vars (--hub-*) with hex fallbacks, so
 * the kit also works standalone without the hub token block.
 * Wrap kit components in a <div className="gk-root"> to get the
 * kit font/body defaults.
 * ============================================================ */

export { GameButton } from './GameButton';
export type { GameButtonVariant, GameButtonSize, GameButtonProps } from './GameButton';

export { ScoreHUD } from './ScoreHUD';
export type { ScoreHUDProps } from './ScoreHUD';

export { TurnBanner } from './TurnBanner';
export type { TurnBannerProps } from './TurnBanner';

export { ResultModal } from './ResultModal';
export type { ResultTone, ResultModalProps } from './ResultModal';

export { GameCard } from './GameCard';
export type { GameCardState, GameCardProps } from './GameCard';

export { DifficultyBadge, PlayerCountBadge } from './Badge';
export type { Difficulty, DifficultyBadgeProps, PlayerCountBadgeProps } from './Badge';

export { ProgressBar } from './ProgressBar';
export type { ProgressBarProps } from './ProgressBar';

export { TimerChip } from './TimerChip';
export type { TimerChipProps } from './TimerChip';

export { DifficultySelect } from './DifficultySelect';
export type { DifficultyOption, DifficultySelectProps } from './DifficultySelect';

export { SectionTitle } from './SectionTitle';
export type { SectionTitleProps } from './SectionTitle';

export { PlayingCard } from './PlayingCard';
export type { PlayingCardSize, PlayingCardProps } from './PlayingCard';

export { Die } from './Die';
export type { DieProps } from './Die';

export { suitGlyph, suitColor, pipLayout } from './realism-helpers';
export type { CardSuit } from './realism-helpers';

export { LetterTile } from './LetterTile';
export type { LetterTileState, LetterTileSize, LetterTileProps } from './LetterTile';

export { formatClock, formatNumber, clamp01, pctOf, isNewRecord, pad3 } from './helpers';
