'use client';

/* Room lobby: both detectives, big room code, "start case" picker. */

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { GlassCard } from '../../../components/GlassCard';
import { Typewriter } from '../../../components/Typewriter';
import { RankBar } from '../../../components/RankBar';
import { Pin } from '../../../components/Pin';
import { listGames } from '../../../games/all';
import type { GameMeta } from '../../../games/types';
import { useRoom } from '../../../lib/realtime/useRoom';
import { getXP } from '../../../lib/xp';
import { sounds } from '../../../lib/sound';
import '../../../components/hub-noir.css';

function DetectiveCard({
  eyebrow,
  name,
  online,
  waiting,
}: {
  eyebrow: string;
  name: string;
  online: boolean;
  waiting?: boolean;
}) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '·';
  return (
    <GlassCard className="p-4">
      <div className="hub-eyebrow mb-3">{eyebrow}</div>
      {waiting ? (
        <div className="hub-mono text-sm text-[var(--hub-ink-dim)]">
          …waiting for your partner to join
          <span className="animate-pulse"> ▌</span>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="hub-avatar" aria-hidden>
            <span className="hub-avatar-initials hub-display">{initials}</span>
          </div>
          <div className="min-w-0">
            <div className="hub-display truncate text-sm">{name}</div>
            <div
              className="hub-mono mt-1 text-[0.65rem] tracking-[0.2em]"
              style={{ color: 'var(--hub-green)' }}
            >
              <span className="hub-dot" aria-hidden />
              IN THE ROOM
            </div>
          </div>
        </div>
      )}
      {!online && (
        <div className="hub-mono mt-2 text-[0.65rem] tracking-[0.18em] text-[var(--hub-ink-dim)]">
          UPLINK LOST
        </div>
      )}
    </GlassCard>
  );
}

const DIFFICULTY_CLASS: Record<string, string> = {
  easy: 'hub-pill-easy',
  medium: 'hub-pill-medium',
  hard: 'hub-pill-hard',
};

function GameCaseCard({ g, code }: { g: GameMeta; code: string }) {
  return (
    <Link
      href={`/play/${g.slug}?room=${code}`}
      onClick={() => sounds.paperShuffle()}
      className="hub-game-card"
    >
      <div className="hub-cover">
        <div className="hub-cover-icon" aria-hidden>
          {g.icon}
        </div>
        <div className="hub-display hub-cover-title">{g.title}</div>
        <div className="hub-cover-cat">{g.category}</div>
      </div>
      <div className="hub-card-body">
        <div className="hub-card-blurb">{g.blurb}</div>
        <div className="hub-card-meta">
          <span className="hub-badge">{g.players}</span>
          {g.difficulty && (
            <span className={`hub-badge ${DIFFICULTY_CLASS[g.difficulty]}`}>
              {g.difficulty}
            </span>
          )}
        </div>
        <span className="hub-open-file">Open file →</span>
      </div>
    </Link>
  );
}

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
    <div className="hub-page">
      <div className="mx-auto max-w-3xl space-y-5">
        <div>
          <Typewriter text="Stakeout Lobby" as="h1" className="hub-page-title" />
          <p className="hub-sub">Assemble the duo, then pick tonight's investigation.</p>
        </div>

        <GlassCard className="relative p-6 text-center">
          <Pin className="absolute -top-2 left-8" />
          <div className="hub-eyebrow hub-eyebrow-gold">
            Case file № — share it with your partner
          </div>
          <div className="hub-room-code mt-3">{code}</div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button onClick={copy} className="hub-btn-ghost">
              {copied ? '✓ Copied' : '⧉ Copy code'}
            </button>
            <button
              onClick={() => {
                room.leaveRoom();
                router.push('/');
              }}
              className="hub-btn-ghost"
            >
              Leave room
            </button>
          </div>
          {!room.connected && (
            <p className="mt-4 text-sm text-[var(--hub-ink-dim)]">
              <span className="hub-danger">Not connected to the uplink.</span>{' '}
              Start <span className="hub-mono">npm run socket</span>, then rejoin
              from the hub.
            </p>
          )}
        </GlassCard>

        <div className="grid gap-4 md:grid-cols-2">
          <DetectiveCard
            eyebrow="Detective one — you"
            name={room.me.name}
            online={room.connected}
          />
          {room.peer ? (
            <DetectiveCard
              eyebrow="Detective two — partner"
              name={room.peer.name}
              online={room.connected}
            />
          ) : (
            <DetectiveCard
              eyebrow="Detective two — partner"
              name=""
              online={room.connected}
              waiting
            />
          )}
        </div>

        <GlassCard className="p-6">
          <div className="hub-eyebrow mb-1">Start a case</div>
          <h2 className="hub-display mb-4 text-lg">Pick your investigation</h2>
          {games.length === 0 ? (
            <p className="text-sm text-[var(--hub-ink-dim)]">
              No duo games registered yet — the case files are still being typed up.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {games.map((g) => (
                <GameCaseCard key={g.slug} g={g} code={code} />
              ))}
            </div>
          )}
          <Link href="/" className="hub-btn-ghost mt-5">
            ← Back to the agency
          </Link>
        </GlassCard>

        <RankBar name={room.me.name} xp={typeof window !== 'undefined' ? getXP() : 0} />
      </div>
    </div>
  );
}
