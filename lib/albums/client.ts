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

export async function uploadAlbumPhoto(key: string, uploader: string, file: File): Promise<UploadResult> {
  const form = new FormData();
  form.set('key', key);
  form.set('uploader', uploader);
  form.set('file', file);
  const res = await fetch('/api/albums/upload', {
    method: 'POST',
    headers: { 'x-album-key': key },
    body: form,
  });
  await throwIfBad(res);
  return (await res.json()) as UploadResult;
}

export interface ProcessResult {
  processed: number;
  ready: number;
  failed: number;
  stillPending: number;
  pendingRemaining: number;
  failedTotal: number;
  budgetStopped: boolean;
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
