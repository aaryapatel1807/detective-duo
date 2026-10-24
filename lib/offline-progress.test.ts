import { beforeEach, describe, expect, it, vi } from 'vitest';

function installFakeStorage() {
  const store = new Map<string, string>();
  const fake = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  };
  (globalThis as unknown as { localStorage: typeof fake }).localStorage = fake;
  return store;
}

// Hoisted mock Supabase: 'throw' simulates offline (every call fails),
// 'ok' simulates reconnected. Remote holds an older, weaker row.
const mockState = vi.hoisted(() => ({
  mode: 'throw' as 'throw' | 'ok',
  upserts: [] as Record<string, unknown>[],
  remoteRows: [
    {
      game: 'logic-grids',
      current_level: 2,
      stars: { '1': 2 },
      hints_used: 0,
      mistakes: 1,
      last_played_at: '2026-01-01T00:00:00.000Z',
    },
  ],
}));

vi.mock('./supabase/client', () => ({
  getSupabase: () => ({
    auth: {
      getSession: async () => {
        if (mockState.mode === 'throw') throw new Error('offline');
        return { data: { session: { user: { id: 'u1' } } } };
      },
    },
    from: () => ({
      upsert: async (row: Record<string, unknown>) => {
        if (mockState.mode === 'throw') throw new Error('offline');
        mockState.upserts.push(row);
        return { error: null };
      },
      select: () => ({
        eq: async () => {
          if (mockState.mode === 'throw') throw new Error('offline');
          return { data: mockState.remoteRows, error: null };
        },
      }),
    }),
  }),
}));

import {
  dequeuePendingProgress,
  emptyProgress,
  enqueuePendingProgress,
  flushPendingProgress,
  loadPendingProgress,
  recordWin,
  syncProgress,
} from './progress';

const tick = () => new Promise((r) => setTimeout(r, 20));

describe('offline progress queue', () => {
  beforeEach(() => {
    installFakeStorage();
    mockState.mode = 'throw';
    mockState.upserts = [];
  });

  it('a write while offline queues locally instead of losing the win', async () => {
    const { map } = recordWin({}, 'logic-grids', 1, 0, 0);
    expect(map['logic-grids'].currentLevel).toBe(2);
    expect(map['logic-grids'].stars['1']).toBe(3);
    await tick();
    const q = loadPendingProgress();
    expect(q['logic-grids']).toBeDefined();
    expect(q['logic-grids'].stars['1']).toBe(3);
    expect(q['logic-grids'].currentLevel).toBe(2);
  });

  it('reconnect syncs the queued row and keeps the best stars per level', async () => {
    const { map } = recordWin({}, 'logic-grids', 1, 0, 0);
    await tick();
    expect(loadPendingProgress()['logic-grids']).toBeDefined();

    mockState.mode = 'ok';
    const merged = await syncProgress(map);
    expect(mockState.upserts.length).toBeGreaterThan(0);
    expect(mockState.upserts[0]).toMatchObject({ game: 'logic-grids', current_level: 2 });
    expect(loadPendingProgress()).toEqual({});
    // Local 3 stars beat the remote 2 for level 1; level stays advanced.
    expect(merged['logic-grids'].stars['1']).toBe(3);
    expect(merged['logic-grids'].currentLevel).toBe(2);
  });

  it('flush retries the queue and leaves rows that still fail', async () => {
    enqueuePendingProgress('cipher-desk', {
      ...emptyProgress(),
      currentLevel: 3,
      stars: { '2': 3 },
      lastPlayedAt: '2026-10-24T00:00:00.000Z',
    });
    await flushPendingProgress();
    expect(loadPendingProgress()['cipher-desk']).toBeDefined();
    mockState.mode = 'ok';
    await flushPendingProgress();
    expect(loadPendingProgress()).toEqual({});
    expect(mockState.upserts).toHaveLength(1);
  });

  it('queue helpers round-trip and dequeue', () => {
    const p = { ...emptyProgress(), currentLevel: 2 };
    enqueuePendingProgress('nonograms', p);
    expect(loadPendingProgress()['nonograms'].currentLevel).toBe(2);
    dequeuePendingProgress('nonograms');
    expect(loadPendingProgress()).toEqual({});
  });
});
