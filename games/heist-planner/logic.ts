/* Heist Planner — pure rules: laser cycles, camera cones, guard patrols,
 * waypoint validation, and turn-by-turn execution. No React. */

import type { Camera, Compass, Guard, HeistMap, Laser, XY } from './types';

export const MAX_ALARMS = 3;

export const key = (x: number, y: number) => `${x},${y}`;
export const same = (a: XY, b: XY) => a.x === b.x && a.y === b.y;

/* ---------- lasers ---------- */

/** Live during the first half of each cycle. */
export function laserActive(laser: Laser, tick: number): boolean {
  return (tick + laser.offset) % laser.period < laser.period / 2;
}

/* ---------- cameras ---------- */

const COMPASS_ORDER: Compass[] = ['N', 'E', 'S', 'W'];

export function cameraDir(cam: Camera, tick: number): Compass {
  if (!cam.sweep) return cam.dir;
  const base = COMPASS_ORDER.indexOf(cam.dir);
  return COMPASS_ORDER[(base + Math.floor(tick / cam.sweep)) % 4];
}

/**
 * Cells inside the camera's 90° cone at this tick. Walls block the view:
 * a fine center-to-center ray that crosses any wall cell hides everything
 * behind it.
 */
export function cameraCone(map: HeistMap, cam: Camera, tick: number): Set<string> {
  const dir = cameraDir(cam, tick);
  const walls = new Set(map.walls.map((w) => key(w.x, w.y)));
  const seen = new Set<string>();

  const blocked = (tx: number, ty: number): boolean => {
    const dx = tx - cam.x;
    const dy = ty - cam.y;
    const dist = Math.max(Math.abs(dx), Math.abs(dy));
    for (let i = 1; i <= dist * 8; i++) {
      const t = i / (dist * 8);
      const cx = Math.floor(cam.x + 0.5 + dx * t);
      const cy = Math.floor(cam.y + 0.5 + dy * t);
      if (cx === tx && cy === ty) break;
      if (walls.has(key(cx, cy))) return true;
    }
    return false;
  };

  for (let d = 1; d <= cam.range; d++) {
    for (let l = -d; l <= d; l++) {
      let cx = cam.x;
      let cy = cam.y;
      if (dir === 'N') { cx = cam.x + l; cy = cam.y - d; }
      if (dir === 'S') { cx = cam.x + l; cy = cam.y + d; }
      if (dir === 'E') { cx = cam.x + d; cy = cam.y + l; }
      if (dir === 'W') { cx = cam.x - d; cy = cam.y + l; }
      if (cx < 0 || cy < 0 || cx >= map.width || cy >= map.height) continue;
      if (walls.has(key(cx, cy))) continue;
      if (blocked(cx, cy)) continue;
      seen.add(key(cx, cy));
    }
  }
  return seen;
}

/* ---------- guards ---------- */

export function guardAt(guard: Guard, tick: number): XY {
  return guard.route[((tick % guard.route.length) + guard.route.length) % guard.route.length];
}

/* ---------- danger ---------- */

export interface Danger {
  laser: boolean;
  camera: boolean;
  guard: string | null;
}

export function tileDanger(map: HeistMap, x: number, y: number, tick: number): Danger {
  const laser = map.lasers.some((l) => l.x === x && l.y === y && laserActive(l, tick));
  const camera = map.cameras.some((c) => cameraCone(map, c, tick).has(key(x, y)));
  const g = map.guards.find((grd) => {
    const p = guardAt(grd, tick);
    return p.x === x && p.y === y;
  });
  return { laser, camera, guard: g ? g.name : null };
}

export function dangerText(d: Danger): string {
  const parts: string[] = [];
  if (d.laser) parts.push('laser grid');
  if (d.camera) parts.push('camera cone');
  if (d.guard) parts.push(`${d.guard} the guard`);
  return parts.join(' + ');
}

/* ---------- planning ---------- */

/** Waypoint rules: inside the grid, not a wall, not entry, not a repeat of
 *  the previous waypoint, and not adjacent-duplicate. */
export function canPlace(map: HeistMap, plan: XY[], x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return false;
  if (map.walls.some((w) => w.x === x && w.y === y)) return false;
  if (same(map.entry, { x, y })) return false;
  const last = plan[plan.length - 1];
  if (last && same(last, { x, y })) return false;
  return true;
}

/** Execution path: entry first, then the agreed waypoints. */
export function buildPath(map: HeistMap, plan: XY[]): XY[] {
  return [map.entry, ...plan];
}

/* ---------- execution ---------- */

export interface StepResult {
  stepIdx: number;
  tick: number;
  alarms: number;
  events: string[];
  won: boolean;
  failed: boolean;
}

/**
 * Advance the crew one waypoint. Hazards are evaluated at the NEW tick
 * (guards/lasers/cameras all move first, then the crew steps).
 */
export function stepHeist(
  map: HeistMap,
  plan: XY[],
  stepIdx: number,
  tick: number,
  alarms: number,
): StepResult {
  const path = buildPath(map, plan);
  const events: string[] = [];
  if (stepIdx >= path.length - 1) {
    return { stepIdx, tick, alarms, events, won: same(path[stepIdx], map.vault), failed: false };
  }
  const next = path[stepIdx + 1];
  const ntick = tick + 1;
  const danger = tileDanger(map, next.x, next.y, ntick);

  if (danger.laser || danger.camera || danger.guard) {
    const na = alarms + 1;
    events.push(
      `🚨 Alarm ${na}/${MAX_ALARMS} — crew spotted by ${dangerText(danger)} at (${next.x},${next.y}), tick ${ntick}. Fell back.`,
    );
    return {
      stepIdx, // token bounces back to the previous waypoint
      tick: ntick,
      alarms: na,
      events,
      won: false,
      failed: na >= MAX_ALARMS,
    };
  }

  const nidx = stepIdx + 1;
  const won = same(next, map.vault);
  events.push(
    won
      ? `🏦 VAULT REACHED at tick ${ntick}. The score is ours.`
      : `→ Crew moved to (${next.x},${next.y}) — tick ${ntick}, all quiet.`,
  );
  return { stepIdx: nidx, tick: ntick, alarms, events, won, failed: false };
}

/* ---------- map sanity (used by tests) ---------- */

export function validateMap(map: HeistMap): string[] {
  const errs: string[] = [];
  const inBounds = (p: XY) => p.x >= 0 && p.y >= 0 && p.x < map.width && p.y < map.height;
  if (!inBounds(map.entry)) errs.push('entry out of bounds');
  if (!inBounds(map.vault)) errs.push('vault out of bounds');
  for (const w of map.walls) {
    if (!inBounds(w)) errs.push(`wall (${w.x},${w.y}) out of bounds`);
    if (same(w, map.entry)) errs.push('wall on entry');
    if (same(w, map.vault)) errs.push('wall on vault');
  }
  const wallSet = new Set(map.walls.map((w) => key(w.x, w.y)));
  for (const g of map.guards) {
    if (g.route.length === 0) errs.push(`guard ${g.name} has empty route`);
    for (const p of g.route) {
      if (!inBounds(p)) errs.push(`guard ${g.name} route out of bounds`);
      if (wallSet.has(key(p.x, p.y))) errs.push(`guard ${g.name} patrols through a wall`);
    }
  }
  return errs;
}
