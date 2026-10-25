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

export interface BoothStyle {
  id: string;
  name: string;
  frame: string;
  caption: string;
  note: string;
  /** Small shapes drawn in the strip margins. */
  motif?: 'hearts' | 'stars';
  /** Words printed in the gaps between photos. */
  dividerText?: string;
}

export const BOOTH_STYLES: BoothStyle[] = [
  {
    id: 'classic',
    name: 'Classic strip',
    frame: '#fdf8ec',
    caption: '#2b2118',
    note: 'The old-school booth strip, warm paper and a plain border.',
  },
  {
    id: '35mm',
    name: '35mm',
    frame: '#1c1c1e',
    caption: '#f5f0e6',
    note: 'Dark film edges with little sprocket holes, like a photo roll.',
  },
  {
    id: 'love-note',
    name: 'Love note',
    frame: '#ffe9f0',
    caption: '#7a2e4a',
    note: 'Soft pink paper, for the soppy ones.',
  },
  {
    id: 'after-hours',
    name: 'After hours',
    frame: '#1e2a4a',
    caption: '#ffd98a',
    note: 'Deep night blue with a warm lamp glow.',
  },
  {
    id: 'date-plan',
    name: 'D.A.T.E. plan',
    frame: '#fff6d8',
    caption: '#3d5a3a',
    note: 'Butter yellow, made for the date-night dice roll.',
  },
  {
    id: 'hearts',
    name: 'Hearts',
    frame: '#ffd6e0',
    caption: '#7a2e4a',
    note: 'Pink paper with little hearts in the margins.',
    motif: 'hearts',
  },
  {
    id: 'stars',
    name: 'Stars',
    frame: '#1e2a4a',
    caption: '#ffd98a',
    note: 'Night blue with gold stars in the margins.',
    motif: 'stars',
  },
  {
    id: 'birthday',
    name: 'Birthday',
    frame: '#fff6d8',
    caption: '#b34700',
    note: 'Butter yellow with HAPPY BIRTHDAY between the shots.',
    dividerText: 'HAPPY BIRTHDAY',
  },
  {
    id: 'doodle',
    name: 'Doodle',
    frame: '#fdf8ec',
    caption: '#2b2118',
    note: 'Warm paper with star doodles in the margins.',
    motif: 'stars',
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

export interface BoothFilter {
  id: string;
  name: string;
  /** CSS filter string: used live on the preview and on the canvas. */
  css: string;
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
  { id: 'cat-ears', title: 'Cat ears', hint: 'Both do cat ears above your heads.', emoji: '🐱' },
  { id: 'heart-hands', title: 'Heart hands', hint: 'Make one big heart with all four hands.', emoji: '🫶' },
  { id: 'cheek-heart', title: 'Cheek heart', hint: 'Cheek to cheek, finger heart on the cheek.', emoji: '😘' },
  { id: 'forehead-kiss', title: 'Forehead kiss', hint: 'Foreheads together, eyes closed, soft smile.', emoji: '💋' },
  { id: 'back-hug', title: 'Back hug', hint: 'One hugs the other from behind.', emoji: '🤗' },
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
