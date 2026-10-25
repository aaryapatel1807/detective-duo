import { NextResponse } from 'next/server';
import { SHARED_ALBUM_ROOM, albumKeyFromRequest, getAlbumSecret, isAlbumKeyValid } from '@/lib/albums/auth';
import { getServiceClient, resetStuckPhotos } from '@/lib/albums/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/albums/retry — give up on stuck photos another chance.
 * Resets 'failed' rows, and 'pending' rows that already burned all
 * their claims, back to pending with a fresh attempt budget, so the
 * next /api/albums/process call classifies them. Same gate as
 * /process: the shared album key (x-album-key) or, if set, the
 * ALBUMS_WORKER_TOKEN (x-albums-token). Response: { reset }.
 */
export async function POST(request: Request) {
  const workerToken = process.env.ALBUMS_WORKER_TOKEN;
  const workerOk = !!workerToken && request.headers.get('x-albums-token') === workerToken;
  const keyOk = isAlbumKeyValid(albumKeyFromRequest(request));
  const gated = !!workerToken || !!getAlbumSecret();
  if (gated && !workerOk && !keyOk) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const sb = getServiceClient();
  if (!sb) {
    return NextResponse.json({ error: 'albums are not configured yet' }, { status: 503 });
  }
  const reset = await resetStuckPhotos(sb, SHARED_ALBUM_ROOM);
  return NextResponse.json({ reset });
}
