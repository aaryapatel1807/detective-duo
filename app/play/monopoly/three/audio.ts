/** Tiny synthesized sound engine — WebAudio only, zero audio files.
 * Every sound is an oscillator or filtered-noise burst, so there is
 * nothing to licence and nothing to download. Audio is created lazily
 * on the first user gesture (browsers block autoplay) and the mute
 * toggle is persisted in localStorage by the page. */
const MUTE_KEY = 'sachi-monopoly-muted';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let ambientNodes: AudioNode[] = [];
let muted = false;

export function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0');
  } catch {
    /* persistence is a nicety */
  }
  if (master) master.gain.value = value ? 0 : 0.6;
}

export function setMutedInitial(value: boolean): void {
  muted = value;
}

/** Create/resume the audio graph. Safe to call on every gesture. */
export function ensureAudio(): void {
  if (typeof window === 'undefined') return;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.6;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    /* audio is decorative; a failure must never break the game */
  }
}

function tone(
  freq: number,
  endFreq: number,
  duration: number,
  type: OscillatorType,
  volume: number,
  delay = 0,
): void {
  if (!ctx || !master || muted) return;
  try {
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t0 + duration);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  } catch {
    /* ignore */
  }
}

function noise(duration: number, volume: number, filterFreq: number, delay = 0): void {
  if (!ctx || !master || muted) return;
  try {
    const t0 = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  } catch {
    /* ignore */
  }
}

export const sfx = {
  /** Soft UI tap for every button. */
  tap(): void {
    ensureAudio();
    tone(660, 520, 0.07, 'sine', 0.12);
  },
  /** Dice rattle: a run of short noise ticks. */
  dice(): void {
    ensureAudio();
    for (let i = 0; i < 6; i += 1) noise(0.05, 0.22, 1800 + Math.random() * 1200, i * 0.09);
    tone(180, 120, 0.12, 'triangle', 0.1, 0.55);
  },
  /** One soft footstep. */
  step(): void {
    ensureAudio();
    noise(0.06, 0.12, 500);
  },
  /** Coins: two bright pings. */
  coin(): void {
    ensureAudio();
    tone(1320, 1320, 0.09, 'sine', 0.14);
    tone(1760, 1760, 0.14, 'sine', 0.14, 0.07);
  },
  /** Rent paid: coins down, then a low thunk. */
  rent(): void {
    ensureAudio();
    sfx.coin();
    tone(160, 90, 0.18, 'triangle', 0.16, 0.16);
  },
  /** Purchase: rising chime + sparkle. */
  buy(): void {
    ensureAudio();
    tone(523, 523, 0.12, 'sine', 0.14);
    tone(659, 659, 0.12, 'sine', 0.14, 0.09);
    tone(784, 784, 0.22, 'sine', 0.16, 0.18);
  },
  /** House drops: a soft thud. */
  build(): void {
    ensureAudio();
    tone(220, 110, 0.16, 'triangle', 0.2);
    noise(0.08, 0.1, 300, 0.02);
  },
  /** Hotel: golden arpeggio flash. */
  hotel(): void {
    ensureAudio();
    [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.22, 'sine', 0.14, i * 0.07));
  },
  /** Card flip: a paper swish. */
  card(): void {
    ensureAudio();
    noise(0.16, 0.14, 3200);
  },
  /** Airport: a soft whoosh + chime. */
  airport(): void {
    ensureAudio();
    noise(0.3, 0.1, 900);
    tone(880, 880, 0.16, 'sine', 0.1, 0.2);
  },
  /** Jail door locks: a low thunk plus a metallic clank. */
  lock(): void {
    ensureAudio();
    tone(140, 70, 0.18, 'triangle', 0.22);
    tone(1900, 1400, 0.08, 'square', 0.06, 0.12);
  },
  /** Jail door opens: a rising two-tone release. */
  unlock(): void {
    ensureAudio();
    tone(520, 780, 0.14, 'sine', 0.12);
    tone(780, 1040, 0.16, 'sine', 0.1, 0.1);
  },
  /** Victory: a gentle major jingle (no recording, no piano sample). */
  win(): void {
    ensureAudio();
    [523, 587, 659, 784, 880, 1047].forEach((f, i) => tone(f, f, 0.3, 'triangle', 0.16, i * 0.13));
  },
  /** Defeat: a soft descending sigh, kept gentle for a cozy game. */
  lose(): void {
    ensureAudio();
    tone(392, 392, 0.25, 'triangle', 0.12);
    tone(330, 330, 0.25, 'triangle', 0.12, 0.22);
    tone(262, 262, 0.4, 'triangle', 0.12, 0.44);
  },
};

/** Soft ambient garden loop: filtered wind noise + a slow gentle pad
 * (NOT a piano recording) + occasional bird chirps. Started once,
 * after the first gesture, and kept at a low level under the game. */
export function startAmbient(): void {
  if (!ctx || !master || ambientNodes.length > 0) return;
  try {
    // Wind: looping filtered noise.
    const len = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    const wind = ctx.createBufferSource();
    wind.buffer = buffer;
    wind.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 320;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.035;
    wind.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(master);
    wind.start();
    ambientNodes.push(wind, windGain);
    // Gentle pad: two detuned triangles drifting between soft chords.
    const chords = [
      [261.6, 329.6, 392.0],
      [220.0, 261.6, 329.6],
      [246.9, 293.7, 392.0],
    ];
    let chordIndex = 0;
    const pad = (): void => {
      if (!ctx || !master) return;
      const freqs = chords[chordIndex % chords.length];
      chordIndex += 1;
      freqs.forEach((f) => {
        if (!ctx || !master) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = f;
        const t0 = ctx.currentTime;
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(0.022, t0 + 2);
        gain.gain.linearRampToValueAtTime(0, t0 + 9);
        osc.connect(gain);
        gain.connect(master);
        osc.start(t0);
        osc.stop(t0 + 9.2);
      });
      window.setTimeout(pad, 7000);
    };
    pad();
    // Bird chirps: short sine glisses every 6-14 seconds.
    const chirp = (): void => {
      if (ctx && !muted) {
        const n = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i += 1) tone(2600 + Math.random() * 800, 3400, 0.09, 'sine', 0.03, i * 0.12);
      }
      window.setTimeout(chirp, 6000 + Math.random() * 8000);
    };
    window.setTimeout(chirp, 4000);
  } catch {
    /* ambient is decorative */
  }
}

export function stopAmbient(): void {
  try {
    ambientNodes.forEach((n) => {
      if ('stop' in n && typeof (n as { stop: () => void }).stop === 'function') (n as { stop: () => void }).stop();
      try {
        n.disconnect();
      } catch {
        /* already disconnected */
      }
    });
  } catch {
    /* ignore */
  }
  ambientNodes = [];
}
