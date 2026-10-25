import type { AlbumId, AlbumPhotoOut } from './types';

/**
 * Browser client for the album API routes. The routes are the only path
 * to album data (private bucket + service-role key on the server).
 */
export const ALBUMS_ROOM_KEY = 'sachi-albums-room';
export const ALBUMS_NAME_KEY = 'sachi-albums-name';

export class AlbumsNotConfiguredError extends Error {
  constructor() {
    super('Albums are still being set up on the server.');
    this.name = 'AlbumsNotConfiguredError';
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

export async function fetchAlbumSummary(room: string): Promise<AlbumSummary> {
  const res = await fetch(`/api/albums/albums?room=${encodeURIComponent(room)}`);
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
  room: string,
  album: AlbumId,
  month: string | null,
  limit = 50,
  offset = 0,
): Promise<AlbumPhotosPage> {
  const params = new URLSearchParams({
    room,
    album,
    limit: String(limit),
    offset: String(offset),
  });
  if (month) params.set('month', month);
  const res = await fetch(`/api/albums/photos?${params.toString()}`);
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

export async function uploadAlbumPhoto(room: string, uploader: string, file: File): Promise<UploadResult> {
  const form = new FormData();
  form.set('room_code', room);
  form.set('uploader', uploader);
  form.set('file', file);
  const res = await fetch('/api/albums/upload', { method: 'POST', body: form });
  await throwIfBad(res);
  return (await res.json()) as UploadResult;
}

/** Classify anything left pending (upload retries + catch-up). Never throws. */
export async function runAlbumProcess(): Promise<void> {
  try {
    await fetch('/api/albums/process', { method: 'POST' });
  } catch {
    /* the next refresh still shows whatever is ready */
  }
}

export function faceLabel(faceCount: number | null): string {
  if (faceCount === null) return 'Classifying…';
  if (faceCount === 0) return 'No faces';
  if (faceCount === 1) return '1 face';
  return `${faceCount} faces`;
}
