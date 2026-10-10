import { describe, expect, it } from 'vitest';
import {
  WORLD_W,
  WORLD_H,
  MIN_SCALE,
  MAX_SCALE,
  fitCamera,
  zoomToward,
  clampScale,
  worldToScreen,
  screenToWorld,
  pctToWorld,
  worldToPct,
  cardPin,
  type Camera,
} from './boardMath';

describe('boardMath', () => {
  it('world<->screen round-trips', () => {
    const cam: Camera = { x: 120, y: -40, scale: 1.25 };
    const w = { x: 1500, y: 900 };
    const s = worldToScreen(w, cam);
    const back = screenToWorld(s, cam);
    expect(back.x).toBeCloseTo(w.x, 6);
    expect(back.y).toBeCloseTo(w.y, 6);
  });

  it('clamps scale to 0.4..2', () => {
    expect(clampScale(0.1)).toBe(MIN_SCALE);
    expect(clampScale(5)).toBe(MAX_SCALE);
    expect(clampScale(1)).toBe(1);
  });

  it('fitCamera centers the world in the viewport', () => {
    const cam = fitCamera(1500, 1000);
    // world center should map to viewport center
    const c = worldToScreen({ x: WORLD_W / 2, y: WORLD_H / 2 }, cam);
    expect(c.x).toBeCloseTo(750, 6);
    expect(c.y).toBeCloseTo(500, 6);
    expect(cam.scale).toBeLessThanOrEqual(MAX_SCALE);
    expect(cam.scale).toBeGreaterThanOrEqual(MIN_SCALE);
  });

  it('zoomToward keeps the cursor anchored to the same world point', () => {
    const cam: Camera = { x: 0, y: 0, scale: 1 };
    const at = { x: 400, y: 300 };
    const before = screenToWorld(at, cam);
    const after = zoomToward(cam, at, 1.5);
    const anchored = screenToWorld(at, after);
    expect(anchored.x).toBeCloseTo(before.x, 6);
    expect(anchored.y).toBeCloseTo(before.y, 6);
    expect(after.scale).toBeCloseTo(1.5, 6);
  });

  it('zoomToward respects clamps without moving the camera', () => {
    const cam: Camera = { x: 10, y: 20, scale: 1 };
    const same = zoomToward(cam, { x: 0, y: 0 }, 99);
    expect(same.scale).toBe(MAX_SCALE);
  });

  it('pct<->world converts linearly', () => {
    const w = pctToWorld({ x: 50, y: 25 });
    expect(w).toEqual({ x: WORLD_W / 2, y: WORLD_H / 4 });
    const p = worldToPct({ x: WORLD_W, y: WORLD_H });
    expect(p).toEqual({ x: 100, y: 100 });
  });

  it('cardPin is the top-center of the card', () => {
    expect(cardPin({ x: 100, y: 200, w: 220 })).toEqual({ x: 210, y: 210 });
  });
});
