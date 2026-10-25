import { NextResponse } from 'next/server';
import { ALBUMS, photoInAlbum, photoMonth, placeCluster } from '@/lib/albums/albums';
import { SHARED_ALBUM_ROOM, albumKeyFromRequest, checkAlbumKey } from '@/lib/albums/auth';
import { getServiceClient, listRoomPhotos } from '@/lib/albums/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/albums/albums — auto-album counts, timeline months, and
 * place-cluster count for the one shared album. Only 'ready' photos
 * are counted. Requires the x-album-key header (the one shared key).
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
  const rows = (await listRoomPhotos(sb, SHARED_ALBUM_ROOM)).filter((p) => p.status === 'ready');
  const albums = ALBUMS.map((a) => ({
    id: a.id,
    title: a.title,
    blurb: a.blurb,
    count: rows.filter((p) => photoInAlbum(p, a.id)).length,
  }));
  const monthCounts = new Map<string, number>();
  const clusters = new Set<string>();
  for (const p of rows) {
    const m = photoMonth(p);
    monthCounts.set(m, (monthCounts.get(m) ?? 0) + 1);
    const c = placeCluster(p);
    if (c) clusters.add(c);
  }
  const months = [...monthCounts.entries()]
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => b.month.localeCompare(a.month));
  return NextResponse.json({ albums, months, placeClusters: clusters.size, total: rows.length });
}
