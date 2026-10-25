import { afterEach, describe, expect, it } from 'vitest';
import { SHARED_ALBUM_ROOM, albumKeyFromRequest, checkAlbumKey, isAlbumKeyValid } from './auth';

describe('album secret key', () => {
  const prev = process.env.ALBUM_SECRET_KEY;
  afterEach(() => {
    if (prev === undefined) delete process.env.ALBUM_SECRET_KEY;
    else process.env.ALBUM_SECRET_KEY = prev;
  });

  it('accepts only the exact key', () => {
    process.env.ALBUM_SECRET_KEY = 'test-key-123';
    expect(isAlbumKeyValid('test-key-123')).toBe(true);
    expect(isAlbumKeyValid('test-key-124')).toBe(false);
    expect(isAlbumKeyValid('test-key-123 ')).toBe(false);
    expect(isAlbumKeyValid('')).toBe(false);
    expect(isAlbumKeyValid(null)).toBe(false);
    expect(isAlbumKeyValid(undefined)).toBe(false);
  });

  it('returns 503 when the server key is not set', () => {
    delete process.env.ALBUM_SECRET_KEY;
    expect(checkAlbumKey('anything')).toEqual({
      ok: false,
      status: 503,
      error: 'albums are not configured yet',
    });
  });

  it('returns 401 for a missing or wrong key', () => {
    process.env.ALBUM_SECRET_KEY = 'test-key-123';
    expect(checkAlbumKey('nope')).toEqual({
      ok: false,
      status: 401,
      error: 'that secret key is not right',
    });
    expect(checkAlbumKey(null)).toEqual({
      ok: false,
      status: 401,
      error: 'that secret key is not right',
    });
    expect(checkAlbumKey('test-key-123')).toEqual({ ok: true });
  });

  it('reads the key from the header or the query', () => {
    expect(albumKeyFromRequest(new Request('https://x/api', { headers: { 'x-album-key': 'k1' } }))).toBe('k1');
    expect(albumKeyFromRequest(new Request('https://x/api?key=k2'))).toBe('k2');
    expect(albumKeyFromRequest(new Request('https://x/api'))).toBeNull();
  });

  it('the shared namespace is a label, not the secret', () => {
    expect(SHARED_ALBUM_ROOM).toBe('shared');
  });
});
