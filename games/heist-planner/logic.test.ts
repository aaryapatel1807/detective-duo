/* Heist Planner logic tests. */
import { describe, expect, it } from 'vitest';
import { HEIST_MAPS } from './maps';
import {
  MAX_ALARMS,
  buildPath,
  cameraCone,
  cameraDir,
  canPlace,
  guardAt,
  laserActive,
  stepHeist,
  tileDanger,
  validateMap,
} from './logic';
import type { HeistMap } from './types';

describe('laserActive', () => {
  const laser = { x: 0, y: 0, period: 4, offset: 0 };
  it('live during first half of cycle', () => {
    expect(laserActive(laser, 0)).toBe(true);
    expect(laserActive(laser, 1)).toBe(true);
    expect(laserActive(laser, 2)).toBe(false);
    expect(laserActive(laser, 3)).toBe(false);
    expect(laserActive(laser, 4)).toBe(true); // new cycle
  });
  it('offset shifts the cycle', () => {
    const l = { x: 0, y: 0, period: 4, offset: 2 };
    expect(laserActive(l, 0)).toBe(false);
    expect(laserActive(l, 2)).toBe(true);
  });
});

describe('cameraDir', () => {
  it('fixed camera never rotates', () => {
    const cam = { x: 0, y: 0, dir: 'N' as const, range: 3, sweep: 0 };
    expect(cameraDir(cam, 99)).toBe('N');
  });
  it('sweeping camera rotates every `sweep` ticks', () => {
    const cam = { x: 0, y: 0, dir: 'N' as const, range: 3, sweep: 2 };
    expect(cameraDir(cam, 0)).toBe('N');
    expect(cameraDir(cam, 1)).toBe('N');
    expect(cameraDir(cam, 2)).toBe('E');
    expect(cameraDir(cam, 4)).toBe('S');
    expect(cameraDir(cam, 8)).toBe('N');
  });
});

describe('cameraCone', () => {
  const openMap: HeistMap = {
    id: 't', name: 't', blurb: '', difficulty: 'Easy',
    width: 8, height: 8, walls: [], entry: { x: 0, y: 7 },
    vault: { x: 7, y: 0 }, lasers: [], cameras: [], guards: [],
  };
  it('covers a wedge ahead of the camera', () => {
    const cam = { x: 4, y: 4, dir: 'N' as const, range: 2, sweep: 0 };
    const cone = cameraCone(openMap, cam, 0);
    expect(cone.has('4,3')).toBe(true); // straight ahead
    expect(cone.has('3,3')).toBe(true); // edge of wedge
    expect(cone.has('5,2')).toBe(true);
    expect(cone.has('4,5')).toBe(false); // behind
    expect(cone.has('4,4')).toBe(false); // camera tile itself
    expect(cone.has('4,1')).toBe(false); // beyond range
  });
  it('walls block the view behind them', () => {
    const walled: HeistMap = { ...openMap, walls: [{ x: 4, y: 2 }] };
    const cam = { x: 4, y: 4, dir: 'N' as const, range: 4, sweep: 0 };
    const cone = cameraCone(walled, cam, 0);
    expect(cone.has('4,3')).toBe(true);
    expect(cone.has('4,1')).toBe(false); // hidden behind the wall
    expect(cone.has('3,1')).toBe(true); // not behind the wall
  });
});

describe('guardAt', () => {
  const guard = { name: 'Rook', route: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 }] };
  it('loops the patrol route', () => {
    expect(guardAt(guard, 0)).toEqual({ x: 1, y: 1 });
    expect(guardAt(guard, 2)).toEqual({ x: 2, y: 2 });
    expect(guardAt(guard, 3)).toEqual({ x: 1, y: 1 });
    expect(guardAt(guard, 7)).toEqual({ x: 2, y: 1 });
  });
});

describe('tileDanger', () => {
  const map: HeistMap = {
    id: 't', name: 't', blurb: '', difficulty: 'Easy',
    width: 8, height: 8, walls: [], entry: { x: 0, y: 7 },
    vault: { x: 7, y: 0 },
    lasers: [{ x: 1, y: 1, period: 4, offset: 0 }],
    cameras: [{ x: 3, y: 3, dir: 'N', range: 2, sweep: 0 }],
    guards: [{ name: 'Rook', route: [{ x: 5, y: 5 }] }],
  };
  it('detects a live laser', () => {
    expect(tileDanger(map, 1, 1, 0).laser).toBe(true);
    expect(tileDanger(map, 1, 1, 3).laser).toBe(false);
  });
  it('detects a camera cone', () => {
    expect(tileDanger(map, 3, 2, 0).camera).toBe(true);
    expect(tileDanger(map, 0, 0, 0).camera).toBe(false);
  });
  it('detects a guard by name', () => {
    expect(tileDanger(map, 5, 5, 0).guard).toBe('Rook');
    expect(tileDanger(map, 4, 4, 0).guard).toBe(null);
  });
  it('quiet tile is clean', () => {
    expect(tileDanger(map, 0, 7, 0)).toEqual({ laser: false, camera: false, guard: null });
  });
});

describe('canPlace / buildPath', () => {
  const map = HEIST_MAPS[0];
  it('rejects walls, entry, and repeats', () => {
    const w = map.walls[0];
    expect(canPlace(map, [], w.x, w.y)).toBe(false);
    expect(canPlace(map, [], map.entry.x, map.entry.y)).toBe(false);
    expect(canPlace(map, [], -1, 0)).toBe(false);
    expect(canPlace(map, [], 8, 8)).toBe(false);
    expect(canPlace(map, [{ x: 1, y: 1 }], 1, 1)).toBe(false);
    expect(canPlace(map, [], 1, 1)).toBe(true);
  });
  it('buildPath prepends the entry', () => {
    const path = buildPath(map, [{ x: 1, y: 1 }]);
    expect(path[0]).toEqual(map.entry);
    expect(path[1]).toEqual({ x: 1, y: 1 });
  });
});

describe('stepHeist', () => {
  const quiet: HeistMap = {
    id: 't', name: 't', blurb: '', difficulty: 'Easy',
    width: 8, height: 8, walls: [], entry: { x: 0, y: 7 },
    vault: { x: 2, y: 7 }, lasers: [], cameras: [], guards: [],
  };
  it('steps forward quietly and wins at the vault', () => {
    const r1 = stepHeist(quiet, [{ x: 1, y: 7 }, { x: 2, y: 7 }], 0, 0, 0);
    expect(r1.stepIdx).toBe(1);
    expect(r1.tick).toBe(1);
    expect(r1.won).toBe(false);
    const r2 = stepHeist(quiet, [{ x: 1, y: 7 }, { x: 2, y: 7 }], 1, 1, 0);
    expect(r2.won).toBe(true);
    expect(r2.failed).toBe(false);
  });
  it('alarm bounces the token back and advances the tick', () => {
    const trapped: HeistMap = {
      ...quiet,
      lasers: [{ x: 1, y: 7, period: 2, offset: 0 }], // live on odd ticks
    };
    // tick 0 -> 1: (1+0)%2=1, not < 1 -> quiet
    const r1 = stepHeist(trapped, [{ x: 1, y: 7 }], 0, 0, 0);
    expect(r1.alarms).toBe(0);
    // now at (1,7); plan a second step onto a laser tile live at tick 2
    const r2 = stepHeist(trapped, [{ x: 1, y: 7 }, { x: 1, y: 7 }], 0, 1, 0);
    expect(r2.alarms).toBe(1);
    expect(r2.stepIdx).toBe(0); // bounced back
    expect(r2.tick).toBe(2);
  });
  it('third alarm fails the heist', () => {
    const trapped: HeistMap = {
      ...quiet,
      guards: [{ name: 'Rook', route: [{ x: 1, y: 7 }] }],
    };
    const r = stepHeist(trapped, [{ x: 1, y: 7 }], 0, 0, MAX_ALARMS - 1);
    expect(r.failed).toBe(true);
    expect(r.won).toBe(false);
    expect(r.alarms).toBe(MAX_ALARMS);
  });
});

describe('authored maps', () => {
  it('all 3 maps validate', () => {
    expect(HEIST_MAPS).toHaveLength(3);
    for (const m of HEIST_MAPS) {
      expect(validateMap(m)).toEqual([]);
    }
  });
  it('escalating difficulty: more hazards on harder maps', () => {
    const hazards = (m: HeistMap) =>
      m.lasers.length + m.cameras.length + m.guards.length + m.walls.length;
    const [easy, med, hard] = HEIST_MAPS;
    expect(hazards(med)).toBeGreaterThan(hazards(easy));
    expect(hazards(hard)).toBeGreaterThan(hazards(med));
  });
  it('difficulties are labeled Easy/Medium/Hard in order', () => {
    expect(HEIST_MAPS.map((m) => m.difficulty)).toEqual(['Easy', 'Medium', 'Hard']);
  });
});
