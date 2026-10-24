'use client';

/**
 * Room lobby: who is here, pick a co-op or versus game + level, start.
 * Starting writes game/mode/seed/level/status into the session row and
 * moves both players to the play screen (via the shared session state).
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MailOpen, Play, Users } from 'lucide-react';
import { useMe } from '@/components/together/useMe';
import { useRoom } from '@/components/together/useRoom';
import { createSession, saveSession } from '@/lib/together/session';
import { coopSeed, versusSeed, type TogetherMode } from '@/lib/together/types';
import { getGameProgress, loadLocalProgress } from '@/lib/progress';
import EmptyState from '@/components/EmptyState';
import { roomNotFound } from '@/lib/emptyStates';

const COOP_GAMES = [
  { id: 'case-files', name: 'Case Files', note: 'Split clues — talk to solve.' },
  { id: 'escape-rooms', name: 'Escape Rooms', note: 'Room vs notebook — talk to escape.' },
  { id: 'logic-grids', name: 'Logic Grids', note: 'One shared grid, both marking.' },
  { id: 'lantern-map', name: 'Lantern and Map', note: 'Walker in the dark, partner holds the map.' },
  { id: 'sketch-clue', name: 'Sketch the Clue', note: 'One draws, the other guesses.' },
  { id: 'spot-liar', name: 'Spot the Liar', note: 'Three statements, three questions, one lie.' },
  { id: 'know-me', name: 'How Well Do You Know Me', note: 'Answer, guess, reveal together.' },
];

const VERSUS_GAMES = [
  { id: 'logic-grids', name: 'Logic Grids', note: 'Same puzzle, friendly race.' },
  { id: 'cipher-desk', name: 'Cipher Desk', note: 'Same note, friendly race.' },
  { id: 'nonograms', name: 'Nonograms', note: 'Same picture, friendly race.' },
  { id: 'dots-boxes', name: 'Dots and Boxes', note: 'One board, turns, most boxes wins.' },
  { id: 'safe-cracker', name: 'Safe Cracker', note: 'Same code, fewest guesses wins.' },
];

export default function LobbyPage({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  const router = useRouter();
  const me = useMe();
  const { session, loaded, members, updateSession } = useRoom(code, me);
  const [picked, setPicked] = useState<{ game: string; mode: TogetherMode } | null>(null);
  const [level, setLevel] = useState(1);

  useEffect(() => {
    if (!picked) return;
    setLevel(Math.max(1, getGameProgress(loadLocalProgress(), picked.game).currentLevel));
  }, [picked]);

  const others = useMemo(
    () => members.filter((m) => m.uid !== me?.uid),
    [members, me?.uid],
  );

  const start = () => {
    if (!picked || !session) return;
    const seed =
      picked.mode === 'versus'
        ? versusSeed(code, picked.game, level)
        : coopSeed(code, picked.game, level);
    updateSession({
      game: picked.game,
      mode: picked.mode,
      seed,
      level,
      status: 'playing',
      state: { notes: '', chat: [] },
      winnerUid: null,
    });
    router.push(`/together/${code}/play`);
  };

  const leave = async () => {
    if (!session || !me) return;
    const next = { ...session, players: session.players.filter((p) => p.uid !== me.uid) };
    await saveSession(next);
    router.push('/together');
  };

  if (!loaded || !me) {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-md items-center justify-center px-4">
        <p className="text-[var(--ink-dim)]">Opening the room…</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 pb-16">
        <h1 className="mt-6 text-3xl font-bold">No room {code} yet</h1>
        <div className="mt-4">
          <EmptyState
            state={roomNotFound(code)}
            action={
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={async () => {
                    await createSession(code, { uid: me.uid, name: me.name, role: 'host' });
                    window.location.assign(`/together/${code}`);
                  }}
                >
                  Create room {code}
                </button>
                <Link href="/together" className="btn">Back to together</Link>
              </div>
            }
          />
        </div>
      </main>
    );
  }

  const inProgress = session.status === 'playing' || session.status === 'paused' || session.status === 'finished';

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16">
      <div className="mt-2 flex items-center justify-between gap-2">
        <Link href="/together" className="btn !px-3 !py-2 text-sm">
          <ArrowLeft size={16} aria-hidden /> Together
        </Link>
        <button type="button" className="btn !px-3 !py-2 text-sm" onClick={leave}>
          Leave room
        </button>
      </div>

      <h1 className="mt-4 text-3xl font-bold">Room {code}</h1>
      <p className="mt-1 flex items-center gap-2 text-[var(--ink-dim)]">
        <Users size={18} aria-hidden />
        {members.length === 0
          ? 'Connecting…'
          : members.map((m) => m.name).join(' · ')}
        {others.length === 0 && ' — waiting for your partner to join.'}
      </p>

      {inProgress && session.game ? (
        <section className="card mt-4 p-5">
          <p className="font-display text-lg font-bold">A game is already going</p>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            {session.game} ({session.mode}) · level {session.level} ·{' '}
            {session.status === 'finished' ? 'finished' : session.status === 'paused' ? 'paused, waiting for a player' : 'in progress'}
          </p>
          <Link href={`/together/${code}/play`} className="btn btn-primary mt-3">
            <Play size={18} aria-hidden /> Re-enter the game
          </Link>
        </section>
      ) : (
        <>
          <section className="mt-6">
            <h2 className="text-lg font-bold">Play together (co-op)</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {COOP_GAMES.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className="card p-4 text-left"
                  style={
                    picked?.game === g.id && picked?.mode === 'coop'
                      ? { outline: '2px solid var(--accent)' }
                      : undefined
                  }
                  onClick={() => setPicked({ game: g.id, mode: 'coop' })}
                  aria-pressed={picked?.game === g.id && picked?.mode === 'coop'}
                >
                  <span className="font-display text-lg font-bold">{g.name}</span>
                  <span className="mt-1 block text-sm text-[var(--ink-dim)]">{g.note}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-bold">Race, gently (versus)</h2>
            <p className="mt-1 text-sm text-[var(--ink-dim)]">
              Identical puzzles, first to finish wins the round. No public scores, no
              timers — just a small progress bar each, and a private tally in the room.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {VERSUS_GAMES.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className="card p-4 text-left"
                  style={
                    picked?.game === g.id && picked?.mode === 'versus'
                      ? { outline: '2px solid var(--accent)' }
                      : undefined
                  }
                  onClick={() => setPicked({ game: g.id, mode: 'versus' })}
                  aria-pressed={picked?.game === g.id && picked?.mode === 'versus'}
                >
                  <span className="font-display text-lg font-bold">{g.name}</span>
                  <span className="mt-1 block text-sm text-[var(--ink-dim)]">{g.note}</span>
                </button>
              ))}
            </div>
          </section>

          {picked && (
            <section className="card mt-4 p-5">
              <label className="flex flex-col gap-1 text-sm font-semibold">
                Level
                <input
                  className="input w-32"
                  type="number"
                  min={1}
                  value={level}
                  onChange={(e) => setLevel(Math.max(1, Number(e.target.value) || 1))}
                  aria-label="Level"
                />
              </label>
              <button type="button" className="btn btn-primary mt-3" onClick={start}>
                <Play size={18} aria-hidden /> Start{' '}
                {picked.mode === 'coop' ? 'co-op' : 'versus'} · level {level}
              </button>
              {others.length === 0 && (
                <p className="mt-2 text-sm text-[var(--ink-dim)]">
                  You can start now; your partner joins with code {code} and lands in
                  the same game.
                </p>
              )}
            </section>
          )}
        </>
      )}

      <section className="panel mt-6 flex items-center gap-3 p-4">
        <MailOpen size={22} aria-hidden className="shrink-0" />
        <div>
          <p className="font-semibold">Or leave a case for later</p>
          <p className="text-sm text-[var(--ink-dim)]">
            Not playing right now? Send a case to find on the home screen.
          </p>
          <Link href="/together/leave" className="btn mt-2">
            Leave a case
          </Link>
        </div>
      </section>
    </main>
  );
}
