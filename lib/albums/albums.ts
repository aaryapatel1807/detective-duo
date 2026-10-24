import type { AlbumId, AlbumPhotoRow } from './types';

/** Auto-albums, Google-Photos style: views over photo tags, not folders. */
export const ALBUMS: { id: AlbumId; title: string; blurb: string }[] = [
  { id: 'all', title: 'All photos', blurb: 'Everything in this room.' },
  { id: 'solo', title: 'Solo', blurb: 'Photos with one face.' },
  { id: 'together', title: 'Together', blurb: 'Photos with two or more faces.' },
  { id: 'places', title: 'Places', blurb: 'Photos with a saved location.' },
  { id: 'nature', title: 'Nature', blurb: 'Beaches, mountains, and the outdoors.' },
  { id: 'food', title: 'Food', blurb: 'Meals, cafes, and treats.' },
  { id: 'city', title: 'City', blurb: 'Streets, buildings, and bridges.' },
  { id: 'animals', title: 'Animals', blurb: 'Pets and wildlife.' },
];

export function photoInAlbum(photo: AlbumPhotoRow, album: AlbumId): boolean {
  switch (album) {
    case 'all':
      return true;
    case 'solo':
      return photo.face_count === 1;
    case 'together':
      return (photo.face_count ?? 0) >= 2;
    case 'places':
      return photo.lat !== null && photo.lon !== null;
    case 'nature':
      return photo.scene_tags.includes('nature') || photo.scene_tags.includes('beach');
    case 'food':
      return photo.scene_tags.includes('food');
    case 'city':
      return photo.scene_tags.includes('city');
    case 'animals':
      return photo.scene_tags.includes('animals');
  }
}

/** Month key (YYYY-MM) from a photo's taken date, else its upload date. */
export function photoMonth(photo: AlbumPhotoRow): string {
  const d = new Date(photo.taken_at ?? photo.created_at);
  if (Number.isNaN(d.getTime())) return 'unknown';
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Rough place cluster (~1km) so nearby photos group without naming places. */
export function placeCluster(photo: AlbumPhotoRow): string | null {
  if (photo.lat === null || photo.lon === null) return null;
  return `${photo.lat.toFixed(2)},${photo.lon.toFixed(2)}`;
}
