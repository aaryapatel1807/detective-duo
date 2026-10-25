'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Images, RefreshCw, Upload } from 'lucide-react';
import {
  ALBUMS_NAME_KEY,
  ALBUMS_ROOM_KEY,
  AlbumsNotConfiguredError,
  faceLabel,
  fetchAlbumPhotos,
  fetchAlbumSummary,
  runAlbumProcess,
  uploadAlbumPhoto,
  type AlbumSummary,
} from '@/lib/albums/client';
import type { AlbumId, AlbumPhotoOut } from '@/lib/albums/types';
import { isValidRoomCode, normalizeRoomCode } from '@/lib/together/roomCode';
import { getDisplayName } from '@/lib/together/session';

interface UploadState {
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
  const [room, setRoom] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [summary, setSummary] = useState<AlbumSummary | null>(null);
  const [photos, setPhotos] = useState<AlbumPhotoOut[]>([]);
  const [total, setTotal] = useState(0);
  const [album, setAlbum] = useState<AlbumId>('all');
  const [month, setMonth] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<AlbumPhotoOut | null>(null);
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      const savedRoom = localStorage.getItem(ALBUMS_ROOM_KEY);
      const savedName = localStorage.getItem(ALBUMS_NAME_KEY) ?? getDisplayName() ?? '';
      if (savedRoom && isValidRoomCode(savedRoom)) setRoom(savedRoom);
      setName(savedName);
      setNameInput(savedName);
    } catch {
      /* private mode: rooms just don't persist */
    }
  }, []);

  const load = useCallback(
    async (roomCode: string, albumId: AlbumId, monthValue: string | null) => {
      setLoading(true);
      setNotice(null);
      try {
        const [sum, page] = await Promise.all([
          fetchAlbumSummary(roomCode),
          fetchAlbumPhotos(roomCode, albumId, monthValue),
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
        } else {
          setNotice(e instanceof Error ? e.message : 'Could not load albums.');
        }
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!room) return;
    void load(room, album, month);
  }, [room, album, month, load]);

  // Catch up anything left pending (cold uploads), then refresh once.
  useEffect(() => {
    if (!room) return;
    let cancelled = false;
    void (async () => {
      await runAlbumProcess();
      if (!cancelled) void load(room, album, month);
    })();
    return () => {
      cancelled = true;
    };
  }, [room]); // eslint-disable-line react-hooks/exhaustive-deps

  const openRoom = () => {
    const code = normalizeRoomCode(codeInput);
    if (!isValidRoomCode(code)) {
      setFormError('Room codes are 4 letters — check the code and try again.');
      return;
    }
    setFormError(null);
    const trimmedName = nameInput.trim().slice(0, 40) || 'Someone';
    try {
      localStorage.setItem(ALBUMS_ROOM_KEY, code);
      localStorage.setItem(ALBUMS_NAME_KEY, trimmedName);
    } catch {
      /* ignore */
    }
    setName(trimmedName);
    setRoom(code);
  };

  const changeRoom = () => {
    try {
      localStorage.removeItem(ALBUMS_ROOM_KEY);
    } catch {
      /* ignore */
    }
    setRoom(null);
    setCodeInput('');
    setSummary(null);
    setPhotos([]);
  };

  const onUploadFiles = async (files: FileList | null) => {
    if (!files || !room) return;
    const list = [...files].filter((f) => f.type.startsWith('image/'));
    if (list.length === 0) return;
    setUploads(list.map((f) => ({ name: f.name, state: 'uploading' as const, detail: 'Uploading…' })));
    let anyPending = false;
    for (const file of list) {
      try {
        const result = await uploadAlbumPhoto(room, name || 'Someone', file);
        if (result.status === 'pending') anyPending = true;
        setUploads((prev) =>
          prev.map((u) =>
            u.name === file.name
              ? {
                  name: file.name,
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
    if (anyPending) await runAlbumProcess();
    void load(room, album, month);
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-2">
      <h1 className="font-display text-3xl font-bold tracking-tight">Albums</h1>
      <p className="mt-1 text-[var(--ink-dim)]">
        Your photos, sorted by the app itself — solo, together, places, and things.
      </p>

      {room === null ? (
        <section className="panel mt-5 p-5">
          <h2 className="text-lg font-bold">Your albums live in a room</h2>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            Open the room you share with your partner. Anyone with its 4-letter code can see
            and add to these albums — the same rule as rooms.
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
            Room code
            <input
              className="input max-w-32 uppercase"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="CODE"
              maxLength={4}
              aria-label="Room code"
            />
          </label>
          <button type="button" className="btn btn-primary mt-4" onClick={openRoom}>
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
            <span className="chip">Room {room}</span>
            <span className="chip">{name || 'Someone'}</span>
            <button type="button" className="btn !px-3 !py-2 text-sm" onClick={() => void load(room, album, month)}>
              <RefreshCw size={16} aria-hidden /> Refresh
            </button>
            <button type="button" className="btn !px-3 !py-2 text-sm" onClick={changeRoom}>
              Change room
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
                      — {u.state === 'uploading' ? 'Uploading…' : u.state === 'failed' ? 'Failed' : u.detail}
                    </span>
                  </li>
                ))}
              </ul>
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
