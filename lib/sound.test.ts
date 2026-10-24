import { beforeEach, describe, expect, it } from 'vitest';
import { defaultSoundSettings, loadSoundSettings, saveSoundSettings } from './sound';

describe('sound settings', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    (globalThis as unknown as { localStorage: unknown }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => store.clear(),
    };
  });

  it('defaults to everything off (no autoplay, no UI sounds)', () => {
    expect(loadSoundSettings()).toEqual(defaultSoundSettings);
    expect(defaultSoundSettings.enabled).toBe(false);
    expect(defaultSoundSettings.ambient).toBe('off');
  });

  it('persists the choice in localStorage, not a database row', () => {
    saveSoundSettings({ enabled: true, ambient: 'rain' });
    expect(loadSoundSettings()).toEqual({ enabled: true, ambient: 'rain' });
    saveSoundSettings({ enabled: false, ambient: 'off' });
    expect(loadSoundSettings()).toEqual({ enabled: false, ambient: 'off' });
  });

  it('sanitizes an unknown ambient value back to off', () => {
    (globalThis.localStorage as { setItem: (k: string, v: string) => void }).setItem(
      'dd-v2-sound',
      JSON.stringify({ enabled: true, ambient: 'thunderstorm' }),
    );
    expect(loadSoundSettings().ambient).toBe('off');
    expect(loadSoundSettings().enabled).toBe(true);
  });
});
