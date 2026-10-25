import sharp from 'sharp';

/**
 * Server-side guard, kept UNDER the platform's ~4.5MB request-body cap
 * so an oversized upload fails here with a readable error instead of
 * being rejected by the platform before the route ever runs (413 with
 * no body). Normal uploads never reach this: the page shrinks big
 * photos in the browser first (see compressPhotoForUpload), so what
 * arrives is usually well under 1MB.
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp']);

/**
 * Normalize an uploaded photo: auto-rotate from EXIF orientation,
 * a full-size JPEG (max 2048px, quality 80) and a thumbnail (480px).
 * Rejects non-image formats v1 cannot decode.
 */
export async function processImage(buffer: Buffer): Promise<{ full: Buffer; thumb: Buffer; format: string }> {
  const meta = await sharp(buffer).metadata();
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
    throw new Error(`unsupported image format: ${meta.format ?? 'unknown'} (use JPEG, PNG, or WebP)`);
  }
  const full = await sharp(buffer)
    .rotate()
    .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  const thumb = await sharp(buffer)
    .rotate()
    .resize(480, 480, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 75 })
    .toBuffer();
  return { full, thumb, format: meta.format };
}
