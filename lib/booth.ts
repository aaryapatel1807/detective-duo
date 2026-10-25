/**
 * Photo booth (Phase 6): strip styles + layout math.
 *
 * Everything is client-side: the browser camera (getUserMedia) draws
 * frames onto a canvas, and the strip is composited on that canvas.
 * Nothing is uploaded anywhere, ever — download and share just hand
 * the finished image back to the player.
 *
 * Canvas work itself lives in components/booth/PhotoBooth.tsx; this
 * module holds the pure parts so they are unit-tested.
 */

import { rngFromSeed } from './generators/rng';

/** Code-drawn strip decoration. All motifs are drawn from scratch in
 * the composite — no artwork, photos, or brand marks are copied in.
 * Seeded decorations (stars, glitter, doodles) use seededPoints below
 * so a strip renders identically every time it composites. */
export type StripPattern =
  | { kind: 'dots'; color: string; gap: number; r: number }
  | { kind: 'stars'; colors: string[]; count: number }
  | { kind: 'glitter'; colors: string[]; count: number }
  | { kind: 'checker'; color: string; size: number }
  | { kind: 'stripes'; colors: string[]; width: number }
  | { kind: 'lace'; color: string }
  | { kind: 'lights' }
  | { kind: 'floral'; colors: string[] }
  | { kind: 'stamp' }
  | { kind: 'bows'; color: string }
  | { kind: 'doodles' };

export type StripCaptionFont = 'serif' | 'typewriter' | 'script' | 'bubble';

export type StripGroup = 'classic' | 'reel' | 'template';

export interface BoothStyle {
  id: string;
  name: string;
  frame: string;
  caption: string;
  note: string;
  /** Which picker section this design lives in. */
  group: StripGroup;
  /** Small shapes drawn in the strip margins. */
  motif?: 'hearts' | 'stars';
  /** Words printed in the gaps between photos. */
  dividerText?: string;
  /** Code-drawn background / foreground decoration. */
  pattern?: StripPattern;
  /** Caption typeface; default is the classic serif. */
  captionFont?: StripCaptionFont;
}

/** Deterministic scatter points for a strip canvas (seeded by template
 * id, so re-composites look identical). Points stay inside `margin`. */
export function seededPoints(
  seed: string,
  count: number,
  w: number,
  h: number,
  margin = 0,
): { x: number; y: number }[] {
  const rng = rngFromSeed(seed);
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      x: margin + rng() * Math.max(1, w - margin * 2),
      y: margin + rng() * Math.max(1, h - margin * 2),
    });
  }
  return out;
}

export const BOOTH_STYLES: BoothStyle[] = [
  {
    id: 'classic',
    name: 'Classic strip',
    frame: '#fdf8ec',
    caption: '#2b2118',
    note: 'The old-school booth strip, warm paper and a plain border.',
    group: 'classic',
  },
  {
    id: '35mm',
    name: '35mm',
    frame: '#1c1c1e',
    caption: '#f5f0e6',
    note: 'Dark film edges with little sprocket holes, like a photo roll.',
    group: 'classic',
  },
  {
    id: 'love-note',
    name: 'Love note',
    frame: '#ffe9f0',
    caption: '#7a2e4a',
    note: 'Soft pink paper, for the soppy ones.',
    group: 'classic',
  },
  {
    id: 'after-hours',
    name: 'After hours',
    frame: '#1e2a4a',
    caption: '#ffd98a',
    note: 'Deep night blue with a warm lamp glow.',
    group: 'classic',
  },
  {
    id: 'date-plan',
    name: 'D.A.T.E. plan',
    frame: '#fff6d8',
    caption: '#3d5a3a',
    note: 'Butter yellow, made for the date-night dice roll.',
    group: 'classic',
  },
  {
    id: 'hearts',
    name: 'Hearts',
    frame: '#ffd6e0',
    caption: '#7a2e4a',
    note: 'Pink paper with little hearts in the margins.',
    motif: 'hearts',
    group: 'classic',
  },
  {
    id: 'stars',
    name: 'Stars',
    frame: '#1e2a4a',
    caption: '#ffd98a',
    note: 'Night blue with gold stars in the margins.',
    motif: 'stars',
    group: 'classic',
  },
  {
    id: 'birthday',
    name: 'Birthday',
    frame: '#fff6d8',
    caption: '#b34700',
    note: 'Butter yellow with HAPPY BIRTHDAY between the shots.',
    dividerText: 'HAPPY BIRTHDAY',
    group: 'classic',
  },
  {
    id: 'doodle',
    name: 'Doodle',
    frame: '#fdf8ec',
    caption: '#2b2118',
    note: 'Warm paper with star doodles in the margins.',
    motif: 'stars',
    group: 'classic',
  },
  // From the reel — papers and finishes, as named there.
  {
    id: 'white-satin',
    name: 'White satin',
    frame: '#fbf6ee',
    caption: '#2b2118',
    note: 'Plain white satin paper, from the reel.',
    group: 'reel',
  },
  {
    id: 'blue-paper',
    name: 'Blue paper',
    frame: '#a9c6de',
    caption: '#1e2a4a',
    note: 'Light blue paper, from the reel.',
    group: 'reel',
  },
  {
    id: 'pink-paper',
    name: 'Pink paper',
    frame: '#f5c3d3',
    caption: '#7a2e4a',
    note: 'Pink paper, from the reel.',
    group: 'reel',
  },
  {
    id: 'ink-dots',
    name: 'Ink dots',
    frame: '#fdf8ec',
    caption: '#2b2118',
    note: 'Cream paper with ink dots, from the reel.',
    pattern: { kind: 'dots', color: '#2b2118', gap: 120, r: 6 },
    group: 'reel',
  },
  {
    id: 'pink-stripes',
    name: 'Pink stripes',
    frame: '#f5c3d3',
    caption: '#7a2e4a',
    note: 'Pink stripes paper, from the reel.',
    pattern: { kind: 'stripes', colors: ['#f5c3d3', '#fdf8ec'], width: 26 },
    group: 'reel',
  },
  {
    id: 'burgundy-corduroy',
    name: 'Burgundy corduroy',
    frame: '#6e1423',
    caption: '#ffd98a',
    note: 'Burgundy corduroy paper, from the reel.',
    pattern: { kind: 'stripes', colors: ['#6e1423', '#57101d'], width: 18 },
    group: 'reel',
  },
  {
    id: 'dark-denim',
    name: 'Dark denim',
    frame: '#232e4a',
    caption: '#ffd98a',
    note: 'Dark denim paper with gold stars, from the reel.',
    motif: 'stars',
    pattern: { kind: 'stripes', colors: ['#232e4a', '#2c3a5e'], width: 20 },
    group: 'reel',
  },
  {
    id: 'star-mix',
    name: 'Star mix',
    frame: '#fdf8ec',
    caption: '#2b2118',
    note: 'Scattered stars finish, from the reel.',
    pattern: { kind: 'stars', colors: ['#ffd98a', '#ffffff', '#ff8fb3'], count: 42 },
    group: 'reel',
  },
  {
    id: 'bedazzle',
    name: 'Bedazzle',
    frame: '#f5c3d3',
    caption: '#7a2e4a',
    note: 'Gem-dot bedazzle finish, from the reel.',
    pattern: { kind: 'glitter', colors: ['#ffffff', '#ffd98a', '#ff8fb3'], count: 70 },
    group: 'reel',
  },
  {
    id: 'vintage-lace',
    name: 'Vintage lace',
    frame: '#fdf8ec',
    caption: '#2b2118',
    note: 'White lace doily frame, from the reel.',
    pattern: { kind: 'lace', color: '#ffffff' },
    captionFont: 'script',
    group: 'reel',
  },
  // Templates — drawn from the template inspirations, original code art.
  {
    id: 'chalk-lights',
    name: 'Chalk lights',
    frame: '#1e1a17',
    caption: '#f5f0e6',
    note: 'Chalkboard with string lights along the top.',
    pattern: { kind: 'lights' },
    captionFont: 'typewriter',
    group: 'template',
  },
  {
    id: 'gold-glitz',
    name: 'Gold glitz',
    frame: '#1c1c1e',
    caption: '#ffd98a',
    note: 'Black with a gold glitter border.',
    pattern: { kind: 'glitter', colors: ['#ffd98a', '#fff3c4', '#d9a441'], count: 90 },
    group: 'template',
  },
  {
    id: 'pink-glitz',
    name: 'Pink glitz',
    frame: '#f5c3d3',
    caption: '#7a2e4a',
    note: 'Pink with a glitter border.',
    pattern: { kind: 'glitter', colors: ['#ffffff', '#ff8fb3', '#ffd98a'], count: 90 },
    group: 'template',
  },
  {
    id: 'rustic-lace',
    name: 'Rustic lace',
    frame: '#8a6a4d',
    caption: '#fdf8ec',
    note: 'Rustic wood brown with a lace frame.',
    pattern: { kind: 'lace', color: '#f5ead6' },
    captionFont: 'script',
    group: 'template',
  },
  {
    id: 'polka-stars',
    name: 'Polka stars',
    frame: '#fdf8ec',
    caption: '#c93a3a',
    note: 'Cream with red polka dots and stars.',
    motif: 'stars',
    pattern: { kind: 'dots', color: '#c93a3a', gap: 120, r: 15 },
    group: 'template',
  },
  {
    id: 'stamp-memories',
    name: 'Stamp memories',
    frame: '#211d1a',
    caption: '#f5f0e6',
    note: 'Stamp-edged photos with bows, Memories between shots.',
    pattern: { kind: 'stamp' },
    dividerText: 'Memories',
    captionFont: 'typewriter',
    group: 'template',
  },
  {
    id: 'limited-edition',
    name: 'Limited edition',
    frame: '#4a3626',
    caption: '#f2e3b3',
    note: 'Brown with cream dots and a bubble caption.',
    pattern: { kind: 'dots', color: '#f2e3b3', gap: 96, r: 13 },
    captionFont: 'bubble',
    group: 'template',
  },
  {
    id: 'checker-pop',
    name: 'Checker pop',
    frame: '#fdf8ec',
    caption: '#2b2118',
    note: 'Bold checkerboard border.',
    pattern: { kind: 'checker', color: '#2b2118', size: 36 },
    group: 'template',
  },
  {
    id: 'cherry-doodle',
    name: 'Cherry doodle',
    frame: '#ffe9f0',
    caption: '#7a2e4a',
    note: 'Pastel pink with cherry, flower and smiley doodles.',
    pattern: { kind: 'doodles' },
    group: 'template',
  },
  {
    id: 'floral-corners',
    name: 'Floral corners',
    frame: '#fdf8ec',
    caption: '#7a2e4a',
    note: 'Cream with flower clusters in the corners.',
    pattern: { kind: 'floral', colors: ['#ff8fb3', '#ffd98a', '#46a758'] },
    captionFont: 'script',
    group: 'template',
  },
];

export function boothStyleById(id: string): BoothStyle {
  return BOOTH_STYLES.find((s) => s.id === id) ?? BOOTH_STYLES[0]!;
}

/** Instagram-story size for the finished strip. */
export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;

/** Photos per strip. */
export const STRIP_SHOTS = 3;

export interface StripSlot {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Slot layout for a vertical strip: `count` photos stacked with a
 * margin and a caption band at the bottom. All units are canvas pixels
 * for a canvas of the given size.
 */
export function stripLayout(
  canvasW: number,
  canvasH: number,
  count: number,
  margin = 48,
  captionH = 160,
): { slots: StripSlot[]; caption: { x: number; y: number; w: number; h: number } } {
  const innerW = canvasW - margin * 2;
  const photoArea = canvasH - margin * 2 - captionH;
  const gap = Math.round(margin / 2);
  const slotH = Math.floor((photoArea - gap * (count - 1)) / count);
  const slots: StripSlot[] = [];
  for (let i = 0; i < count; i++) {
    slots.push({
      x: margin,
      y: margin + i * (slotH + gap),
      w: innerW,
      h: slotH,
    });
  }
  return {
    slots,
    caption: { x: margin, y: canvasH - margin - captionH, w: innerW, h: captionH },
  };
}

/** Countdown seconds before each shot. */
export const COUNTDOWN_SECONDS = 3;

/** Whether the Web Share API can share files here (guarded, never throws). */
export function canShareFiles(): boolean {
  try {
    const nav = globalThis.navigator as unknown as
      | { share?: unknown; canShare?: (d: { files: File[] }) => boolean }
      | undefined;
    if (!nav || typeof nav.share !== 'function') return false;
    if (typeof nav.canShare === 'function') {
      const probe = new File(['x'], 'probe.png', { type: 'image/png' });
      return nav.canShare({ files: [probe] });
    }
    return true;
  } catch {
    return false;
  }
}

// ------------------------------------------------------- Phase 1: capture ----

/** Pose card shown before each countdown, so there is time to pose. */
export const POSE_PAUSE_MS = 3000;
/** Beat after a capture before the next pose card appears. */
export const AFTER_SHOT_MS = 800;

export interface PoseIdea {
  id: string;
  title: string;
  hint: string;
  emoji: string;
  /** Real pose photo shown on the meme card instead of the emoji. */
  image?: string;
}

export const POSE_IDEAS: PoseIdea[] = [
  { id: 'chin-hand', title: 'Chin on hand', hint: 'Rest your chin on the back of your hand.', emoji: '🤔' },
  { id: 'soft-smile', title: 'Soft smile', hint: 'Tilt your head and smile softly.', emoji: '🙂' },
  { id: 'cheek-to-cheek', title: 'Cheek to cheek', hint: 'Lean in until your cheeks touch.', emoji: '😊' },
  { id: 'foreheads', title: 'Foreheads together', hint: 'Foreheads together, eyes closed.', emoji: '😌' },
  { id: 'arms-up', title: 'Arms up', hint: 'Both arms up over your head, big smile.', emoji: '🙌' },
  { id: 'hand-cheek', title: 'Hand on cheek', hint: 'One hand on your cheek, look at the camera.', emoji: '🤗' },
  { id: 'peace', title: 'Peace signs', hint: 'Both flash a peace sign.', emoji: '✌️' },
  { id: 'silly', title: 'Silly face', hint: 'The silliest face you can make.', emoji: '🤪' },
  { id: 'eyes-closed', title: 'Eyes closed, smile', hint: 'Eyes closed, just smile.', emoji: '😄' },
  { id: 'over-shoulder', title: 'Over the shoulder', hint: 'Look back over your shoulder.', emoji: '😉' },
  { id: 'heart-cheek', title: 'Finger heart', hint: 'A finger heart on your cheek.', emoji: '🫶' },
  { id: 'back-to-back', title: 'Back to back', hint: 'Stand back to back, arms crossed.', emoji: '😎' },
];

/** Pick `count` poses from a list, shuffled, cycling only after exhausting it. */
export function pickPoses(
  list: PoseIdea[],
  count: number,
  rng: () => number = Math.random,
): PoseIdea[] {
  if (list.length === 0 || count <= 0) return [];
  const out: PoseIdea[] = [];
  let pool = [...list];
  while (out.length < count) {
    if (pool.length === 0) pool = [...list];
    const i = Math.floor(rng() * pool.length);
    out.push(pool.splice(i, 1)[0]!);
  }
  return out;
}

export type ShotEvent =
  | { at: number; type: 'pose'; shot: number }
  | { at: number; type: 'tick'; shot: number; count: number }
  | { at: number; type: 'capture'; shot: number }
  | { at: number; type: 'done' };

/**
 * The real booth schedule: for EVERY shot, a pose card, then a full
 * 3-2-1 countdown, then the capture — never a rapid-fire burst.
 * Times are relative ms from the schedule start.
 */
export function shotTimeline(
  shotCount: number,
  countdownSec: number = COUNTDOWN_SECONDS,
  posePauseMs: number = POSE_PAUSE_MS,
  afterShotMs: number = AFTER_SHOT_MS,
): ShotEvent[] {
  const events: ShotEvent[] = [];
  let t = 0;
  for (let shot = 0; shot < shotCount; shot++) {
    events.push({ at: t, type: 'pose', shot });
    t += posePauseMs;
    for (let s = countdownSec; s >= 1; s--) {
      events.push({ at: t, type: 'tick', shot, count: s });
      t += 1000;
    }
    events.push({ at: t, type: 'capture', shot });
    t += afterShotMs;
  }
  events.push({ at: t, type: 'done' });
  return events;
}

/** A strip may only composite when every slot has a shot — no blank gaps. */
export function canComposite(have: number, need: number): boolean {
  return have >= need;
}

// ------------------------------------------------------- Phase 2: capture ----

/** Shot-count choices offered before a run. */
export const SHOT_COUNT_OPTIONS = [3, 4] as const;

// ------------------------------------------------------------- Phase 3: looks ----

/** A texture or wash painted over the exported strip, on top of the
 * colour grade. Live tiles show the grade only (they play the camera
 * feed through the CSS string); the overlays appear on export — and
 * in the try-a-template sample, which renders through the same
 * painter. All overlays are code-drawn: no image assets. */
export type FilterOverlay =
  | { kind: 'tint'; color: string; alpha: number; blend: 'screen' | 'soft-light' | 'multiply' }
  | { kind: 'gradient'; colors: [string, string]; alpha: number; blend: 'screen' | 'soft-light' | 'multiply' }
  | { kind: 'vignette'; color: string; alpha: number; blend: 'screen' | 'soft-light' | 'multiply' }
  | { kind: 'glow'; color: string; alpha: number; blend: 'screen' | 'soft-light' }
  | { kind: 'stars'; colors: string[]; count: number; alpha: number }
  | { kind: 'scanlines'; alpha: number }
  | { kind: 'grain'; alpha: number }
  | { kind: 'orton'; alpha: number; blur: number };

export interface BoothFilter {
  id: string;
  name: string;
  /** CSS filter string: used live on the preview and on the canvas. */
  css: string;
  /** Export-only grade when it differs from live (Dreamy Haze drops
   * its blur on export and gets the Orton bloom instead). */
  exportCss?: string;
  /** Export-only overlays, painted over the photos, under the caption. */
  overlays?: FilterOverlay[];
  /** Short note shown on the tile (e.g. a pairing hint). */
  note?: string;
}

export const BOOTH_FILTERS: BoothFilter[] = [
  { id: 'original', name: 'Original', css: '' },
  { id: 'bw', name: 'B&W', css: 'grayscale(1)' },
  { id: 'sepia', name: 'Sepia', css: 'sepia(1)' },
  { id: 'vintage', name: 'Vintage', css: 'sepia(0.6) contrast(1.1) brightness(1.05)' },
  { id: 'warm', name: 'Warm', css: 'sepia(0.3) saturate(1.3)' },
  { id: 'cool', name: 'Cool', css: 'brightness(1.05) contrast(1.05) saturate(0.85) hue-rotate(10deg)' },
  { id: 'noir', name: 'Noir', css: 'grayscale(1) contrast(1.3)' },
  { id: 'soft', name: 'Soft', css: 'brightness(1.1) saturate(0.9)' },
  { id: 'film', name: 'Film', css: 'contrast(1.15) saturate(1.2)' },
  { id: 'golden', name: 'Golden', css: 'sepia(0.4) saturate(1.4) contrast(1.05)' },
  // Cute / aesthetic / girly-pop set (researched Oct 2026 — see the
  // Cute Filters catalogue). Grades are starting values: tune on
  // real couple photos, darkest skin first, before calling them final.
  {
    id: 'strawberry-milk',
    name: 'Strawberry Milk',
    css: 'brightness(1.07) contrast(0.88) saturate(1.02) hue-rotate(-8deg) sepia(0.08)',
    overlays: [{ kind: 'tint', color: '#ffc9d6', alpha: 0.12, blend: 'screen' }],
    note: 'Milky, faded peach-pink.',
  },
  {
    id: 'rosy-blush',
    name: 'Rosy Blush',
    css: 'brightness(1.06) contrast(1.05) saturate(1.18) hue-rotate(-6deg) sepia(0.05)',
    overlays: [{ kind: 'vignette', color: '#ff8fb3', alpha: 0.2, blend: 'soft-light' }],
    note: 'Flushed, lively pink.',
  },
  {
    id: 'coquette-pink',
    name: 'Coquette Pink',
    css: 'brightness(1.10) contrast(0.94) saturate(0.95) hue-rotate(-10deg) sepia(0.04)',
    overlays: [{ kind: 'vignette', color: '#ffd9e6', alpha: 0.22, blend: 'soft-light' }],
    note: 'Pale porcelain ballet-pink.',
  },
  {
    id: 'pastel-dream',
    name: 'Pastel Dream',
    css: 'brightness(1.08) contrast(0.92) saturate(0.85) hue-rotate(-8deg)',
    overlays: [{ kind: 'gradient', colors: ['#d9c8ff', '#ffc9d6'], alpha: 0.12, blend: 'soft-light' }],
    note: 'Airy all-pastel wash. Cool + desaturated: check on brown skin.',
  },
  {
    id: 'sparkle-pop',
    name: 'Sparkle Pop',
    css: 'brightness(1.12) contrast(1.02) saturate(1.12)',
    overlays: [
      { kind: 'tint', color: '#ffffff', alpha: 0.1, blend: 'screen' },
      { kind: 'stars', colors: ['#ffffff', '#ffd98a'], count: 90, alpha: 0.4 },
    ],
    note: 'Bright + glitter stars.',
  },
  {
    id: 'chrome-bubble',
    name: 'Chrome Bubble',
    css: 'brightness(1.05) contrast(1.18) saturate(0.95) hue-rotate(8deg)',
    overlays: [{ kind: 'gradient', colors: ['#c8d8e8', '#e8eef5'], alpha: 0.15, blend: 'soft-light' }],
    note: 'Cool metallic Y2K. Cool + contrasty: check on brown skin.',
  },
  {
    id: 'clean-girl',
    name: 'Clean Girl Glow',
    css: 'brightness(1.06) contrast(1.02) saturate(1.05)',
    overlays: [{ kind: 'tint', color: '#fff6e8', alpha: 0.08, blend: 'screen' }],
    note: 'Dewy, natural — skin but better. Safest across skin tones.',
  },
  {
    id: 'latte-cream',
    name: 'Latte Cream',
    css: 'brightness(1.03) contrast(0.98) saturate(0.92) sepia(0.22) hue-rotate(-5deg)',
    overlays: [{ kind: 'tint', color: '#d9a066', alpha: 0.14, blend: 'soft-light' }],
    note: 'Warm caramel-beige, muted. Safest across skin tones.',
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    css: 'brightness(1.08) contrast(1.08) saturate(1.20) sepia(0.15) hue-rotate(-8deg)',
    overlays: [{ kind: 'gradient', colors: ['#ffe1a8', '#ffb347'], alpha: 0.18, blend: 'soft-light' }],
    note: 'Honey-amber sunset. Safest across skin tones.',
  },
  {
    id: 'film-flash',
    name: 'Film Flash',
    css: 'brightness(1.12) contrast(1.18) saturate(1.22)',
    overlays: [
      { kind: 'vignette', color: '#000000', alpha: 0.25, blend: 'multiply' },
      { kind: 'glow', color: '#ffffff', alpha: 0.15, blend: 'screen' },
      { kind: 'grain', alpha: 0.08 },
    ],
    note: 'Bright digicam flash, punchy. Watch couple shots: can blow one partner out.',
  },
  {
    id: 'retro-camcorder',
    name: 'Retro Camcorder',
    css: 'brightness(0.98) contrast(1.05) saturate(0.85) sepia(0.18) hue-rotate(-4deg)',
    overlays: [
      { kind: 'scanlines', alpha: 0.15 },
      { kind: 'grain', alpha: 0.1 },
    ],
    note: 'Warm muted VHS + scanlines. Pair with the Date chip for the camcorder date stamp.',
  },
  {
    id: 'dreamy-haze',
    name: 'Dreamy Haze',
    css: 'brightness(1.10) contrast(0.90) saturate(0.95) blur(0.4px)',
    exportCss: 'brightness(1.10) contrast(0.90) saturate(0.95)',
    overlays: [
      { kind: 'tint', color: '#ffffff', alpha: 0.12, blend: 'screen' },
      { kind: 'orton', alpha: 0.35, blur: 8 },
    ],
    note: 'Soft bloom, romantic. Bright + low contrast: check on brown skin.',
  },
];

export function boothFilterById(id: string): BoothFilter {
  return BOOTH_FILTERS.find((f) => f.id === id) ?? BOOTH_FILTERS[0]!;
}

export type BoothLayout = 'strip' | 'grid' | 'polaroid';

export const BOOTH_LAYOUTS: { id: BoothLayout; name: string; note: string }[] = [
  { id: 'strip', name: 'Strip', note: 'Classic vertical strip, 3 or 4 shots.' },
  { id: 'grid', name: '2×2 grid', note: 'Four shots in a square grid.' },
  { id: 'polaroid', name: 'Polaroid', note: 'One big shot, like an instant photo.' },
];

/**
 * Slot layout for any booth layout. Grid always has 4 slots, polaroid
 * always 1; strip uses `count`. All slots stay inside the canvas.
 */
export function layoutSlots(
  layout: BoothLayout,
  canvasW: number,
  canvasH: number,
  count: number,
  margin = 48,
  captionH = 160,
): { slots: StripSlot[]; caption: { x: number; y: number; w: number; h: number } } {
  if (layout === 'grid') {
    const innerW = canvasW - margin * 2;
    const photoArea = canvasH - margin * 2 - captionH;
    const gap = Math.round(margin / 2);
    const w = Math.floor((innerW - gap) / 2);
    const h = Math.floor((photoArea - gap) / 2);
    const slots: StripSlot[] = [];
    for (let i = 0; i < 4; i++) {
      slots.push({
        x: margin + (i % 2) * (w + gap),
        y: margin + Math.floor(i / 2) * (h + gap),
        w,
        h,
      });
    }
    return { slots, caption: { x: margin, y: canvasH - margin - captionH, w: innerW, h: captionH } };
  }
  if (layout === 'polaroid') {
    const innerW = canvasW - margin * 2;
    const photoArea = canvasH - margin * 2 - captionH;
    return {
      slots: [{ x: margin, y: margin, w: innerW, h: photoArea }],
      caption: { x: margin, y: canvasH - margin - captionH, w: innerW, h: captionH },
    };
  }
  return stripLayout(canvasW, canvasH, count, margin, captionH);
}

/** Date line for the optional date stamp, e.g. "25 Oct 2026". */
export function stripDateLine(d: Date = new Date()): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ------------------------------------------------------- Phase 4: meme booth ----

export const MEME_POSES: PoseIdea[] = [
  { id: 'cat-ears', title: 'Cat ears', hint: 'Both do cat ears above your heads.', emoji: '🐱', image: '/booth/meme-poses/cat-ears.jpg' },
  { id: 'heart-hands', title: 'Heart hands', hint: 'Make one big heart with all four hands.', emoji: '🫶', image: '/booth/meme-poses/heart-hands.jpg' },
  { id: 'cheek-heart', title: 'Cheek heart', hint: 'Cheek to cheek, finger heart on the cheek.', emoji: '😘', image: '/booth/meme-poses/cheek-heart.jpg' },
  { id: 'forehead-kiss', title: 'Forehead kiss', hint: 'Foreheads together, eyes closed, soft smile.', emoji: '💋' },
  { id: 'back-hug', title: 'Back hug', hint: 'One hugs the other from behind.', emoji: '🤗', image: '/booth/meme-poses/back-hug.jpg' },
  { id: 'piggyback', title: 'Piggyback', hint: 'Piggyback, both laughing.', emoji: '🐴' },
  { id: 'mirror-twins', title: 'Mirror twins', hint: 'Copy each other’s pose exactly.', emoji: '🪞' },
  { id: 'silly-tongues', title: 'Silly tongues', hint: 'Both stick your tongues out.', emoji: '😜' },
  { id: 'nose-boop', title: 'Nose boop', hint: 'Touch noses, cross your eyes.', emoji: '👃' },
  { id: 'movie-stars', title: 'Movie stars', hint: 'Dramatic over-the-shoulder look.', emoji: '🎬' },
];

export const POSE_PACKS: { id: string; name: string; poses: PoseIdea[] }[] = [
  { id: 'classic', name: 'Pose ideas', poses: POSE_IDEAS },
  { id: 'meme', name: 'Meme poses', poses: MEME_POSES },
];

export function posePackById(id: string): { id: string; name: string; poses: PoseIdea[] } {
  return POSE_PACKS.find((p) => p.id === id) ?? POSE_PACKS[0]!;
}

// ------------------------------------------------------------- Phase 5: studio ----

export interface StripOverlay {
  id: string;
  kind: 'sticker' | 'text';
  /** Emoji for stickers, words for text. */
  text: string;
  /** Relative position on the strip, 0..1. */
  x: number;
  y: number;
  /** Font size in strip pixels (1080-wide canvas). */
  size: number;
  color?: string;
  font?: string;
  glow?: boolean;
  box?: boolean;
}

export const STICKER_PACKS: { id: string; name: string; items: string[] }[] = [
  { id: 'hearts', name: 'Hearts', items: ['💕', '💖', '💘', '❤️', '💗'] },
  { id: 'stars', name: 'Stars', items: ['⭐', '✨', '🌟', '💫'] },
  { id: 'cats', name: 'Cats', items: ['🐱', '😺', '😸', '🐾'] },
  { id: 'party', name: 'Party', items: ['🎉', '🎈', '🥳', '🎊'] },
  { id: 'food', name: 'Food', items: ['🍰', '🧁', '🍓', '🍩'] },
];

export interface TextStyle {
  id: string;
  name: string;
  font: (size: number) => string;
  glow?: boolean;
  box?: boolean;
}

export const TEXT_STYLES: TextStyle[] = [
  { id: 'marker', name: 'Marker', font: (s) => `800 ${s}px Arial, sans-serif` },
  { id: 'typewriter', name: 'Typewriter', font: (s) => `${s}px "Courier New", monospace` },
  { id: 'neon', name: 'Neon', font: (s) => `800 ${s}px Arial, sans-serif`, glow: true },
  { id: 'label', name: 'Label', font: (s) => `700 ${s}px Arial, sans-serif`, box: true },
  { id: 'script', name: 'Script', font: (s) => `italic ${s}px Georgia, serif` },
];

export function textStyleById(id: string): TextStyle {
  return TEXT_STYLES.find((t) => t.id === id) ?? TEXT_STYLES[0]!;
}

export type ScrapbookShape = '4:5' | '9:16';

/** Scrapbook page size for a finished strip. */
export function scrapbookPageSize(shape: ScrapbookShape): { w: number; h: number } {
  return shape === '4:5' ? { w: 1080, h: 1350 } : { w: 1080, h: 1920 };
}

// ------------------------------------------------------- Phase 6: together ----

/** Interleave two phones' shots into one shared strip: mine, theirs, mine… */
export function interleaveShots(mine: string[], theirs: string[]): string[] {
  const out: string[] = [];
  const n = Math.max(mine.length, theirs.length);
  for (let i = 0; i < n; i++) {
    if (i < mine.length) out.push(mine[i]!);
    if (i < theirs.length) out.push(theirs[i]!);
  }
  return out;
}

/** Shooter label per shot for duo-turns mode on one phone. */
export function duoTurnNames(count: number, nameA: string, nameB: string): string[] {
  return Array.from({ length: count }, (_, i) => (i % 2 === 0 ? nameA : nameB));
}
