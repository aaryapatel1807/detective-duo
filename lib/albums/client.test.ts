import { describe, expect, it, vi } from 'vitest';
import {
  AlbumsKeyError,
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
  it('sends the secret key as a header, never in the URL', async () => {
    const fetchMock = mockFetchOnce(200, { albums: [], months: [], placeClusters: 0, total: 0 });
    await fetchAlbumSummary('KEY1');
    const [url, init] = (fetchMock as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/albums/albums');
    expect(url).not.toContain('KEY1');
    expect((init.headers as Record<string, string>)['x-album-key']).toBe('KEY1');
    const photosMock = mockFetchOnce(200, { photos: [], total: 0, limit: 50, offset: 0 });
    await fetchAlbumPhotos('KEY1', 'together', '2026-10');
    const [photosUrl, photosInit] = (photosMock as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(photosUrl).toContain('album=together');
    expect(photosUrl).toContain('month=2026-10');
    expect(photosUrl).not.toContain('KEY1');
    expect((photosInit.headers as Record<string, string>)['x-album-key']).toBe('KEY1');
    vi.unstubAllGlobals();
  });
  it('maps a 503 to the not-configured error', async () => {
    mockFetchOnce(503, {});
    await expect(fetchAlbumSummary('KEY1')).rejects.toBeInstanceOf(AlbumsNotConfiguredError);
    vi.unstubAllGlobals();
  });
  it('maps a 401 to the wrong-key error', async () => {
    mockFetchOnce(401, { error: 'that secret key is not right' });
    await expect(fetchAlbumSummary('WRONG')).rejects.toBeInstanceOf(AlbumsKeyError);
    vi.unstubAllGlobals();
  });
  it('uploads with key, uploader, and file in form data', async () => {
    const fetchMock = mockFetchOnce(200, { id: '1', status: 'ready', faceCount: 2, sceneTags: ['nature'], takenAt: null });
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    const result = await uploadAlbumPhoto('KEY1', 'Sachi', file);
    expect(result.faceCount).toBe(2);
    const [url, init] = (fetchMock as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/albums/upload');
    const form = init.body as FormData;
    expect(form.get('key')).toBe('KEY1');
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
