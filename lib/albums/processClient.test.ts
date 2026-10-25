import { describe, expect, it, vi } from 'vitest';
import { processAlbumsOnce, retryAlbums } from './client';

function mockFetchOnce(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('process + retry client', () => {
  it('sends the key as a header and returns the process result', async () => {
    const body = {
      processed: 3,
      ready: 2,
      failed: 0,
      stillPending: 1,
      pendingRemaining: 1,
      failedTotal: 0,
      budgetStopped: true,
    };
    const fetchMock = mockFetchOnce(200, body);
    const result = await processAlbumsOnce('KEY1', 10);
    expect(result).toEqual(body);
    const [url, init] = (fetchMock as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/albums/process');
    expect(url).not.toContain('KEY1');
    expect((init.headers as Record<string, string>)['x-album-key']).toBe('KEY1');
    expect(init.body).toBe(JSON.stringify({ limit: 10 }));
  });

  it('posts to the retry route and returns the reset count', async () => {
    const fetchMock = mockFetchOnce(200, { reset: 4 });
    const result = await retryAlbums('KEY1');
    expect(result).toEqual({ reset: 4 });
    const [url, init] = (fetchMock as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/albums/retry');
    expect((init.headers as Record<string, string>)['x-album-key']).toBe('KEY1');
  });
});
