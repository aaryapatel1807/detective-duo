'use client';

/* Scoreboard — shared XP, ranks for both detectives.
 * Local XP comes from localStorage; the partner's XP arrives via room
 * shared state (shared.xp) — see syncXpToRoom in lib/xp.ts.
 */

import { useEffect, useState } from 'react';
import { GlassCard } from '../../components/GlassCard';
import { Typewriter } from '../../components/Typewriter';
import { RankBar } from '../../components/RankBar';
import { useRoom } from '../../lib/realtime/useRoom';
import { RANKS, XP_AWARDS, getXP, rankFor } from '../../lib/xp';
import { readStr } from '../../lib/store';
import {
  ACCENT_ME_KEY,
  ACCENT_PARTNER_KEY,
  PARTNER_NAME_KEY,
  PHOTO_ME_KEY,
  PHOTO_PARTNER_KEY,
} from '../../lib/profile';

export default function ScoreboardPage() {
  const room = useRoom();
  const [tick, setTick] = useState(0);

  // Re-read local XP when the page gains focus (games award in other tabs).
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener('focus', bump);
    return () => window.removeEventListener('focus', bump);
  }, []);

  const myXp = getXP();
  const partnerName = room.peer?.name ?? readStr(PARTNER_NAME_KEY, 'Partner');
  const sharedXp = room.shared?.xp as Record<string, { name: string; xp: number }> | undefined;
  const partnerXp =
    (room.peer && sharedXp?.[room.peer.id]?.xp) ?? 0;

  void tick;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <Typewriter text="Scoreboard" as="h1" className="text-2xl" />
        <p className="mt-1 text-sm text-[var(--ink-dim)]">
          Every solved case moves you up the ladder.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <RankBar
          name={room.me.name}
          xp={myXp}
          accent={readStr(ACCENT_ME_KEY, '') || undefined}
          photo={readStr(PHOTO_ME_KEY) || undefined}
        />
        <RankBar
          name={partnerName}
          xp={partnerXp}
          accent={readStr(ACCENT_PARTNER_KEY, '') || undefined}
          photo={readStr(PHOTO_PARTNER_KEY) || undefined}
        />
      </div>

      {!room.roomCode && (
        <p className="font-type text-[0.72rem] tracking-[0.16em] uppercase text-[var(--ink-faint)]">
          Partner XP appears once you share a room — open one from the hub.
        </p>
      )}

      <GlassCard className="p-6">
        <div className="eyebrow mb-4">Rank ladder</div>
        <div className="space-y-2">
          {RANKS.map((r) => {
            const mine = rankFor(myXp).name === r.name;
            return (
              <div
                key={r.name}
                className={`flex items-center justify-between rounded-xl border px-4 py-2.5 ${
                  mine
                    ? 'border-[var(--amber-glow)] bg-[rgba(232,163,61,0.1)]'
                    : 'border-[var(--glass-border)]'
                }`}
              >
                <span className="font-type text-sm tracking-[0.12em] uppercase">
                  {mine ? '▶ ' : ''}{r.name}
                </span>
                <span className="font-type text-xs text-[var(--ink-dim)]">{r.min} XP</span>
              </div>
            );
          })}
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <div className="eyebrow mb-4">Standard awards</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Object.entries(XP_AWARDS).map(([k, v]) => (
            <div
              key={k}
              className="rounded-xl border border-[var(--glass-border)] px-3 py-2 text-center"
            >
              <div className="font-type text-lg text-[var(--amber-glow)]">+{v}</div>
              <div className="font-type text-[0.62rem] uppercase tracking-[0.14em] text-[var(--ink-dim)]">
                {k.replace(/([A-Z])/g, ' $1')}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
