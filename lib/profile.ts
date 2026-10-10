'use client';

/* Detective profiles: names, accent colors, photos (dataURL).
 * Set on the Settings page; read by hub / scoreboard / rank bars.
 */

import { readStr } from './store';

export const PLAYER_NAME_KEY = 'dd-name';
export const PARTNER_NAME_KEY = 'dd-partner-name';
export const ACCENT_ME_KEY = 'dd-accent-me';
export const ACCENT_PARTNER_KEY = 'dd-accent-partner';
export const PHOTO_ME_KEY = 'dd-photo-me';
export const PHOTO_PARTNER_KEY = 'dd-photo-partner';

export const DEFAULT_ACCENT = '#e8a33d';

export interface Profile {
  name: string;
  accent: string;
  photo: string;
}

export function myProfile(fallbackName: string): Profile {
  return {
    name: readStr(PLAYER_NAME_KEY, fallbackName),
    accent: readStr(ACCENT_ME_KEY, DEFAULT_ACCENT),
    photo: readStr(PHOTO_ME_KEY),
  };
}

export function partnerProfile(fallbackName = 'Partner'): Profile {
  return {
    name: readStr(PARTNER_NAME_KEY, fallbackName),
    accent: readStr(ACCENT_PARTNER_KEY, DEFAULT_ACCENT),
    photo: readStr(PHOTO_PARTNER_KEY),
  };
}
