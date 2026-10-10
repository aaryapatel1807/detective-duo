/* Heist Planner — shared types.
 * The Mastermind sees the vault map (walls, lasers, camera cones, vault).
 * The Lookout sees guard patrol routes + timing table. Neither sees the
 * other's intel — they plan together over the radio, then execute.
 */

export type HeistRole = 'mastermind' | 'lookout';
export type HeistPhase = 'plan' | 'execute' | 'won' | 'failed';

export interface XY {
  x: number;
  y: number;
}

export type Compass = 'N' | 'E' | 'S' | 'W';

export interface Laser {
  x: number;
  y: number;
  /** laser is live for the first period/2 ticks of each cycle */
  period: number;
  offset: number;
}

export interface Camera {
  x: number;
  y: number;
  dir: Compass;
  range: number;
  /** 0 = fixed; otherwise rotates 90° every `sweep` ticks */
  sweep: number;
}

export interface Guard {
  name: string;
  /** patrol loop; position at tick t is route[t % route.length] */
  route: XY[];
}

export interface HeistMap {
  id: string;
  name: string;
  blurb: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  width: number;
  height: number;
  walls: XY[];
  entry: XY;
  vault: XY;
  lasers: Laser[];
  cameras: Camera[];
  guards: Guard[];
}

export interface HeistShared {
  mapId?: string;
  roles?: Record<string, HeistRole>;
  phase?: HeistPhase;
  /** agreed waypoints (entry is auto-prepended at execution) */
  plan?: XY[];
  ready?: Record<string, boolean>;
  /** token sits at path[stepIdx], path = [entry, ...plan] */
  stepIdx?: number;
  tick?: number;
  alarms?: number;
  log?: string[];
  awarded?: Record<string, boolean>;
}
