import exifr from 'exifr';
import type { AlbumId, AlbumPhotoOut } from './types';

/**
 * Browser client for the album API routes. The routes are the only path
 * to album data (private bucket + service-role key on the server).
 *
 * Access is one shared secret key for the one shared album: the client
 * sends the key it was given as the x-album-key header, and the server
 * checks it against ALBUM_SECRET_KEY. The key itself is never rendered
 * on screen — it only sits in this device's local storage.
 */
export const ALBUMS_KEY_KEY = 'sachi-albums-key';
export const ALBUMS_NAME_KEY = 'sachi-albums-name';

export class AlbumsNotConfiguredError extends Error {
  constructor() {
    super('Albums are still being set up on the server.');
    this.name = 'AlbumsNotConfiguredError';
  }
}

export class AlbumsKeyError extends Error {
  constructor() {
    super('That secret key is not right — try again.');
    this.name = 'AlbumsKeyError';
  }
}

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

async function throwIfBad(res: Response): Promise<void> {
  if (res.ok) return;
  if (res.status === 503) throw new AlbumsNotConfiguredError();
  if (res.status === 401) throw new AlbumsKeyError();
  if (res.status === 413) throw new Error('This photo is too large to upload — try a smaller one.');
  const body = (await readJson(res)) as { error?: string };
  throw new Error(body.error ?? `Albums request failed (${res.status})`);
}

export interface AlbumSummaryItem {
  id: AlbumId;
  title: string;
  blurb: string;
  count: number;
}

export interface AlbumSummary {
  albums: AlbumSummaryItem[];
  months: { month: string; count: number }[];
  placeClusters: number;
  total: number;
}

export async function fetchAlbumSummary(key: string): Promise<AlbumSummary> {
  const res = await fetch('/api/albums/albums', { headers: { 'x-album-key': key } });
  await throwIfBad(res);
  return (await res.json()) as AlbumSummary;
}

export interface AlbumPhotosPage {
  photos: AlbumPhotoOut[];
  total: number;
  limit: number;
  offset: number;
}

export async function fetchAlbumPhotos(
  key: string,
  album: AlbumId,
  month: string | null,
  limit = 50,
  offset = 0,
): Promise<AlbumPhotosPage> {
  const params = new URLSearchParams({
    album,
    limit: String(limit),
    offset: String(offset),
  });
  if (month) params.set('month', month);
  const res = await fetch(`/api/albums/photos?${params.toString()}`, { headers: { 'x-album-key': key } });
  await throwIfBad(res);
  return (await res.json()) as AlbumPhotosPage;
}

export interface UploadResult {
  id: string;
  status: 'ready' | 'pending';
  faceCount: number | null;
  sceneTags: string[];
  takenAt: string | null;
}

/**
 * Files at or under this size go up untouched, EXIF intact. Bigger
 * files are shrunk in the browser first: the platform rejects any
 * request body over ~4.5MB before the route ever runs (413, no body),
 * and a phone photo straight from the camera is routinely 4–10MB —
 * that cap, not the app, was failing big uploads. Shrinking to the
 * server's own 2048px target keeps the uploaded bytes well under 1MB.
 */
export const ALBUM_UPLOAD_PASSTHROUGH_BYTES = 3.5 * 1024 * 1024;
export const ALBUM_UPLOAD_MAX_DIMENSION = 2048;

const COMPRESSIBLE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** iPhone photos: HEIC/HEIF. The server cannot read them (see
 * images.ts), so they must always be converted to JPEG in the
 * browser first — even small ones — wherever the browser can decode
 * them. Type may be empty on some pickers, so the extension counts. */
export function isHeicFile(file: File): boolean {
  if (file.type === 'image/heic' || file.type === 'image/heif') return true;
  return /\.hei[cf]$/i.test(file.name);
}

/** True when a file must be shrunk/converted before upload: big
 * enough to risk the platform's request-body cap and of a type the
 * browser can redraw (JPEG/PNG/WebP), or any HEIC file (which the
 * server cannot read at all). Anything else goes up untouched. */
export function needsCompression(file: File): boolean {
  if (isHeicFile(file)) return true;
  return file.size > ALBUM_UPLOAD_PASSTHROUGH_BYTES && COMPRESSIBLE_TYPES.has(file.type);
}

export interface PreparedPhoto {
  file: File;
  takenAt: string | null;
  lat: number | null;
  lon: number | null;
}

/** EXIF date + GPS from the original file. Never throws: a canvas
 * redraw strips EXIF, so this runs BEFORE any shrink, and the fields
 * travel with the upload for the server to prefer (see upload route). */
async function readOriginalExif(file: File): Promise<Omit<PreparedPhoto, 'file'>> {
  try {
    const tags = await exifr.parse(file);
    if (!tags) return { takenAt: null, lat: null, lon: null };
    const rawDate = tags.DateTimeOriginal ?? tags.CreateDate ?? tags.ModifyDate ?? null;
    let takenAt: string | null = null;
    if (rawDate instanceof Date && !Number.isNaN(rawDate.getTime())) takenAt = rawDate.toISOString();
    else if (typeof rawDate === 'string' && rawDate) {
      const d = new Date(rawDate);
      if (!Number.isNaN(d.getTime())) takenAt = d.toISOString();
    }
    const lat = typeof tags.latitude === 'number' && Math.abs(tags.latitude) <= 90 ? tags.latitude : null;
    const lon = typeof tags.longitude === 'number' && Math.abs(tags.longitude) <= 180 ? tags.longitude : null;
    return { takenAt, lat, lon };
  } catch {
    return { takenAt: null, lat: null, lon: null };
  }
}

async function decodePhoto(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* fall through to the <img> path */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('decode failed'));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Shrink a big photo for upload, or convert a HEIC photo to JPEG, or
 * return it untouched. For ordinary formats any failure falls back to
 * the original — a failed shrink must never become a failed upload.
 * For HEIC there is no safe fallback: the server cannot read HEIC at
 * all, so an undecodable HEIC fails fast here with a plain message
 * (shown as the Failed detail on the page) instead of uploading a
 * file that is guaranteed to fail server-side.
 */
export async function compressPhotoForUpload(
  file: File,
  opts: { maxDimension?: number; quality?: number } = {},
): Promise<PreparedPhoto> {
  const exif = await readOriginalExif(file);
  const heic = isHeicFile(file);
  if (!needsCompression(file)) return { file, ...exif };
  try {
    const bitmap = await decodePhoto(file);
    const maxDimension = opts.maxDimension ?? ALBUM_UPLOAD_MAX_DIMENSION;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      if (heic) throw new Error('heic-unreadable');
      return { file, ...exif };
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', opts.quality ?? 0.82),
    );
    if (!blob) {
      if (heic) throw new Error('heic-unreadable');
      return { file, ...exif };
    }
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return { file: new File([blob], name, { type: 'image/jpeg' }), ...exif };
  } catch (e) {
    if (heic) {
      throw new Error(
        'This photo is an iPhone HEIC file and this browser could not read it — please upload a JPEG version instead (in Photos, share the photo and save it as JPEG, or set iPhone Settings → Camera → Formats to Most Compatible for future photos).',
      );
    }
    void e;
    return { file, ...exif };
  }
}

export async function uploadAlbumPhoto(key: string, uploader: string, file: File): Promise<UploadResult> {
  const post = async (photo: PreparedPhoto): Promise<UploadResult> => {
    const form = new FormData();
    form.set('key', key);
    form.set('uploader', uploader);
    form.set('file', photo.file);
    if (photo.takenAt) form.set('takenAt', photo.takenAt);
    if (photo.lat !== null) form.set('lat', String(photo.lat));
    if (photo.lon !== null) form.set('lon', String(photo.lon));
    const res = await fetch('/api/albums/upload', {
      method: 'POST',
      headers: { 'x-album-key': key },
      body: form,
    });
    await throwIfBad(res);
    return (await res.json()) as UploadResult;
  };
  try {
    return await post(await compressPhotoForUpload(file));
  } catch (e) {
    // A HEIC this browser cannot read will never succeed — do not
    // retry it. Anything else gets one retry at a much smaller size:
    // flaky mobile networks and oversize bodies are the usual
    // killers, and a 1024px JPEG is a fraction of the first try.
    if (e instanceof Error && e.message.startsWith('This photo is an iPhone HEIC')) throw e;
    return await post(await compressPhotoForUpload(file, { maxDimension: 1024, quality: 0.7 }));
  }
}

export interface ProcessResult {
  processed: number;
  ready: number;
  failed: number;
  stillPending: number;
  pendingRemaining: number;
  failedTotal: number;
  budgetStopped: boolean;
  /** Server-side failure messages from this pass, if any. */
  errors?: string[];
}

/** One classification pass. Throws on 503/401 like the other calls. */
export async function processAlbumsOnce(key: string, limit = 10): Promise<ProcessResult> {
  const res = await fetch('/api/albums/process', {
    method: 'POST',
    headers: { 'x-album-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({ limit }),
  });
  await throwIfBad(res);
  return (await res.json()) as ProcessResult;
}

/** Classify anything left pending (upload retries + catch-up). Never throws. */
export async function runAlbumProcess(key?: string): Promise<void> {
  try {
    await processAlbumsOnce(key ?? '');
  } catch {
    /* the next refresh still shows whatever is ready */
  }
}

/** Remove one saved photo for good (stored files + record). */
export async function deleteAlbumPhoto(key: string, id: string): Promise<void> {
  const res = await fetch(`/api/albums/photos?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { 'x-album-key': key },
  });
  await throwIfBad(res);
}

/** Reset failed/stuck photos to pending so they can be classified again. */
export async function retryAlbums(key: string): Promise<{ reset: number }> {
  const res = await fetch('/api/albums/retry', {
    method: 'POST',
    headers: { 'x-album-key': key },
  });
  await throwIfBad(res);
  return (await res.json()) as { reset: number };
}

export function faceLabel(faceCount: number | null): string {
  if (faceCount === null) return 'Classifying…';
  if (faceCount === 0) return 'No faces';
  if (faceCount === 1) return '1 face';
  return `${faceCount} faces`;
}
