import { NextResponse } from 'next/server';
import { SHARED_ALBUM_ROOM, albumKeyFromRequest, getAlbumSecret, isAlbumKeyValid } from '@/lib/albums/auth';
import { classifyPhoto } from '@/lib/albums/classify';
import { claimDecision, overBudget, PROCESS_BUDGET_MS } from '@/lib/albums/processQueue';
import { countFailed, countPending, downloadFile, getServiceClient, listPending, updatePhoto } from '@/lib/albums/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/albums/process — classify pending photos (upload retries +
 * catch-up). Gate: the shared album key (x-album-key) or, if set,
 * the ALBUMS_WORKER_TOKEN (x-albums-token). When neither is configured
 * the route stays open, as before. Body: { "limit": 10 }.
 *
 * Two guards against the old stuck-at-classifying state:
 *  - Attempts are CLAIMED before inference, not counted on caught
 *    errors: a function killed mid-photo (platform timeout) never
 *    runs its catch block, so counting only on errors left that
 *    photo 'pending' forever. A claim costs one attempt even when
 *    the run dies, and a photo that burned MAX_ATTEMPTS claims
 *    without success is marked 'failed' on the next call.
 *  - The loop stops at PROCESS_BUDGET_MS (8s, under the smallest
 *    Vercel function limit) and reports pendingRemaining, so the
 *    client can call again for the rest instead of the invocation
 *    being killed mid-batch. No maxDuration is set here on purpose:
 *    raising it needs a paid plan, and this design works on any plan.
 * Response: { processed, ready, failed, stillPending,
 *             pendingRemaining, failedTotal, budgetStopped }.
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
  const startedAt = Date.now();
  const pending = await listPending(sb, limit);
  let ready = 0;
  let failed = 0;
  let examined = 0;
  let budgetStopped = false;
  for (const photo of pending) {
    if (overBudget(startedAt, Date.now(), PROCESS_BUDGET_MS)) {
      budgetStopped = true;
      break;
    }
    examined++;
    if (claimDecision(photo.attempts) === 'fail') {
      try {
        await updatePhoto(sb, photo.id, { status: 'failed' });
        failed++;
      } catch (e) {
        console.error('album process failed to mark failed for', photo.id, e);
      }
      continue;
    }
    // Claim first: if this invocation dies mid-photo, the attempt is
    // still counted and the photo cannot stay pending forever.
    try {
      await updatePhoto(sb, photo.id, { attempts: (photo.attempts ?? 0) + 1 });
    } catch (e) {
      console.error('album process failed to claim', photo.id, e);
      continue;
    }
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
      // No second attempt increment here: the claim above already
      // counted it. The photo stays pending for the next call, and
      // after MAX_ATTEMPTS claims it is marked failed above.
      console.error('album process failed for', photo.id, e);
    }
  }
  const pendingRemaining = await countPending(sb);
  const failedTotal = await countFailed(sb, SHARED_ALBUM_ROOM);
  return NextResponse.json({
    processed: examined,
    ready,
    failed,
    stillPending: examined - ready - failed,
    pendingRemaining,
    failedTotal,
    budgetStopped,
  });
}
