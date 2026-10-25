/**
 * Batching rules for /api/albums/process, kept pure so they are unit
 * testable without Supabase.
 *
 * Why these exist: the process route runs inside a short-lived
 * serverless function. When the platform kills an invocation mid-loop
 * (timeout), the in-flight photo's catch block never runs — so
 * counting attempts only on caught errors leaves that photo
 * 'pending' forever, never progressing toward 'failed'. The fix is
 * to count the attempt BEFORE inference (a claim): a killed run
 * still costs one attempt, and after MAX_ATTEMPTS claims without a
 * success the photo is marked failed instead of staying stuck.
 * The loop also stops itself before a safe time budget so it can
 * still return a response (and the client can call again) instead
 * of being killed mid-photo.
 */

/** Claims without a success after which a photo is marked failed. */
export const MAX_ATTEMPTS = 3;

/**
 * Per-invocation time budget for the process loop. Deliberately under
 * the smallest Vercel function limit (10s on Hobby without Fluid
 * compute) so the route returns instead of being killed mid-photo.
 */
export const PROCESS_BUDGET_MS = 8000;

/**
 * What to do with a pending photo: 'process' it (claiming one
 * attempt) or mark it 'fail' because it already burned its claims.
 */
export function claimDecision(attempts: number | null | undefined): 'process' | 'fail' {
  return (attempts ?? 0) >= MAX_ATTEMPTS ? 'fail' : 'process';
}

/** True once the loop has spent its budget and should stop cleanly. */
export function overBudget(startedAt: number, now: number, budgetMs: number = PROCESS_BUDGET_MS): boolean {
  return now - startedAt >= budgetMs;
}
