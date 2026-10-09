'use client';

/* Game shell: loads a game from the registry and renders its Game.tsx
 * inside a case-folder frame. Unknown slug -> "file not found".
 */

import { useEffect, useState, ComponentType } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getGame, type GameProps } from '../../../games/registry';
import { useRoom } from '../../../lib/realtime/useRoom';
import { Typewriter } from '../../../components/Typewriter';
import { GlassCard } from '../../../components/GlassCard';
import { Pin } from '../../../components/Pin';

export default function PlayPage() {
  const params = useParams();
  const slug = params.game as string;
  const room = useRoom();
  const [Comp, setComp] = useState<ComponentType<GameProps> | null>(null);
  const [failed, setFailed] = useState(false);
  const entry = getGame(slug);

  useEffect(() => {
    if (!entry) {
      setFailed(true);
      return;
    }
    let alive = true;
    entry
      .loader()
      .then((m) => {
        if (alive) setComp(() => m.default);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [slug]);

  if (!entry || failed) {
    return (
      <div className="mx-auto max-w-xl pt-10">
        <GlassCard className="p-8 text-center">
          <div className="text-5xl">🗃️</div>
          <Typewriter text="File not found" as="h1" className="mt-4 text-xl" />
          <p className="mt-2 text-sm text-[var(--ink-dim)]">
            No case file named “{slug}” in the registry. The game agents haven&apos;t
            typed it up yet.
          </p>
          <Link href="/" className="noir-btn mt-5 inline-block">
            Back to corkboard
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* case-folder frame */}
      <div className="relative">
        <Pin className="absolute -top-2 left-10 z-10" />
        <div className="manila-folder p-6 pt-8 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#3a2c17]/25 pb-4">
            <div>
              <div className="font-type text-[0.65rem] tracking-[0.25em] opacity-60">
                CASE FILE · {entry.meta.category.toUpperCase()} · {entry.meta.players.toUpperCase()}
              </div>
              <h1 className="font-type mt-1 text-2xl font-bold uppercase tracking-[0.08em]">
                {entry.meta.icon} {entry.meta.title}
              </h1>
              <p className="mt-1 max-w-xl text-sm opacity-75">{entry.meta.blurb}</p>
            </div>
            <Link
              href={room.roomCode ? `/room/${room.roomCode}` : '/'}
              className="rounded-xl border border-[#3a2c17]/40 px-4 py-2 font-type text-[0.72rem] tracking-[0.16em] uppercase hover:bg-[#3a2c17]/10"
            >
              ← Lobby
            </Link>
          </div>
          {/* evidence-board panel: games always render on dark for contrast */}
          <div className="mt-6 rounded-2xl bg-[#161316]/95 p-4 text-[var(--ink)] shadow-[inset_0_2px_18px_rgba(0,0,0,0.6)] md:p-6">
            {Comp ? (
              <Comp room={room} />
            ) : (
              <div className="py-16 text-center font-type text-sm tracking-[0.2em] opacity-60">
                OPENING FILE<span className="animate-pulse">…</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
