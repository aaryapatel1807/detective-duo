'use client';

/* Detective Duo sound effects — pure WebAudio, no assets.
 * - typewriterClick(): short key clack
 * - paperShuffle(): filtered noise swish
 * - pinTap(): corkboard pin thunk
 * - stampThud(): wax-seal / win thud
 *
 * Muted until the first user interaction (autoplay policy + the standing
 * rule). Toggle persisted in localStorage 'dd-sound-muted'.
 */

export const SOUND_MUTED_KEY = 'dd-sound-muted';

let ctx: AudioContext | null = null;
let unlocked = false;
let muted =
  typeof window !== 'undefined' && window.localStorage.getItem(SOUND_MUTED_KEY) === '1';

function ensureCtx(): AudioContext | null {
  if (muted || !unlocked) return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Call once from a user gesture (pointerdown/keydown) to allow audio. */
export function unlockAudio(): void {
  unlocked = true;
  ensureCtx();
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(m: boolean): void {
  muted = m;
  try {
    window.localStorage.setItem(SOUND_MUTED_KEY, m ? '1' : '0');
  } catch {}
}

function blip(
  freq: number,
  dur: number,
  type: OscillatorType = 'square',
  gain = 0.08,
  slideTo?: number,
): void {
  const ac = ensureCtx();
  if (!ac) return;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(dur: number, filterFreq: number, gain = 0.12, q = 1): void {
  const ac = ensureCtx();
  if (!ac) return;
  const t = ac.currentTime;
  const len = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filt = ac.createBiquadFilter();
  filt.type = 'bandpass';
  filt.frequency.value = filterFreq;
  filt.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filt).connect(g).connect(ac.destination);
  src.start(t);
}

export const sounds = {
  /** Typewriter key clack */
  typewriterClick: () => {
    blip(1800 + Math.random() * 600, 0.03, 'square', 0.05);
    noise(0.03, 3200, 0.05);
  },
  /** Paper shuffle */
  paperShuffle: () => noise(0.28, 1400, 0.1, 0.8),
  /** Brass pin into cork */
  pinTap: () => {
    blip(420, 0.06, 'sine', 0.12, 180);
    noise(0.05, 2500, 0.08);
  },
  /** Wax seal stamp / case closed */
  stampThud: () => {
    blip(120, 0.16, 'sine', 0.16, 55);
    noise(0.1, 500, 0.08);
  },
  /** XP tick */
  xpTick: () => blip(880, 0.07, 'triangle', 0.07, 1320),
};
