/* Pure camera/world math for the full-page evidence-board canvas.
 * The canvas world is a fixed 3000x2000px plane; the camera maps it to the
 * viewport: screen = world * scale + offset. Positions shared with the room
 * stay in % coords (PinPos 0..100) and convert linearly to world px. */

export const WORLD_W = 3000;
export const WORLD_H = 2000;
export const MIN_SCALE = 0.4;
export const MAX_SCALE = 2;

export interface Camera {
  /** screen px offset of the world origin */
  x: number;
  y: number;
  scale: number;
}

export interface Pt {
  x: number;
  y: number;
}

export function worldToScreen(p: Pt, cam: Camera): Pt {
  return { x: p.x * cam.scale + cam.x, y: p.y * cam.scale + cam.y };
}

export function screenToWorld(p: Pt, cam: Camera): Pt {
  return { x: (p.x - cam.x) / cam.scale, y: (p.y - cam.y) / cam.scale };
}

export function clampScale(s: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
}

/** Camera that fits the whole world into the viewport, centered. */
export function fitCamera(vw: number, vh: number, pad = 0.96): Camera {
  const scale = clampScale(Math.min(vw / WORLD_W, vh / WORLD_H) * pad);
  return {
    scale,
    x: (vw - WORLD_W * scale) / 2,
    y: (vh - WORLD_H * scale) / 2,
  };
}

/** Zoom keeping the screen point `at` anchored to the same world point. */
export function zoomToward(cam: Camera, at: Pt, factor: number): Camera {
  const scale = clampScale(cam.scale * factor);
  if (scale === cam.scale) return cam;
  const k = scale / cam.scale;
  return {
    scale,
    x: at.x - (at.x - cam.x) * k,
    y: at.y - (at.y - cam.y) * k,
  };
}

/** Shared % coords (0..100) -> world px. */
export function pctToWorld(p: { x: number; y: number }): Pt {
  return { x: (p.x / 100) * WORLD_W, y: (p.y / 100) * WORLD_H };
}

/** World px -> shared % coords. */
export function worldToPct(p: Pt): { x: number; y: number } {
  return { x: (p.x / WORLD_W) * 100, y: (p.y / WORLD_H) * 100 };
}

/** Pin point (top-center, where the red pin sits) for a card rect. */
export function cardPin(card: { x: number; y: number; w: number }): Pt {
  return { x: card.x + card.w / 2, y: card.y + 10 };
}
