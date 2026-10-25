import { NextResponse } from 'next/server';
import { albumKeyFromRequest, getAlbumSecret, isAlbumKeyValid } from '@/lib/albums/auth';
import { classifyPhoto } from '@/lib/albums/classify';
import { downloadFile, getServiceClient, listPending, updatePhoto } from '@/lib/albums/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/albums/process — classify pending photos (upload retries +
 * cron catch-up). Gate: the shared album key (x-album-key) or, if set,
 * the ALBUMS_WORKER_TOKEN (x-albums-token). When neither is configured
 * the route stays open, as before. Body: { "limit": 10 }. Photos
 * failing 3 times are marked failed.
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
  let limit = 10;
  try {
    const body = await request.json();
    if (typeof body?.limit === 'number') limit = Math.min(50, Math.max(1, Math.floor(body.limit)));
  } catch {
    /* empty body is fine */
  }
  const pending = await listPending(sb, limit);
  let ready = 0;
  let failed = 0;
  for (const photo of pending) {
    try {
      const assetBase = new URL(request.url).origin;
      const full = await downloadFile(sb, photo.storage_path);
      const result = await classifyPhoto(full, assetBase);
      await updatePhoto(sb, photo.id, {
        status: 'ready',
        face_count: result.faceCount,
        scene_tags: result.sceneTags,
      });
      ready++;
    } catch (e) {
      console.error('album process failed for', photo.id, e);
      const attempts = (photo.attempts ?? 0) + 1;
      await updatePhoto(sb, photo.id, {
        status: attempts >= 3 ? 'failed' : 'pending',
        attempts,
      });
      if (attempts >= 3) failed++;
    }
  }
  return NextResponse.json({ processed: pending.length, ready, failed, stillPending: pending.length - ready - failed });
}
