/** Automatic ambience for the Sachi Monopoly 3D scene: season (from
 * the device date) and time of day (from the device hour). Nothing
 * here is a setting — both change on their own, and lighting moves
 * toward its target slowly so an hour change mid-game never cuts.
 * All dressing is procedural; no artwork, logos, or downloads. */

export type Season = 'spring' | 'summer' | 'autumn' | 'winter' | 'christmas' | 'valentine';
export type TimeOfDay = 'morning' | 'evening' | 'night';

/** Season from the device date. Christmas owns December, and a
 * Valentine's window (10–16 February) owns mid-February; everything
 * else follows the usual quarters. */
export function getSeason(date: Date): Season {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  if (month === 12) return 'christmas';
  if (month === 2 && day >= 10 && day <= 16) return 'valentine';
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

/** Time of day from the device hour: soft morning sun, golden
 * evening, and cool night. */
export function getTimeOfDay(date: Date): TimeOfDay {
  const h = date.getHours();
  if (h >= 6 && h < 17) return 'morning';
  if (h >= 17 && h < 20) return 'evening';
  return 'night';
}

export interface LightTarget {
  sunColor: string;
  sunIntensity: number;
  ambientIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  /** Lamp/lantern glow: brighter as the world gets darker. */
  lampGlow: number;
}

export const LIGHT_TARGETS: Record<TimeOfDay, LightTarget> = {
  morning: {
    sunColor: '#ffdfae',
    sunIntensity: 2.1,
    ambientIntensity: 0.75,
    hemiSky: '#ffe9c9',
    hemiGround: '#5d4a2e',
    hemiIntensity: 0.7,
    lampGlow: 1.4,
  },
  evening: {
    sunColor: '#ff9a3c',
    sunIntensity: 1.8,
    ambientIntensity: 0.6,
    hemiSky: '#ffb27a',
    hemiGround: '#4a3220',
    hemiIntensity: 0.55,
    lampGlow: 2.0,
  },
  night: {
    sunColor: '#7aa2ff',
    sunIntensity: 0.7,
    ambientIntensity: 0.35,
    hemiSky: '#2a3a5f',
    hemiGround: '#1a1a2e',
    hemiIntensity: 0.35,
    lampGlow: 2.6,
  },
};

/** Falling-particle dressing per season, shared by one particle
 * system: colour, size, fall speed, and sway. */
export const SEASON_PARTICLES: Record<
  Season,
  { color: string; size: number; speed: number; sway: number }
> = {
  spring: { color: '#ffb7c5', size: 0.22, speed: 1, sway: 1 },
  summer: { color: '#ffe9a8', size: 0.2, speed: 1.1, sway: 1.2 },
  autumn: { color: '#f59e0b', size: 0.26, speed: 0.8, sway: 1.4 },
  winter: { color: '#ffffff', size: 0.13, speed: 1.6, sway: 0.5 },
  christmas: { color: '#ffffff', size: 0.13, speed: 1.6, sway: 0.5 },
  valentine: { color: '#ff8fb3', size: 0.24, speed: 1, sway: 1 },
};

/** Tree-canopy colours per season (four spheres per tree). */
export const SEASON_CANOPY: Record<Season, [string, string, string, string]> = {
  spring: ['#ffb7c5', '#ffc9d6', '#ff9ebb', '#ffd1dc'],
  summer: ['#6abe6a', '#7ec850', '#ffb7c5', '#5da85a'],
  autumn: ['#f59e0b', '#e07840', '#d97706', '#fbbf24'],
  winter: ['#e8f0f2', '#dbe7ea', '#eef4f6', '#d5e3e8'],
  christmas: ['#2f7d4f', '#357f52', '#2a7046', '#3d8a5a'],
  valentine: ['#ff8fb3', '#ff6b9d', '#ffb7c5', '#ff9ebb'],
};

/** Lawn colour per season. */
export const SEASON_LAWN: Record<Season, string> = {
  spring: '#7fae7a',
  summer: '#6fbf5e',
  autumn: '#a8a05a',
  winter: '#c8d8cc',
  christmas: '#c8d8cc',
  valentine: '#7fae7a',
};
