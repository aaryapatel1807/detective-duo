'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Check } from 'lucide-react';
import { THEMES, THEME_IDS, type ThemeId } from '@/lib/themes';
import { useTheme } from '@/components/ThemeProvider';
import {
  loadSoundSettings,
  playUiSound,
  saveSoundSettings,
  startAmbient,
  stopAmbient,
  type AmbientKind,
  type SoundSettings,
} from '@/lib/sound';

function tokenStyle(id: ThemeId): CSSProperties {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(THEMES[id].tokens)) out[k] = v;
  return out as CSSProperties;
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [selected, setSelected] = useState<ThemeId>(theme);
  const [sound, setSound] = useState<SoundSettings>({ enabled: false, ambient: 'off' });

  useEffect(() => setSound(loadSoundSettings()), []);

  useEffect(() => setSelected(theme), [theme]);

  const previewStyle = useMemo(() => tokenStyle(selected), [selected]);
  const dirty = selected !== theme;

  function updateSound(next: SoundSettings) {
    setSound(next);
    saveSoundSettings(next);
    if (next.enabled) playUiSound(theme);
    if (next.ambient === 'off') stopAmbient();
    else startAmbient(next.ambient);
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16">
      <h1 className="mt-2 text-3xl font-bold">Settings</h1>

      <section className="card mt-5 p-5 sm:p-6">
        <h2 className="text-xl font-bold">Theme</h2>
        <p className="mt-1 text-sm text-[var(--ink-dim)]">
          Pick one to preview it. Nothing changes until you confirm.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {THEME_IDS.map((id) => {
            const t = THEMES[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelected(id)}
                aria-pressed={selected === id}
                className="overflow-hidden rounded-[var(--radius-lg)] border text-left"
                style={{ ...tokenStyle(id), borderColor: 'var(--line)' }}
              >
                <span className="block p-4" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
                  <span className="font-display block text-lg font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                    {t.label}
                  </span>
                  <span className="mt-1 block text-sm" style={{ color: 'var(--ink-dim)' }}>
                    {t.blurb}
                  </span>
                  <span className="mt-3 flex gap-2">
                    <span className="inline-block h-6 w-10 rounded-full" style={{ background: 'var(--accent)' }} />
                    <span className="inline-block h-6 w-10 rounded-full" style={{ background: 'var(--accent-2)' }} />
                    <span className="inline-block h-6 w-10 rounded-full border" style={{ background: 'var(--paper)', borderColor: 'var(--line)' }} />
                  </span>
                  {theme === id && (
                    <span className="mt-2 block text-xs font-bold">In use now</span>
                  )}
                  {selected === id && theme !== id && (
                    <span className="mt-2 block text-xs font-bold">Selected — preview below</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Live preview of the selected theme, scoped to this panel. */}
        <div
          data-theme={selected}
          className="mt-5 overflow-hidden rounded-[var(--radius-lg)] border"
          style={{ ...previewStyle, borderColor: 'var(--line)', background: 'var(--bg)', color: 'var(--ink)' }}
        >
          <div className="p-4" style={{ backgroundImage: 'var(--texture)' }}>
            <p className="font-display text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
              The {THEMES[selected].label} look
            </p>
            <p className="mt-1 text-sm" style={{ color: 'var(--ink-dim)' }}>
              Case notes, clues and buttons will all dress like this.
            </p>
            <div
              className="mt-3 rounded-[var(--radius)] border p-3"
              style={{ background: 'var(--paper)', color: 'var(--paper-ink)', borderColor: 'var(--line)' }}
            >
              <span className="font-hand text-xl" style={{ fontFamily: 'var(--font-caveat)' }}>
                The footprints stop at the library door…
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              <span
                className="inline-flex items-center rounded-full px-4 py-2 text-sm font-bold"
                style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
              >
                Primary button
              </span>
              <span
                className="inline-flex items-center rounded-full px-4 py-2 text-sm font-bold"
                style={{ background: 'var(--accent-2)', color: 'var(--accent-2-ink)' }}
              >
                Second button
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary mt-4"
          disabled={!dirty}
          onClick={() => setTheme(selected)}
        >
          <Check size={18} aria-hidden /> Use the {THEMES[selected].label} theme
        </button>
      </section>

      <section className="card mt-5 p-5 sm:p-6">
        <h2 className="text-xl font-bold">Sound</h2>
        <p className="mt-1 text-sm text-[var(--ink-dim)]">
          Off by default, and kept on this device only — no setup needed.
          Sounds are made on the spot in your browser; nothing is downloaded,
          and nothing ever plays by itself.
        </p>
        <label className="mt-3 flex items-center justify-between gap-3 text-sm font-semibold">
          Soft sounds when you tap buttons
          <button
            type="button"
            role="switch"
            aria-checked={sound.enabled}
            onClick={() => updateSound({ ...sound, enabled: !sound.enabled })}
            className="btn shrink-0"
          >
            {sound.enabled ? 'On' : 'Off'}
          </button>
        </label>
        <label className="mt-3 flex flex-col gap-1 text-sm font-semibold">
          Gentle background sound
          <select
            className="input"
            value={sound.ambient}
            onChange={(e) => updateSound({ ...sound, ambient: e.target.value as AmbientKind })}
            aria-label="Background sound"
          >
            <option value="off">Off</option>
            <option value="rain">Soft rain</option>
            <option value="jazz">Soft jazz chords</option>
          </select>
        </label>
        <p className="mt-2 text-sm text-[var(--ink-dim)]">
          {sound.enabled
            ? 'Tap sounds are on, in this theme’s own voice — soft pops for Candy, a bright chime pair for Blue, a quiet tick for Noir.'
            : 'Tap sounds are off. Turn them on to hear this theme’s soft voice.'}
        </p>
      </section>

      <section className="card mt-5 p-5 sm:p-6">
        <h2 className="text-xl font-bold">Welcome</h2>
        <p className="mt-1 text-sm text-[var(--ink-dim)]">
          See the “hey Sachi” welcome screen again, from the start.
        </p>
        <button
          type="button"
          className="btn mt-3"
          onClick={() => {
            try {
              sessionStorage.removeItem('dd-welcome-seen');
            } catch {
              /* ignore */
            }
            window.location.href = '/';
          }}
        >
          Replay welcome
        </button>
      </section>

      <section className="card mt-5 p-5 sm:p-6">
        <h2 className="text-xl font-bold">On this device</h2>
        <p className="mt-2 text-sm text-[var(--ink-dim)]">
          No account needed — just open the site and play. Your progress, your
          date-night lists and your room nickname are saved on this device.
        </p>
      </section>
    </main>
  );
}
