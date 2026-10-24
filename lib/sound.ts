/**
 * Sound, Phase 4: quiet, optional, synthesized — no audio files.
 *
 * Defaults: everything OFF. UI sounds and ambient sound are opt-in in
 * Settings and persist in localStorage ('dd-v2-sound') — deliberately NOT
 * a Supabase column, so no migration is needed and a signed-out player
 * keeps the same choice. Sound never autoplays: ambient sound only ever
 * starts from a Settings toggle (a user gesture), or, if it was left on,
 * from the next tap/click after a page load. It never blocks interaction:
 * every call is fire-and-forget and any AudioContext failure is swallowed.
 *
 * Per-theme UI sounds (all soft, gain <= 0.08):
 *  candy    — soft pops/chimes (two sine plucks, rising)
 *  midnight — one slow soft chime (long decay, calm by design)
 *  noir     — a subtle low tick
 * Ambient:
 *  rain — looped filtered noise; jazz — gentle sine chords, one every
 *  few seconds, low in the mix.
 */
import type { ThemeId } from './themes';

export type AmbientKind = 'off' | 'rain' | 'jazz';

export interface SoundSettings {
  /** UI sounds on/off. Default false. */
  enabled: boolean;
  /** Ambient sound. Default 'off'. */
  ambient: AmbientKind;
}

export const SOUND_KEY = 'dd-v2-sound';
export const SOUND_CHANGED_EVENT = 'dd-sound-changed';

export const defaultSoundSettings: SoundSettings = { enabled: false, ambient: 'off' };

export function loadSoundSettings(): SoundSettings {
  try {
    const raw = localStorage.getItem(SOUND_KEY);
    if (!raw) return { ...defaultSoundSettings };
    const parsed = JSON.parse(raw) as Partial<SoundSettings>;
    return {
      enabled: parsed.enabled === true,
      ambient: parsed.ambient === 'rain' || parsed.ambient === 'jazz' ? parsed.ambient : 'off',
    };
  } catch {
    return { ...defaultSoundSettings };
  }
}

export function saveSoundSettings(s: SoundSettings): void {
  try {
    localStorage.setItem(SOUND_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new CustomEvent(SOUND_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}

// ------------------------------------------------------------ engine -----

let ctx: AudioContext | null = null;
let ambientNodes: { stop: () => void } | null = null;
let jazzTimer: ReturnType<typeof setInterval> | null = null;

function getCtx(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

/** One soft sine pluck. `at` is seconds from now. */
function pluck(freq: number, at: number, dur: number, gain: number): void {
  const c = getCtx();
  if (!c) return;
  try {
    const t = c.currentTime + at;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  } catch {
    /* sound must never break the page */
  }
}

/** Soft UI sound for a tap, in the current theme's voice. No-op unless enabled. */
export function playUiSound(theme: ThemeId): void {
  try {
    if (!loadSoundSettings().enabled) return;
    if (theme === 'candy') {
      pluck(660, 0, 0.25, 0.07);
      pluck(880, 0.07, 0.3, 0.06);
    } else if (theme === 'midnight') {
      pluck(523, 0, 1.1, 0.05);
    } else {
      pluck(220, 0, 0.12, 0.04);
    }
  } catch {
    /* ignore */
  }
}

function startRain(): void {
  const c = getCtx();
  if (!c) return;
  try {
    const len = c.sampleRate * 2;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    const g = c.createGain();
    g.gain.value = 0.035;
    src.connect(filter).connect(g).connect(c.destination);
    src.start();
    ambientNodes = {
      stop: () => {
        try {
          src.stop();
        } catch {
          /* already stopped */
        }
      },
    };
  } catch {
    /* ignore */
  }
}

function startJazz(): void {
  // Gentle chords: C major pentatonic colours, one soft chord every ~4s.
  const chords: number[][] = [
    [261.6, 329.6, 392.0],
    [220.0, 329.6, 440.0],
    [261.6, 349.2, 440.0],
    [196.0, 261.6, 329.6],
  ];
  let i = 0;
  const play = () => {
    for (const f of chords[i % chords.length]) pluck(f, 0, 2.2, 0.03);
    i++;
  };
  play();
  jazzTimer = setInterval(play, 4200);
  ambientNodes = {
    stop: () => {
      if (jazzTimer) clearInterval(jazzTimer);
      jazzTimer = null;
    },
  };
}

export function stopAmbient(): void {
  try {
    ambientNodes?.stop();
  } catch {
    /* ignore */
  }
  ambientNodes = null;
  if (jazzTimer) clearInterval(jazzTimer);
  jazzTimer = null;
}

export function startAmbient(kind: AmbientKind): void {
  stopAmbient();
  if (kind === 'rain') startRain();
  else if (kind === 'jazz') startJazz();
}
