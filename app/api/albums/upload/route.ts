import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { classifyPhoto } from '@/lib/albums/classify';
import { parseExif } from '@/lib/albums/exif';
import { MAX_UPLOAD_BYTES, processImage } from '@/lib/albums/images';
import { getServiceClient, insertPhoto, updatePhoto, uploadFiles } from '@/lib/albums/store';
import { isValidRoomCode, normalizeRoomCode } from '@/lib/together/roomCode';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/albums/upload — multipart: room_code, uploader, file.
 * Stores a compressed photo + thumbnail in the private bucket, records
 * its EXIF date/place, then classifies it (faces + scene). If the
 * classification step fails or runs long, the row stays 'pending' and
 * /api/albums/process picks it up later — the upload still succeeds.
 */
export async function POST(request: Request) {
  const sb = getServiceClient();
  if (!sb) {
    return NextResponse.json(
      { error: 'albums are not configured yet (missing Supabase service key)' },
      { status: 503 },
    );
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'expected multipart form data' }, { status: 400 });
  }
  const roomCode = normalizeRoomCode(String(form.get('room_code') ?? ''));
  if (!isValidRoomCode(roomCode)) {
    return NextResponse.json({ error: 'room_code must be a valid 4-letter room code' }, { status: 400 });
  }
  const uploader = String(form.get('uploader') ?? 'Someone').trim().slice(0, 40) || 'Someone';
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'photo is larger than 15MB' }, { status: 400 });
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'file must be an image' }, { status: 400 });
  }
  const original = Buffer.from(await file.arrayBuffer());
  let processed;
  try {
    processed = await processImage(original);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unreadable image' }, { status: 400 });
  }
  const exif = await parseExif(original);
  const id = randomUUID();
  let paths;
  try {
    paths = await uploadFiles(sb, roomCode, id, processed.full, processed.thumb);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'storage failed' }, { status: 500 });
  }
  const row = await insertPhoto(sb, {
    room_code: roomCode,
    uploader,
    storage_path: paths.storagePath,
    thumb_path: paths.thumbPath,
    status: 'pending',
    taken_at: exif.takenAt,
    face_count: null,
    scene_tags: [],
    lat: exif.lat,
    lon: exif.lon,
  });
  // Best-effort inline classification; the process route retries the rest.
  try {
    const assetBase = new URL(request.url).origin;
    const result = await classifyPhoto(processed.full, assetBase);
    await updatePhoto(sb, row.id, {
      status: 'ready',
      face_count: result.faceCount,
      scene_tags: result.sceneTags,
    });
    return NextResponse.json({
      id: row.id,
      status: 'ready',
      faceCount: result.faceCount,
      sceneTags: result.sceneTags,
      takenAt: exif.takenAt,
    });
  } catch (e) {
    console.error('album classify failed, leaving pending:', e);
    return NextResponse.json({ id: row.id, status: 'pending', faceCount: null, sceneTags: [], takenAt: exif.takenAt });
  }
}
