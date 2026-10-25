import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { MAX_ATTEMPTS } from './processQueue';
import type { AlbumPhotoRow } from './types';

/**
 * Server-only Supabase access for albums. The service-role key bypasses
 * RLS, so these helpers are the ONLY path to album data: the API routes
 * below are the gate, and the bucket + table deny anonymous access.
 * Never import this file from client components.
 */
export const ALBUM_BUCKET = 'album-photos';
export const ALBUM_TABLE = 'album_photos';

export function getServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function uploadFiles(
  sb: SupabaseClient,
  roomCode: string,
  id: string,
  full: Buffer,
  thumb: Buffer,
): Promise<{ storagePath: string; thumbPath: string }> {
  const storagePath = `${roomCode}/${id}.jpg`;
  const thumbPath = `${roomCode}/${id}_thumb.jpg`;
  const upFull = await sb.storage.from(ALBUM_BUCKET).upload(storagePath, full, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (upFull.error) throw new Error(`upload failed: ${upFull.error.message}`);
  const upThumb = await sb.storage.from(ALBUM_BUCKET).upload(thumbPath, thumb, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (upThumb.error) throw new Error(`thumbnail upload failed: ${upThumb.error.message}`);
  return { storagePath, thumbPath };
}

export async function downloadFile(sb: SupabaseClient, filePath: string): Promise<Buffer> {
  const { data, error } = await sb.storage.from(ALBUM_BUCKET).download(filePath);
  if (error || !data) throw new Error(`download failed: ${error?.message ?? 'empty'}`);
  return Buffer.from(await data.arrayBuffer());
}

export async function signUrl(sb: SupabaseClient, filePath: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await sb.storage.from(ALBUM_BUCKET).createSignedUrl(filePath, expiresIn);
  if (error || !data) throw new Error(`signing failed: ${error?.message ?? 'empty'}`);
  return data.signedUrl;
}

export async function insertPhoto(
  sb: SupabaseClient,
  row: Omit<AlbumPhotoRow, 'id' | 'created_at' | 'attempts'> & { attempts?: number },
): Promise<AlbumPhotoRow> {
  const { data, error } = await sb.from(ALBUM_TABLE).insert(row).select().single();
  if (error || !data) throw new Error(`insert failed: ${error?.message ?? 'empty'}`);
  return data as AlbumPhotoRow;
}

export async function updatePhoto(
  sb: SupabaseClient,
  id: string,
  patch: Partial<AlbumPhotoRow>,
): Promise<void> {
  const { error } = await sb.from(ALBUM_TABLE).update(patch).eq('id', id);
  if (error) throw new Error(`update failed: ${error.message}`);
}

export async function listPending(sb: SupabaseClient, limit: number): Promise<AlbumPhotoRow[]> {
  const { data, error } = await sb
    .from(ALBUM_TABLE)
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw new Error(`pending query failed: ${error.message}`);
  return (data ?? []) as AlbumPhotoRow[];
}

/** How many photos are still waiting for classification. */
export async function countPending(sb: SupabaseClient): Promise<number> {
  const { count, error } = await sb
    .from(ALBUM_TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
  if (error) throw new Error(`pending count failed: ${error.message}`);
  return count ?? 0;
}

/** How many photos in a room are marked failed (for the retry affordance). */
export async function countFailed(sb: SupabaseClient, roomCode: string): Promise<number> {
  const { count, error } = await sb
    .from(ALBUM_TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('room_code', roomCode)
    .eq('status', 'failed');
  if (error) throw new Error(`failed count failed: ${error.message}`);
  return count ?? 0;
}

/**
 * Reset photos that can never finish on their own: 'failed' rows, and
 * 'pending' rows that already burned all their claims (e.g. the
 * function was killed mid-photo). They go back to pending with a
 * fresh attempt budget so a retry can classify them. Returns how
 * many rows were reset. Room-scoped: only the shared album's rows.
 */
export async function resetStuckPhotos(sb: SupabaseClient, roomCode: string): Promise<number> {
  const failed = await sb
    .from(ALBUM_TABLE)
    .update({ status: 'pending', attempts: 0 })
    .eq('room_code', roomCode)
    .eq('status', 'failed')
    .select('id');
  if (failed.error) throw new Error(`retry reset failed: ${failed.error.message}`);
  const stuck = await sb
    .from(ALBUM_TABLE)
    .update({ status: 'pending', attempts: 0 })
    .eq('room_code', roomCode)
    .eq('status', 'pending')
    .gte('attempts', MAX_ATTEMPTS)
    .select('id');
  if (stuck.error) throw new Error(`retry reset failed: ${stuck.error.message}`);
  return (failed.data ?? []).length + (stuck.data ?? []).length;
}

export async function listRoomPhotos(sb: SupabaseClient, roomCode: string, cap = 2000): Promise<AlbumPhotoRow[]> {
  const { data, error } = await sb
    .from(ALBUM_TABLE)
    .select('*')
    .eq('room_code', roomCode)
    .order('created_at', { ascending: false })
    .limit(cap);
  if (error) throw new Error(`room query failed: ${error.message}`);
  return (data ?? []) as AlbumPhotoRow[];
}
