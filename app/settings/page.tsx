'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { Check, LogOut } from 'lucide-react';
import { THEMES, THEME_IDS, type ThemeId } from '@/lib/themes';
import { useTheme } from '@/components/ThemeProvider';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  loadSoundSettings,
  playUiSound,
  saveSoundSettings,
  startAmbient,
  stopAmbient,
  type AmbientKind,
  type SoundSettings,
} from '@/lib/sound';
import { useRouter } from 'next/navigation';

function tokenStyle(id: ThemeId): CSSProperties {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(THEMES[id].tokens)) out[k] = v;
  return out as CSSProperties;
}

export default function SettingsPage() {
  const { theme, setTheme, userId } = useTheme();
  const router = useRouter();
  const [selected, setSelected] = useState<ThemeId>(theme);
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);
  const [sound, setSound] = useState<SoundSettings>({ enabled: false, ambient: 'off' });

  useEffect(() => setSound(loadSoundSettings()), []);

  useEffect(() => setSelected(theme), [theme]);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !userId) return;
    void sb
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.display_name) setName(data.display_name);
      });
  }, [userId]);

  const previewStyle = useMemo(() => tokenStyle(selected), [selected]);
  const dirty = selected !== theme;

  function updateSound(next: SoundSettings) {
    setSound(next);
    saveSoundSettings(next);
    if (next.enabled) playUiSound(theme);
    if (next.ambient === 'off') stopAmbient();
    else startAmbient(next.ambient);
  }

  async function saveName() {
    const sb = getSupabase();
    if (!sb || !userId) return;
    await sb.from('profiles').update({ display_name: name }).eq('id', userId);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function signOut() {
    const sb = getSupabase();
    await sb?.auth.signOut();
    router.replace('/login');
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
          Off by default, and kept on this device only — it is not part of your
          account, so no extra setup is needed. Sounds are made on the spot in
          your browser; nothing is downloaded, and nothing ever plays by itself.
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
            ? 'Tap sounds are on, in this theme’s own voice — soft pops for Candy, a slow chime for Midnight, a light pluck for Sunny, a quiet tick for Noir.'
            : 'Tap sounds are off. Turn them on to hear this theme’s soft voice.'}
        </p>
      </section>

      <section className="card mt-5 p-5 sm:p-6">
        <h2 className="text-xl font-bold">Account</h2>
        {!isSupabaseConfigured ? (
          <p className="mt-2 text-sm text-[var(--ink-dim)]">
            Sign-in is not connected on this build yet. Your progress is saved on
            this device until then.
          </p>
        ) : userId ? (
          <>
            <label className="mt-3 flex flex-col gap-1 text-sm font-semibold">
              Display name
              <span className="flex gap-2">
                <input
                  className="input min-w-0 flex-1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Detective"
                />
                <button type="button" className="btn" onClick={() => void saveName()}>
                  {saved ? 'Saved' : 'Save'}
                </button>
              </span>
            </label>
            <button type="button" className="btn mt-4" onClick={() => void signOut()}>
              <LogOut size={18} aria-hidden /> Sign out
            </button>
          </>
        ) : (
          <p className="mt-2 text-sm text-[var(--ink-dim)]">
            You are not signed in. <Link href="/login" className="underline">Sign in</Link> to
            sync your progress across devices.
          </p>
        )}
      </section>
    </main>
  );
}
