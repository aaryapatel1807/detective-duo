/* ============================================================
 * GAME-UI KIT — pure helpers (framework-free, unit-tested).
 * Used by ScoreHUD / TimerChip / ProgressBar.
 * ============================================================ */

/** Format a seconds count as MM:SS (or H:MM:SS past one hour). Caps display at 99:59:59. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const capped = Math.min(s, 99 * 3600 + 59 * 60 + 59);
  const h = Math.floor(capped / 3600);
  const m = Math.floor((capped % 3600) / 60);
  const sec = capped % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Format a score with thousands separators (1,436). No locale guessing — always en-US digits. */
export function formatNumber(n: number): string {
  const v = Math.round(n);
  return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Clamp a value into the 0..1 range (for bar fills). */
export function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(1, Math.max(0, v));
}

/** Bar fill fraction for value/max. Returns 0 when max is 0 or negative (avoids NaN). */
export function pctOf(value: number, max: number): number {
  if (max <= 0 || !Number.isFinite(value) || !Number.isFinite(max)) return 0;
  return clamp01(value / max);
}

/** True when the live score beats the persisted best (drives the "NEW RECORD" glow). */
export function isNewRecord(score: number, best: number): boolean {
  return score > 0 && best >= 0 && score > best;
}

/** Minesweeper-style three-digit display used by the kit's digital counters. */
export function pad3(n: number): string {
  const s = Math.max(0, Math.min(999, Math.floor(n)));
  return String(s).padStart(3, '0');
}
