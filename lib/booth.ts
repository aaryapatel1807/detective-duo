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
