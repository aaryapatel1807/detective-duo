'use client';

/* Scoreboard — shared XP, ranks for both detectives.
 * Local XP comes from localStorage; the partner's XP arrives via room
 * shared state (shared.xp) — see syncXpToRoom in lib/xp.ts.
 * Only real data is shown: no weekly tab (no timestamps exist), no
 * invented detectives (vacant podium slots stay empty).
 */

import { useEffect, useState } from 'react';
import { GlassCard } from '../../components/GlassCard';
import { Typewriter } from '../../components/Typewriter';
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
import '../../components/hub-noir.css';

interface Contender {
  key: 'me' | 'partner';
  name: string;
  xp: number;
  accent?: string;
  photo?: string;
}

function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '·'
  );
}

function PodiumSlot({
  c,
  place,
  vacant,
}: {
  c?: Contender;
  place: 1 | 2 | 3;
  vacant?: boolean;
}) {
  const placeWord = place === 1 ? '1st' : place === 2 ? '2nd' : '3rd';
  return (
    <div className={`hub-plinth hub-plinth-${place}${vacant ? ' hub-plinth-vacant' : ''}`}>
      <div className="hub-plinth-avatar" aria-hidden>
        {vacant ? (
          '?'
        ) : c?.photo ? (
          <img src={c.photo} alt="" />
        ) : (
          initialsOf(c?.name ?? '')
        )}
      </div>
      <div className="hub-plinth-place">{placeWord}</div>
      <div className="hub-plinth-name">
        {vacant ? 'Open slot' : c?.name}
      </div>
      <div className="hub-plinth-xp">
        {vacant ? '—' : `${c?.xp ?? 0} XP`}
      </div>
    </div>
  );
}

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
  const partnerXp = (room.peer && sharedXp?.[room.peer.id]?.xp) ?? 0;

  void tick;

  const me: Contender = {
    key: 'me',
    name: room.me.name,
    xp: myXp,
    accent: readStr(ACCENT_ME_KEY, '') || undefined,
    photo: readStr(PHOTO_ME_KEY) || undefined,
  };
  const partner: Contender = {
    key: 'partner',
    name: partnerName,
    xp: partnerXp,
    accent: readStr(ACCENT_PARTNER_KEY, '') || undefined,
    photo: readStr(PHOTO_PARTNER_KEY) || undefined,
  };
  const ranked = [me, partner].sort((a, b) => b.xp - a.xp);
  const myRank = ranked.findIndex((c) => c.key === 'me') + 1;
  // Podium holds at most 3; third slot stays vacant (no fake detectives).
  const podium: (Contender | undefined)[] = [ranked[1], ranked[0], undefined];

  return (
    <div className="hub-page">
      <div className="mx-auto max-w-4xl space-y-5">
        <div>
          <Typewriter text="Scoreboard" as="h1" className="hub-page-title" />
          <p className="hub-sub">Every solved case moves you up the ladder.</p>
        </div>

        {/* Podium — all-time standings from real XP only */}
        <GlassCard className="p-6">
          <div className="hub-eyebrow hub-eyebrow-gold mb-4 text-center">
            All-time standings
          </div>
          <div className="hub-podium">
            <PodiumSlot c={podium[0]} place={2} />
            <PodiumSlot c={podium[1]} place={1} />
            <PodiumSlot place={3} vacant />
          </div>
        </GlassCard>

        {/* Ranked rows */}
        <div className="space-y-2">
          {ranked.map((c, i) => (
            <div
              key={c.key}
              className={`hub-rank-row${c.key === 'me' ? ' hub-rank-row-you' : ''}`}
            >
              <div className={`hub-rank-num hub-rank-num-${i + 1}`}>{i + 1}</div>
              <div className="hub-avatar" aria-hidden>
                {c.photo ? (
                  <img src={c.photo} alt="" />
                ) : (
                  <span className="hub-avatar-initials hub-display">
                    {initialsOf(c.name)}
                  </span>
                )}
              </div>
              <div className="hub-rank-meta">
                <div className="hub-display text-sm">
                  {c.name}
                  {c.key === 'me' && (
                    <span className="hub-mono ml-2 text-[0.62rem] tracking-[0.2em] text-[var(--hub-gold)]">
                      YOU
                    </span>
                  )}
                </div>
                <div className="hub-mono mt-0.5 text-[0.65rem] tracking-[0.18em] text-[var(--hub-ink-dim)]">
                  {rankFor(c.xp).name}
                </div>
              </div>
              <div className="hub-rank-xp">{c.xp} XP</div>
            </div>
          ))}
        </div>

        {!room.roomCode && (
          <p className="hub-mono text-[0.72rem] tracking-[0.16em] uppercase text-[var(--hub-ink-dim)]">
            Partner XP appears once you share a room — open one from the hub.
          </p>
        )}

        {/* Sticky "You" row */}
        <div className="hub-you-sticky">
          <div className="hub-glass hub-rank-row hub-rank-row-you">
            <div className={`hub-rank-num hub-rank-num-${myRank}`}>#{myRank}</div>
            <div className="hub-avatar" aria-hidden>
              {me.photo ? (
                <img src={me.photo} alt="" />
              ) : (
                <span className="hub-avatar-initials hub-display">
                  {initialsOf(me.name)}
                </span>
              )}
            </div>
            <div className="hub-rank-meta">
              <div className="hub-display text-sm">{me.name}</div>
              <div className="hub-mono mt-0.5 text-[0.65rem] tracking-[0.18em] text-[var(--hub-ink-dim)]">
                {rankFor(me.xp).name}
              </div>
            </div>
            <div className="hub-rank-xp">{me.xp} XP</div>
          </div>
        </div>

        <GlassCard className="p-6">
          <div className="hub-eyebrow mb-4">Rank ladder</div>
          <div className="space-y-2">
            {RANKS.map((r) => {
              const mine = rankFor(myXp).name === r.name;
              return (
                <div
                  key={r.name}
                  className={`hub-row${mine ? ' hub-rank-row-you' : ''}`}
                >
                  <span className="hub-rank-label hub-display text-sm">
                    {mine ? '▶ ' : ''}
                    {r.name}
                  </span>
                  <span className="hub-row-value">{r.min} XP</span>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="hub-eyebrow mb-4">Standard awards</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(XP_AWARDS).map(([k, v]) => (
              <div key={k} className="hub-row !min-h-0 flex-col !items-stretch gap-1 p-3 text-center">
                <div className="hub-display text-lg text-[var(--hub-gold)]">+{v}</div>
                <div className="hub-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--hub-ink-dim)]">
                  {k.replace(/([A-Z])/g, ' $1')}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
