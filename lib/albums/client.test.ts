import { describe, expect, it, vi } from 'vitest';
import {
  AlbumsNotConfiguredError,
  faceLabel,
  fetchAlbumPhotos,
  fetchAlbumSummary,
  uploadAlbumPhoto,
} from './client';

function mockFetchOnce(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('album client', () => {
  it('builds the summary and photos URLs from room + filters', async () => {
    const fetchMock = mockFetchOnce(200, { albums: [], months: [], placeClusters: 0, total: 0 });
    await fetchAlbumSummary('ABCD');
    expect(fetchMock).toHaveBeenCalledWith('/api/albums/albums?room=ABCD');
    const photosMock = mockFetchOnce(200, { photos: [], total: 0, limit: 50, offset: 0 });
    await fetchAlbumPhotos('ABCD', 'together', '2026-10');
    const url = (photosMock as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('room=ABCD');
    expect(url).toContain('album=together');
    expect(url).toContain('month=2026-10');
    vi.unstubAllGlobals();
  });
  it('maps a 503 to the not-configured error', async () => {
    mockFetchOnce(503, {});
    await expect(fetchAlbumSummary('ABCD')).rejects.toBeInstanceOf(AlbumsNotConfiguredError);
    vi.unstubAllGlobals();
  });
  it('uploads with room_code, uploader, and file in form data', async () => {
    const fetchMock = mockFetchOnce(200, { id: '1', status: 'ready', faceCount: 2, sceneTags: ['nature'], takenAt: null });
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    const result = await uploadAlbumPhoto('ABCD', 'Sachi', file);
    expect(result.faceCount).toBe(2);
    const [url, init] = (fetchMock as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/albums/upload');
    const form = init.body as FormData;
    expect(form.get('room_code')).toBe('ABCD');
    expect(form.get('uploader')).toBe('Sachi');
    expect((form.get('file') as File).name).toBe('photo.jpg');
    vi.unstubAllGlobals();
  });
  it('labels face counts for the UI', () => {
    expect(faceLabel(null)).toBe('Classifying…');
    expect(faceLabel(0)).toBe('No faces');
    expect(faceLabel(1)).toBe('1 face');
    expect(faceLabel(3)).toBe('3 faces');
  });
});
