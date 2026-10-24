import exifr from 'exifr';

/** EXIF date + GPS from a photo buffer. Never throws: missing data is null. */
export interface ExifInfo {
  takenAt: string | null;
  lat: number | null;
  lon: number | null;
}

export async function parseExif(buffer: Buffer): Promise<ExifInfo> {
  try {
    const tags = await exifr.parse(buffer);
    if (!tags) return { takenAt: null, lat: null, lon: null };
    const rawDate = tags.DateTimeOriginal ?? tags.CreateDate ?? tags.ModifyDate ?? null;
    let takenAt: string | null = null;
    if (rawDate instanceof Date && !Number.isNaN(rawDate.getTime())) takenAt = rawDate.toISOString();
    else if (typeof rawDate === 'string' && rawDate) {
      const d = new Date(rawDate);
      if (!Number.isNaN(d.getTime())) takenAt = d.toISOString();
    }
    const lat = typeof tags.latitude === 'number' && Math.abs(tags.latitude) <= 90 ? tags.latitude : null;
    const lon = typeof tags.longitude === 'number' && Math.abs(tags.longitude) <= 180 ? tags.longitude : null;
    return { takenAt, lat, lon };
  } catch {
    return { takenAt: null, lat: null, lon: null };
  }
}
