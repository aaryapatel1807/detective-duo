/* Mind Meld — shared types.
 * Both players submit ONE word per round via setShared. The round reveals
 * when both submissions are present (derived from shared state, so both
 * tabs reveal simultaneously). A match advances the meld; 5 matches wins.
 */

export interface MindShared {
  /** 1-based round number */
  round?: number;
  matches?: number;
  /** index into MIND_THEMES, or -1 when the theme is custom (after a miss) */
  themeIdx?: number;
  /** e.g. "RAIN + JAZZ" — next words must relate to BOTH */
  customTheme?: string;
  prevA?: string;
  prevB?: string;
  /** playerId -> submitted word for the current round */
  submissions?: Record<string, string>;
  /** playerId -> highest round number they were awarded match XP for */
  matchXp?: Record<string, number>;
  won?: boolean;
  awarded?: Record<string, boolean>;
}
