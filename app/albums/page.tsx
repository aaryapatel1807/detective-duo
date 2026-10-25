'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Images, RefreshCw, Upload } from 'lucide-react';
import {
  ALBUMS_KEY_KEY,
  ALBUMS_NAME_KEY,
  AlbumsKeyError,
  AlbumsNotConfiguredError,
  faceLabel,
  fetchAlbumPhotos,
  fetchAlbumSummary,
  processAlbumsOnce,
  retryAlbums,
  uploadAlbumPhoto,
  type AlbumSummary,
} from '@/lib/albums/client';
import type { AlbumId, AlbumPhotoOut } from '@/lib/albums/types';
import { getDisplayName } from '@/lib/together/session';

interface UploadState {
  id?: string;
  name: string;
  state: 'uploading' | 'ready' | 'pending' | 'failed';
  detail: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AlbumsPage() {
  const [albumKey, setAlbumKey] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [summary, setSummary] = useState<AlbumSummary | null>(null);
  const [photos, setPhotos] = useState<AlbumPhotoOut[]>([]);
  const [total, setTotal] = useState(0);
  const [album, setAlbum] = useState<AlbumId>('all');
  const [month, setMonth] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<AlbumPhotoOut | null>(null);
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [classifyProgress, setClassifyProgress] = useState<{ done: number; total: number } | null>(null);
  const [classifyStuck, setClassifyStuck] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      const savedKey = localStorage.getItem(ALBUMS_KEY_KEY);
      const savedName = localStorage.getItem(ALBUMS_NAME_KEY) ?? getDisplayName() ?? '';
      if (savedKey) setAlbumKey(savedKey);
      setName(savedName);
      setNameInput(savedName);
    } catch {
      /* private mode: the key just doesn't persist */
    }
  }, []);

  const load = useCallback(
    async (key: string, albumId: AlbumId, monthValue: string | null) => {
      setLoading(true);
      setNotice(null);
      try {
        const [sum, page] = await Promise.all([
          fetchAlbumSummary(key),
          fetchAlbumPhotos(key, albumId, monthValue),
        ]);
        setSummary(sum);
        setPhotos(page.photos);
        setTotal(page.total);
      } catch (e) {
        if (e instanceof AlbumsNotConfiguredError) {
          setNotice(
            'Albums are still being set up on the server — this page will start working once setup finishes. Nothing is lost: photos uploaded after setup will appear here.',
          );
          setSummary(null);
          setPhotos([]);
          setTotal(0);
        } else if (e instanceof AlbumsKeyError) {
          try {
            localStorage.removeItem(ALBUMS_KEY_KEY);
          } catch {
            /* ignore */
          }
          setAlbumKey(null);
          setKeyInput('');
          setSummary(null);
          setPhotos([]);
          setNotice('That secret key is not right — try again.');
        } else {
          setNotice(e instanceof Error ? e.message : 'Could not load albums.');
        }
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Same refresh as load(), but silent: the poll loop calls it every
  // round, and load() would flash "Loading photos…" over the grid.
  const refreshQuietly = useCallback(async (key: string, albumId: AlbumId, monthValue: string | null) => {
    try {
      const [sum, page] = await Promise.all([
        fetchAlbumSummary(key),
        fetchAlbumPhotos(key, albumId, monthValue),
      ]);
      setSummary(sum);
      setPhotos(page.photos);
      setTotal(page.total);
    } catch {
      /* the main load effect owns error display */
    }
  }, []);

  /**
   * Drive classification to completion instead of firing one process
   * call and hoping: each call is time-budgeted server-side, so a
   * big batch needs several rounds. After every round the upload
   * list is updated from the ready photos, so entries flip from
   * 'Classifying…' to their labels one by one. batchIds are the
   * photo ids of this upload batch (empty on open = silent catch-up).
   * Never throws; a failed round just ends the loop, and the retry
   * button covers whatever is left.
   */
  const pollClassify = useCallback(
    async (key: string, batchIds: string[], albumId: AlbumId, monthValue: string | null) => {
      const batchSet = new Set(batchIds);
      let lastReadyIds = new Set<string>();
      let lastFailedTotal = 0;
      let rounds = 0;
      let pendingRemaining = 1;
      while (rounds < 30 && pendingRemaining > 0) {
        rounds++;
        try {
          const result = await processAlbumsOnce(key, 10);
          pendingRemaining = result.pendingRemaining;
          lastFailedTotal = result.failedTotal;
        } catch {
          break;
        }
        // Match against ALL ready photos (not the current filter view)
        // so batch entries flip even when another album is selected.
        try {
          const all = await fetchAlbumPhotos(key, 'all', null, 100, 0);
          lastReadyIds = new Set(all.photos.map((p) => p.id));
          const byId = new Map(all.photos.map((p) => [p.id, p]));
          setUploads((prev) =>
            prev.map((u) => {
              const p = u.id ? byId.get(u.id) : undefined;
              if (!p) return u;
              return {
                ...u,
                state: 'ready' as const,
                detail: `${faceLabel(p.faceCount)} · ${p.sceneTags.join(', ') || 'things'}`,
              };
            }),
          );
          if (batchSet.size > 0) {
            const done = batchIds.filter((id) => lastReadyIds.has(id)).length;
            setClassifyProgress({ done, total: batchSet.size });
          }
        } catch {
          /* next round retries */
        }
        await refreshQuietly(key, albumId, monthValue);
        if (pendingRemaining > 0) await new Promise((r) => setTimeout(r, 1000));
      }
      if (batchSet.size > 0) {
        const done = batchIds.filter((id) => lastReadyIds.has(id)).length;
        setClassifyProgress(done >= batchSet.size ? null : { done, total: batchSet.size });
        setClassifyStuck(done < batchSet.size || pendingRemaining > 0 || lastFailedTotal > 0);
      } else {
        // Silent catch-up still surfaces a retry when older photos
        // ended up failed, so they are not invisible.
        setClassifyStuck(pendingRemaining > 0 || lastFailedTotal > 0);
      }
    },
    [refreshQuietly],
  );

  useEffect(() => {
    if (!albumKey) return;
    void load(albumKey, album, month);
  }, [albumKey, album, month, load]);

  // Catch up anything left pending (cold uploads), then refresh once.
  useEffect(() => {
    if (!albumKey) return;
    let cancelled = false;
    void (async () => {
      await pollClassify(albumKey, [], album, month);
      if (!cancelled) void load(albumKey, album, month);
    })();
    return () => {
      cancelled = true;
    };
  }, [albumKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const openAlbum = () => {
    const key = keyInput.trim();
    if (!key) {
      setFormError('Enter the secret key.');
      return;
    }
    setFormError(null);
    const trimmedName = nameInput.trim().slice(0, 40) || 'Someone';
    try {
      localStorage.setItem(ALBUMS_KEY_KEY, key);
      localStorage.setItem(ALBUMS_NAME_KEY, trimmedName);
    } catch {
      /* ignore */
    }
    setName(trimmedName);
    setAlbumKey(key);
  };

  const lockAlbum = () => {
    try {
      localStorage.removeItem(ALBUMS_KEY_KEY);
    } catch {
      /* ignore */
    }
    setAlbumKey(null);
    setKeyInput('');
    setSummary(null);
    setPhotos([]);
  };

  const onUploadFiles = async (files: FileList | null) => {
    if (!files || !albumKey) return;
    const list = [...files].filter((f) => f.type.startsWith('image/'));
    if (list.length === 0) return;
    setUploads(list.map((f) => ({ name: f.name, state: 'uploading' as const, detail: 'Uploading…' })));
    setClassifyProgress(null);
    setClassifyStuck(false);
    const batchIds: string[] = [];
    for (const file of list) {
      try {
        const result = await uploadAlbumPhoto(albumKey, name || 'Someone', file);
        if (result.status === 'pending') batchIds.push(result.id);
        setUploads((prev) =>
          prev.map((u) =>
            u.name === file.name
              ? {
                  ...u,
                  id: result.id,
                  state: result.status,
                  detail:
                    result.status === 'ready'
                      ? `${faceLabel(result.faceCount)} · ${result.sceneTags.join(', ') || 'things'}`
                      : 'Classifying…',
                }
              : u,
          ),
        );
      } catch (e) {
        setUploads((prev) =>
          prev.map((u) =>
            u.name === file.name
              ? { name: file.name, state: 'failed' as const, detail: e instanceof Error ? e.message : 'Upload failed' }
              : u,
          ),
        );
      }
    }
    if (batchIds.length > 0) {
      setClassifyProgress({ done: 0, total: batchIds.length });
      await pollClassify(albumKey, batchIds, album, month);
    } else {
      void load(albumKey, album, month);
    }
  };

  // Reset failed/stuck photos and classify them again. Covers both
  // 'failed' rows and 'pending' rows that burned all their claims.
  const retryClassify = async () => {
    if (!albumKey) return;
    setClassifyStuck(false);
    try {
      await retryAlbums(albumKey);
    } catch {
      /* the poll below still retries whatever is pending */
    }
    const ids = uploads.filter((u) => u.id && u.state !== 'ready').map((u) => u.id as string);
    setUploads((prev) =>
      prev.map((u) =>
        u.state === 'failed' || u.state === 'pending'
          ? { ...u, state: 'pending' as const, detail: 'Classifying…' }
          : u,
      ),
    );
    if (ids.length > 0) setClassifyProgress({ done: 0, total: ids.length });
    await pollClassify(albumKey, ids, album, month);
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-2">
      <h1 className="font-display text-3xl font-bold tracking-tight">Albums</h1>
      <p className="mt-1 text-[var(--ink-dim)]">
        Your photos, sorted by the app itself — solo, together, places, and things.
      </p>

      {albumKey === null ? (
        <section className="panel mt-5 p-5">
          <h2 className="text-lg font-bold">One secret key</h2>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            This album belongs to two people only. Enter the secret key you share —
            nothing else opens it. Photos uploaded here stay here permanently.
          </p>
          <label className="mt-4 flex flex-col gap-1 text-sm font-semibold">
            Your name
            <input
              className="input"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Sachi"
              maxLength={40}
              aria-label="Your name"
            />
          </label>
          <label className="mt-3 flex flex-col gap-1 text-sm font-semibold">
            Secret key
            <input
              className="input"
              type="password"
              autoComplete="off"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="The key you share"
              aria-label="Secret key"
            />
          </label>
          <button type="button" className="btn btn-primary mt-4" onClick={openAlbum}>
            Open albums
          </button>
          {formError && (
            <p className="mt-2 text-sm" role="alert">
              {formError}
            </p>
          )}
        </section>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="chip">Shared album</span>
            <span className="chip">{name || 'Someone'}</span>
            <button type="button" className="btn !px-3 !py-2 text-sm" onClick={() => void load(albumKey, album, month)}>
              <RefreshCw size={16} aria-hidden /> Refresh
            </button>
            <button type="button" className="btn !px-3 !py-2 text-sm" onClick={lockAlbum}>
              Lock album
            </button>
          </div>

          <section className="panel mt-4 p-5">
            <h2 className="text-lg font-bold">Add photos</h2>
            <p className="mt-1 text-sm text-[var(--ink-dim)]">
              From your phone or computer. They get compressed, dated, and sorted automatically.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              aria-label="Choose photos"
              onChange={(e) => {
                void onUploadFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <button type="button" className="btn btn-primary mt-3" onClick={() => fileRef.current?.click()}>
              <Upload size={18} aria-hidden /> Choose photos
            </button>
            {uploads.length > 0 && (
              <ul className="mt-3 space-y-1">
                {uploads.map((u) => (
                  <li key={u.name} className="text-sm">
                    <span className="font-semibold">{u.name}</span>{' '}
                    <span className="text-[var(--ink-dim)]">
                      — {u.state === 'uploading' ? 'Uploading…' : u.state === 'failed' ? `Failed — ${u.detail}` : u.detail}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {classifyProgress && (
              <p className="mt-2 text-sm text-[var(--ink-dim)]" role="status">
                Classifying… {classifyProgress.done} of {classifyProgress.total} sorted.
              </p>
            )}
            {classifyStuck && (
              <p className="mt-2 text-sm">
                Some photos are still classifying or failed to classify.{' '}
                <button type="button" className="btn !px-3 !py-1 text-sm" onClick={() => void retryClassify()}>
                  Retry classification
                </button>
              </p>
            )}
          </section>

          {notice && (
            <p className="panel mt-4 p-5 text-sm" role="status">
              {notice}
            </p>
          )}

          {summary && (
            <>
              <div className="dash-filters mt-6">
                {summary.albums.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className={`dash-filter ${album === a.id ? 'active' : ''}`}
                    aria-pressed={album === a.id}
                    onClick={() => setAlbum(a.id)}
                  >
                    {a.title} ({a.count})
                  </button>
                ))}
              </div>
              {summary.months.length > 0 && (
                <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
                  Month
                  <select
                    className="input max-w-48"
                    value={month ?? ''}
                    onChange={(e) => setMonth(e.target.value || null)}
                    aria-label="Filter by month"
                  >
                    <option value="">All months</option>
                    {summary.months.map((m) => (
                      <option key={m.month} value={m.month}>
                        {m.month} ({m.count})
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {loading ? (
                <p className="mt-6 text-[var(--ink-dim)]">Loading photos…</p>
              ) : photos.length === 0 ? (
                <section className="panel mt-6 p-5">
                  <Images size={28} aria-hidden />
                  <h2 className="mt-2 text-lg font-bold">No photos here yet</h2>
                  <p className="mt-1 text-sm text-[var(--ink-dim)]">
                    {total === 0
                      ? 'Upload the first one above — it will be sorted automatically.'
                      : 'Nothing in this album or month yet. Try another album.'}
                  </p>
                </section>
              ) : (
                <>
                  <p className="mt-6 text-sm text-[var(--ink-dim)]">
                    {total} photo{total === 1 ? '' : 's'} in this view.
                  </p>
                  <div className="album-grid mt-3">
                    {photos.map((p) => (
                      <button key={p.id} type="button" onClick={() => setLightbox(p)} aria-label={`Open photo by ${p.uploader}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.thumbUrl} alt="" loading="lazy" className="album-thumb" />
                        <span className="mt-1 block text-left text-xs text-[var(--ink-dim)]">
                          {formatDate(p.takenAt ?? p.createdAt) || 'Unknown date'} · {faceLabel(p.faceCount)}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {lightbox && (
        <div
          className="album-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Photo"
          onClick={() => setLightbox(null)}
        >
          <div className="album-lightbox-card" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightbox.fullUrl} alt={`Photo by ${lightbox.uploader}`} />
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="chip">{faceLabel(lightbox.faceCount)}</span>
              {lightbox.sceneTags.map((t) => (
                <span key={t} className="chip">
                  {t}
                </span>
              ))}
              <span className="chip">by {lightbox.uploader}</span>
              {lightbox.takenAt && <span className="chip">{formatDate(lightbox.takenAt)}</span>}
            </div>
            <button type="button" className="btn mt-4" onClick={() => setLightbox(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
