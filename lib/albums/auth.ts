import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * One secret key for the one shared album. The album belongs to two
 * people only, so there is exactly one key and one album namespace.
 *
 * The secret itself lives ONLY in the ALBUM_SECRET_KEY server env var —
 * never in code, never in the client bundle, never in git. The client
 * sends the key it was given; the server compares hashes, so even the
 * comparison never leaks the secret's length.
 *
 * SHARED_ALBUM_ROOM is just the internal storage namespace, not a
 * secret and not the key — it only labels rows and bucket paths.
 */
export const SHARED_ALBUM_ROOM = 'shared';

export function getAlbumSecret(): string | null {
  const v = process.env.ALBUM_SECRET_KEY?.trim();
  return v ? v : null;
}

function sha256(s: string): Buffer {
  return createHash('sha256').update(s, 'utf8').digest();
}

/** Timing-safe comparison (hashes first, so lengths never leak). */
export function isAlbumKeyValid(provided: string | null | undefined): boolean {
  const secret = getAlbumSecret();
  if (!secret || !provided) return false;
  const a = sha256(secret);
  const b = sha256(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The key as sent by the client: x-album-key header, or ?key= query. */
export function albumKeyFromRequest(request: Request): string | null {
  return request.headers.get('x-album-key') ?? new URL(request.url).searchParams.get('key');
}

export type AlbumAuthResult = { ok: true } | { ok: false; status: number; error: string };

/**
 * Gate for the album routes: 503 when the server key isn't set yet,
 * 401 when the key is missing or wrong.
 */
export function checkAlbumKey(provided: string | null | undefined): AlbumAuthResult {
  if (!getAlbumSecret()) {
    return { ok: false, status: 503, error: 'albums are not configured yet' };
  }
  if (!isAlbumKeyValid(provided)) {
    return { ok: false, status: 401, error: 'that secret key is not right' };
  }
  return { ok: true };
}
