import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { SHARED_ALBUM_ROOM, checkAlbumKey } from '@/lib/albums/auth';
import { parseExif } from '@/lib/albums/exif';
import { MAX_UPLOAD_BYTES, processImage } from '@/lib/albums/images';
import { getServiceClient, insertPhoto, uploadFiles } from '@/lib/albums/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/albums/upload — multipart: key, uploader, file.
 * The key is the one shared secret (x-album-key header also works).
 * Stores a compressed photo + thumbnail in the private bucket, records
 * its EXIF date/place, and returns 'pending' right away. Classification
 * (faces + scene) runs afterwards via /api/albums/process, which the
 * album page calls after uploads — it used to run inline here, but a
 * cold model load can outlast the function's time limit and turn a
 * stored photo into a failed upload, so uploads never wait on it.
 * Photos stay in the private bucket permanently: there is no expiry
 * and no delete path; only the signed view links expire (1 hour) and
 * are re-signed on every list.
 *
 * The page shrinks big photos in the browser before sending (the
 * platform rejects bodies over ~4.5MB before this route ever runs),
 * and a canvas redraw strips EXIF — so the page may also send
 * takenAt/lat/lon fields read from the original file. Those fields,
 * when valid, win over parsing the uploaded bytes.
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
  const key = request.headers.get('x-album-key') ?? String(form.get('key') ?? '');
  const auth = checkAlbumKey(key || null);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const uploader = String(form.get('uploader') ?? 'Someone').trim().slice(0, 40) || 'Someone';
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'photo is larger than 4MB' }, { status: 400 });
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
  // Fields carried from the original file win when valid (a shrunk
  // upload has no EXIF left in its bytes); otherwise the parsed bytes.
  const fieldTakenAt = form.get('takenAt');
  let takenAt = exif.takenAt;
  if (typeof fieldTakenAt === 'string' && fieldTakenAt) {
    const d = new Date(fieldTakenAt);
    if (!Number.isNaN(d.getTime())) takenAt = d.toISOString();
  }
  const fieldNumber = (v: FormDataEntryValue | null, max: number): number | null => {
    if (typeof v !== 'string' || v.trim() === '') return null;
    const n = Number(v);
    return Number.isFinite(n) && Math.abs(n) <= max ? n : null;
  };
  const lat = fieldNumber(form.get('lat'), 90) ?? exif.lat;
  const lon = fieldNumber(form.get('lon'), 180) ?? exif.lon;
  const id = randomUUID();
  let paths;
  try {
    paths = await uploadFiles(sb, SHARED_ALBUM_ROOM, id, processed.full, processed.thumb);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'storage failed' }, { status: 500 });
  }
  const row = await insertPhoto(sb, {
    room_code: SHARED_ALBUM_ROOM,
    uploader,
    storage_path: paths.storagePath,
    thumb_path: paths.thumbPath,
    status: 'pending',
    taken_at: takenAt,
    face_count: null,
    scene_tags: [],
    lat,
    lon,
  });
  // Pending by design: /api/albums/process classifies it next. The
  // photo is already stored permanently at this point.
  return NextResponse.json({
    id: row.id,
    status: 'pending',
    faceCount: null,
    sceneTags: [],
    takenAt,
  });
}
