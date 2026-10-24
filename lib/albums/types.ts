/**
 * Album photo types (backend only — no UI reads these yet).
 * A photo belongs to a together-room by its 4-letter code, the same
 * shared-secret model rooms use today: knowing the code is the key.
 * There are no accounts, so this is discovery-gating, not true auth.
 */
export type AlbumPhotoStatus = 'pending' | 'ready' | 'failed';

export interface AlbumPhotoRow {
  id: string;
  room_code: string;
  uploader: string;
  storage_path: string;
  thumb_path: string;
  status: AlbumPhotoStatus;
  attempts: number;
  taken_at: string | null;
  face_count: number | null;
  scene_tags: string[];
  lat: number | null;
  lon: number | null;
  created_at: string;
}

export interface AlbumPhotoOut {
  id: string;
  uploader: string;
  status: AlbumPhotoStatus;
  takenAt: string | null;
  faceCount: number | null;
  sceneTags: string[];
  hasPlace: boolean;
  thumbUrl: string;
  fullUrl: string;
  createdAt: string;
}

export interface ClassifyResult {
  faceCount: number;
  sceneTags: string[];
  topLabels: string[];
}

export type AlbumId =
  | 'all'
  | 'solo'
  | 'together'
  | 'places'
  | 'nature'
  | 'food'
  | 'city'
  | 'animals';
