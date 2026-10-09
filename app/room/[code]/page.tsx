'use client';

/* Room lobby: both detectives, big room code, "start case" picker. */

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { GlassCard } from '../../../components/GlassCard';
import { Typewriter } from '../../../components/Typewriter';
import { RankBar } from '../../../components/RankBar';
import { listGames } from '../../../games/all';
import { useRoom } from '../../../lib/realtime/useRoom';
import { getXP } from '../../../lib/xp';
import { sounds } from '../../../lib/sound';

export default function RoomLobbyPage() {
  const params = useParams();
  const code = (params.code as string)?.toUpperCase() ?? '';
  const room = useRoom();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const games = listGames().filter((g) => g.players !== 'solo');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Typewriter text="Stakeout Lobby" as="h1" className="text-2xl" />

      <GlassCard className="p-6 text-center">
        <div className="eyebrow">Room code — share it with your partner</div>
        <div className="type-heading mt-2 text-5xl tracking-[0.35em] text-[var(--amber-glow)]">
          {code}
        </div>
        <div className="mt-3 flex justify-center gap-2">
          <button onClick={copy} className="noir-btn-ghost !py-2">
            {copied ? '✓ Copied' : '⧉ Copy code'}
          </button>
          <button
            onClick={() => {
              room.leaveRoom();
              router.push('/');
            }}
            className="noir-btn-ghost !py-2"
          >
            Leave room
          </button>
        </div>
        {!room.connected && (
          <p className="mt-3 text-sm text-[var(--blood-bright)]">
            Not connected to the uplink. Start <span className="font-type">npm run socket</span>,
            then rejoin from the hub.
          </p>
        )}
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-2">
        <GlassCard className="p-4">
          <div className="eyebrow mb-2">Detective one — you</div>
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-[var(--brass)] to-[var(--brass-deep)] text-2xl">
              🕵️
            </div>
            <div>
              <div className="font-type text-sm tracking-[0.1em]">{room.me.name}</div>
              <div className="font-type text-[0.65rem] text-green-400 tracking-[0.2em]">
                ● IN THE ROOM
              </div>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="eyebrow mb-2">Detective two — partner</div>
          {room.peer ? (
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-[var(--blood-bright)] to-[var(--blood)] text-2xl">
                🕵️‍♀️
              </div>
              <div>
                <div className="font-type text-sm tracking-[0.1em]">{room.peer.name}</div>
                <div className="font-type text-[0.65rem] text-green-400 tracking-[0.2em]">
                  ● IN THE ROOM
                </div>
              </div>
            </div>
          ) : (
            <div className="font-type text-sm text-[var(--ink-dim)]">
              …waiting for your partner to join
              <span className="animate-pulse"> ▌</span>
            </div>
          )}
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <div className="eyebrow mb-1">Start a case</div>
        <h2 className="type-heading mb-4 text-lg">Pick your investigation</h2>
        {games.length === 0 ? (
          <p className="text-sm text-[var(--ink-dim)]">
            No duo games registered yet — the case files are still being typed up.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {games.map((g) => (
              <Link
                key={g.slug}
                href={`/play/${g.slug}?room=${code}`}
                onClick={() => sounds.paperShuffle()}
                className="glass-card !rounded-2xl p-4 transition-transform hover:-translate-y-1"
              >
                <div className="text-3xl">{g.icon}</div>
                <div className="font-type mt-2 text-sm font-bold uppercase tracking-[0.1em]">
                  {g.title}
                </div>
                <div className="mt-1 text-xs text-[var(--ink-dim)]">{g.blurb}</div>
                <span className="mt-2 inline-block rounded-full border border-[var(--amber-glow)] px-2 py-0.5 font-type text-[0.62rem] uppercase tracking-[0.18em]">
                  {g.players}
                </span>
              </Link>
            ))}
          </div>
        )}
        <Link href="/" className="noir-btn-ghost mt-5 inline-block">
          ← Back to corkboard
        </Link>
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-2">
        <RankBar name={room.me.name} xp={typeof window !== 'undefined' ? getXP() : 0} />
      </div>
    </div>
  );
}
