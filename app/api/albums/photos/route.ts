import { NextResponse } from 'next/server';
import { ALBUMS, photoInAlbum, photoMonth } from '@/lib/albums/albums';
import { SHARED_ALBUM_ROOM, albumKeyFromRequest, checkAlbumKey } from '@/lib/albums/auth';
import { getServiceClient, listRoomPhotos, signUrl } from '@/lib/albums/store';
import type { AlbumId } from '@/lib/albums/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/albums/photos?album=all&month=YYYY-MM&limit=50&offset=0
 * Lists the shared album's photos with signed thumbnail + full URLs
 * (1 hour). Only 'ready' photos are listed; pending ones appear once
 * classified. Requires the x-album-key header (the one shared key).
 */
export async function GET(request: Request) {
  const sb = getServiceClient();
  if (!sb) {
    return NextResponse.json({ error: 'albums are not configured yet' }, { status: 503 });
  }
  const auth = checkAlbumKey(albumKeyFromRequest(request));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const params = new URL(request.url).searchParams;
  const album = (params.get('album') ?? 'all') as AlbumId;
  if (!ALBUMS.some((a) => a.id === album)) {
    return NextResponse.json({ error: `unknown album: ${album}` }, { status: 400 });
  }
  const month = params.get('month');
  if (month !== null && !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'month must be YYYY-MM' }, { status: 400 });
  }
  const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') ?? '50', 10) || 50));
  const offset = Math.max(0, parseInt(params.get('offset') ?? '0', 10) || 0);
  const rows = await listRoomPhotos(sb, SHARED_ALBUM_ROOM);
  const filtered = rows
    .filter((p) => p.status === 'ready')
    .filter((p) => photoInAlbum(p, album))
    .filter((p) => month === null || photoMonth(p) === month)
    .sort((a, b) => {
      const da = a.taken_at ?? a.created_at;
      const db = b.taken_at ?? b.created_at;
      return db.localeCompare(da);
    });
  const page = filtered.slice(offset, offset + limit);
  const photos = [];
  for (const p of page) {
    try {
      const [thumbUrl, fullUrl] = await Promise.all([signUrl(sb, p.thumb_path), signUrl(sb, p.storage_path)]);
      photos.push({
        id: p.id,
        uploader: p.uploader,
        status: p.status,
        takenAt: p.taken_at,
        faceCount: p.face_count,
        sceneTags: p.scene_tags,
        hasPlace: p.lat !== null && p.lon !== null,
        thumbUrl,
        fullUrl,
        createdAt: p.created_at,
      });
    } catch (e) {
      console.error('album sign failed for', p.id, e);
    }
  }
  return NextResponse.json({ photos, total: filtered.length, limit, offset });
}
