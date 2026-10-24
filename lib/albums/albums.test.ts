import { describe, expect, it } from 'vitest';
import { mapLabelsToTags } from './sceneTags';
import { countFaces, decodeYuNet, nms } from './decode';
import { photoInAlbum, photoMonth, placeCluster } from './albums';
import type { AlbumPhotoRow } from './types';

describe('mapLabelsToTags', () => {
  it('maps seashore and pier to beach', () => {
    expect(mapLabelsToTags(['seashore', 'pier', 'lakeside'])).toEqual(['beach']);
  });
  it('maps suspension bridge to city', () => {
    expect(mapLabelsToTags(['suspension bridge', 'steel arch bridge'])).toEqual(['city']);
  });
  it('maps food labels to food and keeps order', () => {
    expect(mapLabelsToTags(['pizza', 'seashore'])).toEqual(['food', 'beach']);
  });
  it('falls back to things when nothing matches', () => {
    expect(mapLabelsToTags(['comic book', 'puck'])).toEqual(['things']);
  });
});

describe('decodeYuNet', () => {
  // One stride-8 cell with a strong face score, at col 64, row 22.
  // OpenCV's formula: cx=(64+0.11)*8=512.9, cy=(22+0.49)*8=179.9,
  // w=exp(2.20)*8=72.2, h=exp(2.64)*8=112.1. This is the bearded man's
  // face from the real group photo, whose OpenCV box was
  // (476.9, 123.9, 72.1, 112.3) — the decode must reproduce it.
  function fakeOutputs() {
    const cls = new Float32Array(6400).fill(0);
    const obj = new Float32Array(6400).fill(0);
    const bbox = new Float32Array(6400 * 4).fill(0);
    const idx = 22 * 80 + 64;
    cls[idx] = 0.76;
    obj[idx] = 0.955;
    bbox[idx * 4] = 0.11;
    bbox[idx * 4 + 1] = 0.49;
    bbox[idx * 4 + 2] = 2.2;
    bbox[idx * 4 + 3] = 2.64;
    return { cls_8: cls, obj_8: obj, bbox_8: bbox };
  }
  it('reproduces OpenCVs box for a known face cell', () => {
    const boxes = decodeYuNet(fakeOutputs(), 640, 640, 0.6);
    expect(boxes).toHaveLength(1);
    const b = boxes[0];
    expect(b.x).toBeCloseTo(476.8, 0);
    expect(b.y).toBeCloseTo(123.9, 0);
    expect(b.w).toBeCloseTo(72.2, 0);
    expect(b.h).toBeCloseTo(112.1, 0);
    expect(b.score).toBeCloseTo(Math.sqrt(0.76 * 0.955), 3);
  });
  it('drops cells below threshold', () => {
    const out = fakeOutputs();
    (out.cls_8 as Float32Array)[22 * 80 + 64] = 0.2;
    expect(decodeYuNet(out, 640, 640, 0.6)).toHaveLength(0);
  });
  it('countFaces applies NMS to overlapping boxes', () => {
    const a = { x: 0, y: 0, w: 100, h: 100, score: 0.9 };
    const b = { x: 10, y: 10, w: 100, h: 100, score: 0.8 };
    const c = { x: 300, y: 300, w: 50, h: 50, score: 0.7 };
    expect(nms([a, b, c])).toHaveLength(2);
    expect(countFaces({ cls_8: [], obj_8: [], bbox_8: [] }, 640, 640).count).toBe(0);
  });
});

const basePhoto: AlbumPhotoRow = {
  id: '1',
  room_code: 'ABCD',
  uploader: 'Aarya',
  storage_path: 'a.jpg',
  thumb_path: 'a_t.jpg',
  status: 'ready',
  attempts: 0,
  taken_at: '2026-10-24T12:00:00Z',
  face_count: 1,
  scene_tags: ['nature'],
  lat: 22.3,
  lon: 73.2,
  created_at: '2026-10-24T12:00:00Z',
};

describe('album filters', () => {
  it('solo vs together split on face count', () => {
    expect(photoInAlbum(basePhoto, 'solo')).toBe(true);
    expect(photoInAlbum(basePhoto, 'together')).toBe(false);
    expect(photoInAlbum({ ...basePhoto, face_count: 3 }, 'together')).toBe(true);
  });
  it('places needs coordinates, nature covers beach', () => {
    expect(photoInAlbum(basePhoto, 'places')).toBe(true);
    expect(photoInAlbum({ ...basePhoto, scene_tags: ['beach'] }, 'nature')).toBe(true);
    expect(photoInAlbum({ ...basePhoto, lat: null, lon: null }, 'places')).toBe(false);
  });
  it('month and place cluster derive from the row', () => {
    expect(photoMonth(basePhoto)).toBe('2026-10');
    expect(placeCluster(basePhoto)).toBe('22.30,73.20');
  });
});
