'use client';

/**
 * RoomShell: the shared frame for every together game — room header,
 * member list, pause banner, live cursors over the game area, and the
 * shared chat + notes panels underneath.
 *
 * Phase 6 additions: an optional call panel slot (opt-in WebRTC call),
 * an optional photo booth panel (with an auto-snap-on-win toggle), and
 * a win-snap banner when a round is won with auto-snap on.
 */
import { useEffect, useRef, useState, type ReactNode, type MouseEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, Camera, LogOut, MessageCircle, NotebookPen, Pause } from 'lucide-react';
import type { ChatMsg } from '@/lib/together/types';
import type { CursorPos } from './useRoom';
import PhotoBooth from '@/components/booth/PhotoBooth';

interface Props {
  code: string;
  title: string;
  members: { uid: string; name: string }[];
  meUid: string;
  paused: boolean;
  connected: boolean;
  chat: ChatMsg[];
  notes: string;
  cursors: Record<string, CursorPos>;
  onChat: (text: string) => void;
  onNote: (text: string) => void;
  onCursor: (x: number, y: number) => void;
  onLeave: () => void;
  backHref: string;
  children: ReactNode;
  call?: ReactNode;
  boothAutoSnap?: boolean;
  onBoothAutoSnap?: (v: boolean) => void;
  showWinSnap?: boolean;
}

export default function RoomShell(props: Props) {
  const [draft, setDraft] = useState('');
  const [noteDraft, setNoteDraft] = useState(props.notes);
  const [extrasOpen, setExtrasOpen] = useState(true);
  const [boothOpen, setBoothOpen] = useState(false);

  // Camera handover with the call panel (CallPanel itself is untouched
  // here): on one phone the call and the booth cannot hold the camera
  // at once, so opening the booth tells the call side to pause its
  // video track, and closing tells it to resume. Fired from this
  // effect so both open paths — the win-snap banner and the toggle
  // button — are covered, and so closing (not just toggling) emits
  // the close event. The first render dispatches nothing: no booth
  // was open, so there is nothing to resume.
  const boothWasOpenRef = useRef(false);
  useEffect(() => {
    if (boothWasOpenRef.current === boothOpen) return;
    boothWasOpenRef.current = boothOpen;
    window.dispatchEvent(new Event(boothOpen ? 'sachi:booth-open' : 'sachi:booth-close'));
  }, [boothOpen]);

  const trackCursor = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    props.onCursor(
      Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10,
      Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10,
    );
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16">
      <div className="mt-2 flex items-center justify-between gap-2">
        <Link href={props.backHref} className="btn !px-3 !py-2 text-sm">
          <ArrowLeft size={16} aria-hidden /> Room
        </Link>
        <span className="chip">
          Room {props.code} · {props.members.length} in the room
          {props.connected ? '' : ' · connecting…'}
        </span>
        <button type="button" className="btn !px-3 !py-2 text-sm" onClick={props.onLeave}>
          <LogOut size={16} aria-hidden /> Leave
        </button>
      </div>

      <h1 className="mt-4 text-3xl font-bold">{props.title}</h1>
      <p className="mt-1 text-sm text-[var(--ink-dim)]">
        Playing with{' '}
        {props.members
          .filter((m) => m.uid !== props.meUid)
          .map((m) => m.name)
          .join(', ') || 'your partner'}
        . Moves sync live; a refresh restores everything.
      </p>

      {props.showWinSnap && (
        <div className="panel mt-3 flex flex-wrap items-center justify-between gap-2 p-4">
          <p className="font-semibold">Lovely round — snap a win strip?</p>
          <button type="button" className="btn btn-primary" onClick={() => setBoothOpen(true)}>
            <Camera size={18} aria-hidden /> Open the booth
          </button>
        </div>
      )}

      {props.call && <div className="mt-4">{props.call}</div>}

      {props.paused && (
        <p className="panel mt-3 flex items-center gap-2 p-4 font-semibold" role="status">
          <Pause size={18} aria-hidden />
          Waiting for your partner — the game is paused here, and nothing is lost.
          It resumes on its own when they return.
        </p>
      )}

      <div className="relative mt-4" onMouseMove={trackCursor}>
        {props.children}
        {Object.entries(props.cursors).map(([uid, c]) => (
          <span
            key={uid}
            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${c.x}%`, top: `${c.y}%` }}
            aria-hidden
          >
            <span className="block h-3 w-3 rounded-full border-2 border-white bg-[var(--accent)] shadow" />
            <span className="mt-0.5 block whitespace-nowrap rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-white">
              {c.name}
            </span>
          </span>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn"
          onClick={() => setExtrasOpen((v) => !v)}
          aria-expanded={extrasOpen}
        >
          <MessageCircle size={18} aria-hidden /> Chat &amp; shared notes
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setBoothOpen((v) => !v)}
          aria-expanded={boothOpen}
        >
          <Camera size={18} aria-hidden /> Photo booth
        </button>
      </div>
      {boothOpen && (
        <div className="mt-3">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={props.boothAutoSnap ?? false}
              onChange={(e) => props.onBoothAutoSnap?.(e.target.checked)}
            />
            Offer a win strip when someone wins a round
          </label>
          <div className="mt-3">
            <PhotoBooth roomCode={props.code} />
          </div>
        </div>
      )}
      {extrasOpen && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <section className="panel p-4">
            <h2 className="font-display text-lg font-bold">Chat</h2>
            <div className="mt-2 max-h-48 space-y-2 overflow-y-auto" aria-live="polite">
              {props.chat.length === 0 && (
                <p className="text-sm text-[var(--ink-dim)]">
                  Say hello — messages stay here even after a refresh.
                </p>
              )}
              {props.chat.map((m, i) => (
                <p key={`${m.at}-${i}`} className="text-sm">
                  <span className="font-semibold">{m.name}: </span>
                  {m.text}
                </p>
              ))}
            </div>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!draft.trim()) return;
                props.onChat(draft.trim());
                setDraft('');
              }}
            >
              <input
                className="input flex-1"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="A short note to your partner…"
                maxLength={280}
                aria-label="Chat message"
              />
              <button type="submit" className="btn btn-primary" disabled={!draft.trim()}>
                Send
              </button>
            </form>
          </section>
          <section className="panel p-4">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold">
              <NotebookPen size={18} aria-hidden /> Shared notes
            </h2>
            <p className="mt-1 text-sm text-[var(--ink-dim)]">
              One notepad, both of you. Saves as you type.
            </p>
            <textarea
              className="input mt-2 min-h-32 w-full"
              value={noteDraft}
              onChange={(e) => {
                setNoteDraft(e.target.value);
                props.onNote(e.target.value);
              }}
              placeholder="Clues worth remembering…"
              maxLength={2000}
              aria-label="Shared notes"
            />
          </section>
        </div>
      )}
    </main>
  );
}
