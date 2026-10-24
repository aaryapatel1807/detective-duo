import { NextResponse } from 'next/server';
import { ALBUMS, photoInAlbum, photoMonth, placeCluster } from '@/lib/albums/albums';
import { getServiceClient, listRoomPhotos } from '@/lib/albums/store';
import { isValidRoomCode, normalizeRoomCode } from '@/lib/together/roomCode';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/albums/albums?room=CODE — auto-album counts, timeline months,
 * and place-cluster count for a room. Only 'ready' photos are counted.
 */
export async function GET(request: Request) {
  const sb = getServiceClient();
  if (!sb) {
    return NextResponse.json({ error: 'albums are not configured yet' }, { status: 503 });
  }
  const params = new URL(request.url).searchParams;
  const roomCode = normalizeRoomCode(params.get('room') ?? '');
  if (!isValidRoomCode(roomCode)) {
    return NextResponse.json({ error: 'room must be a valid 4-letter room code' }, { status: 400 });
  }
  const rows = (await listRoomPhotos(sb, roomCode)).filter((p) => p.status === 'ready');
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
