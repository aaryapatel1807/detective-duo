/**
 * Dev-only end-to-end check for the album classifier (NOT shipped).
 * Runs the REAL lib/albums/classify.ts pipeline on image files and
 * prints face counts, scene tags, and timing. Usage:
 *   npx tsx scripts/ml-smoke-test.mjs <image...>
 * Exits non-zero if any image fails to classify.
 */
import { classifyPhoto } from '../lib/albums/classify.ts';

const images = process.argv.slice(2);
if (!images.length) {
  console.error('usage: npx tsx scripts/ml-smoke-test.mjs <image...>');
  process.exit(2);
}
let failed = 0;
for (const img of images) {
  const fs = await import('node:fs');
  const buffer = fs.readFileSync(img);
  const started = Date.now();
  try {
    const result = await classifyPhoto(buffer);
    console.log(
      `${img}: faces=${result.faceCount} tags=[${result.sceneTags.join(',')}] top=[${result.topLabels.join(' | ')}] (${Date.now() - started}ms)`,
    );
  } catch (e) {
    failed++;
    console.log(`${img}: FAILED: ${e instanceof Error ? e.message : e}`);
  }
}
process.exit(failed ? 1 : 0);
