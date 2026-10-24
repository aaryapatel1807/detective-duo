'use client';

/**
 * Together landing: create a room (4-letter code), join by code, or
 * reopen the last room with one tap. Signed-in players use their
 * account; local-only mode uses a per-tab identity.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MailOpen, Plus, Users } from 'lucide-react';
import { useMe } from '@/components/together/useMe';
import { generateRoomCode, isValidRoomCode, normalizeRoomCode } from '@/lib/together/roomCode';
import {
  createSession,
  getDisplayName,
  joinSession,
  loadSession,
  myLastSession,
  setDisplayName,
  type RoomSession,
} from '@/lib/together/session';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export default function TogetherPage() {
  const router = useRouter();
  const me = useMe();
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<RoomSession | null>(null);

  useEffect(() => {
    setName(getDisplayName());
  }, []);

  useEffect(() => {
    if (!me) return;
    void myLastSession(me.uid).then(setLast);
  }, [me]);

  const withName = () => {
    const n = name.trim() || 'Detective';
    setDisplayName(n);
    return n;
  };

  const create = async () => {
    if (!me) return;
    setBusy(true);
    setError(null);
    const code = generateRoomCode();
    await createSession(code, { uid: me.uid, name: withName(), role: 'host' });
    router.push(`/together/${code}`);
  };

  const join = async () => {
    if (!me) return;
    const code = normalizeRoomCode(joinCode);
    if (!isValidRoomCode(code)) {
      setError('Room codes are 4 letters — check the code and try again.');
      return;
    }
    setBusy(true);
    setError(null);
    const existing = await loadSession(code);
    if (!existing) {
      setError(`No room with code ${code} yet. Create it, or check the letters.`);
      setBusy(false);
      return;
    }
    await joinSession(code, { uid: me.uid, name: withName(), role: 'guest' });
    router.push(`/together/${code}`);
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16">
      <div className="mt-2">
        <Link href="/" className="btn !px-3 !py-2 text-sm">
          <ArrowLeft size={16} aria-hidden /> Home
        </Link>
      </div>
      <h1 className="mt-4 text-3xl font-bold">Play together</h1>
      <p className="mt-1 text-[var(--ink-dim)]">
        One room, two detectives. Create a room and share its 4-letter code, or join
        with a code your partner shared.
      </p>

      {!isSupabaseConfigured && (
        <p className="panel mt-4 p-4 text-sm">
          Local mode: rooms live in this browser until Supabase is wired up. Two
          devices cannot sync yet — sign-in arrives with the project connection.
        </p>
      )}

      <section className="card mt-4 p-5">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Your name in the room
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Detective"
            maxLength={40}
            aria-label="Your name in the room"
          />
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={create} disabled={busy || !me}>
            <Plus size={18} aria-hidden /> Create a room
          </button>
        </div>
        <div className="mt-4 flex gap-2">
          <input
            className="input flex-1 uppercase"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ABCD"
            maxLength={4}
            aria-label="Room code to join"
          />
          <button type="button" className="btn" onClick={join} disabled={busy || !me}>
            <Users size={18} aria-hidden /> Join
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-sm font-semibold text-[var(--bad)]">
            {error}
          </p>
        )}
      </section>

      {last && (
        <section className="panel mt-4 p-4">
          <p className="font-semibold">Your last room</p>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            Room {last.code}
            {last.game ? ` · ${last.game} ${last.mode ? `(${last.mode})` : ''}` : ' · waiting in the lobby'}
          </p>
          <Link href={`/together/${last.code}`} className="btn btn-primary mt-3">
            Reopen room {last.code}
          </Link>
        </section>
      )}

      <section className="panel mt-4 flex items-center gap-3 p-4">
        <MailOpen size={22} aria-hidden className="shrink-0" />
        <div>
          <p className="font-semibold">Leave a case for later</p>
          <p className="text-sm text-[var(--ink-dim)]">
            Pick a case from the bank, add a short note, and it waits on your partner's
            home screen.
          </p>
          <Link href="/together/leave" className="btn mt-2">
            Leave a case
          </Link>
        </div>
      </section>
    </main>
  );
}
