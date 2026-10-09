'use client';

/* Detective Duo hub lobby — the corkboard.
 * Game categories are pinned as manila case folders; clicking a folder
 * opens it to reveal its games. Sealed teaser folders mark what's coming.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Corkboard } from '../components/Corkboard';
import { Pin } from '../components/Pin';
import { RedStringLayer } from '../components/RedString';
import { WaxSeal } from '../components/WaxSeal';
import { Typewriter } from '../components/Typewriter';
import { GlassCard } from '../components/GlassCard';
import { RankBar } from '../components/RankBar';
import { ManilaFolder, Polaroid } from '../components/props';
import { listGames, categories } from '../games/registry';
import { useRoom } from '../lib/realtime/useRoom';
import { getXP } from '../lib/xp';
import { CASES } from '../lib/content/cases';
import { CIPHERS } from '../lib/content/ciphers';
import { BLACK_STORIES } from '../lib/content/blackStories';
import { readStr } from '../lib/store';
import { sounds } from '../lib/sound';

/** Teaser folders for games not yet registered — agents remove entries as they ship. */
const SEALED_CASES = [
  { title: 'The Crime Mystery', note: 'Co-op flagship · asymmetric clues', icon: '🔍' },
  { title: 'Black Stories', note: 'Yes/no lateral puzzles', icon: '🕯️' },
  { title: 'Cipher Breaker', note: 'Decode for hint tokens', icon: '🔐' },
];

function RoomPanel() {
  const room = useRoom();
  const router = useRouter();
  const [name, setName] = useState(() => readStr('dd-name', ''));
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');

  const go = async (fn: () => Promise<string | void>, after: (r: any) => void) => {
    setErr('');
    try {
      sounds.paperShuffle();
      const r = await fn();
      after(r);
    } catch (e: any) {
      setErr(e?.message || 'connection failed — is the socket server running?');
    }
  };

  if (room.roomCode) {
    return (
      <GlassCard className="flex flex-wrap items-center gap-4 p-4">
        <div>
          <div className="eyebrow">Active Room</div>
          <div className="type-heading mt-1 text-3xl tracking-[0.3em] text-[var(--amber-glow)]">
            {room.roomCode}
          </div>
        </div>
        <div className="text-sm text-[var(--ink-dim)]">
          {room.peer ? (
            <>Partner in the room: <b className="text-[var(--ink)]">{room.peer.name}</b></>
          ) : (
            'Share the code — waiting for your partner…'
          )}
        </div>
        <div className="ml-auto flex gap-2">
          <Link href={`/room/${room.roomCode}`} className="noir-btn">
            Enter lobby
          </Link>
          <button onClick={() => room.leaveRoom()} className="noir-btn-ghost">
            Leave
          </button>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-4">
      <div className="eyebrow mb-3">Open a private channel</div>
      <div className="flex flex-col gap-3 md:flex-row">
        <input
          className="noir-input md:max-w-[220px]"
          placeholder="Your detective name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <button
            className="noir-btn flex-1"
            disabled={room.busy}
            onClick={() =>
              go(() => room.createRoom(name || undefined), (c: string) =>
                router.push(`/room/${c}`),
              )
            }
          >
            {room.busy ? 'Dialing…' : 'Create room'}
          </button>
          <div className="flex flex-1 gap-2">
            <input
              className="noir-input uppercase"
              placeholder="Code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
            <button
              className="noir-btn-ghost"
              disabled={room.busy || code.length !== 6}
              onClick={() =>
                go(() => room.joinRoom(code, name || undefined), () =>
                  router.push(`/room/${code.toUpperCase()}`),
                )
              }
            >
              Join
            </button>
          </div>
        </div>
      </div>
      {err && <p className="mt-2 text-sm text-[var(--blood-bright)]">{err}</p>}
      {!room.connected && (
        <p className="mt-2 text-xs text-[var(--ink-faint)]">
          Tip: start the uplink first — <span className="font-type">npm run socket</span>
        </p>
      )}
    </GlassCard>
  );
}

export default function HubPage() {
  const room = useRoom();
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const games = useMemo(() => listGames(), []);
  const cats = useMemo(() => categories(), []);
  const xp = typeof window !== 'undefined' ? getXP() : 0;
  const partnerName = readStr('dd-partner-name', 'Partner');

  const evidenceCount = CASES.length + CIPHERS.length + BLACK_STORIES.length;

  const toggleFolder = (cat: string) => {
    sounds.pinTap();
    setOpenFolder((o) => (o === cat ? null : cat));
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* dual detective-rank bars */}
      <div className="grid gap-4 md:grid-cols-2">
        <RankBar name={room.me.name} xp={xp} />
        <RankBar name={room.peer?.name ?? partnerName} xp={0} />
      </div>

      <RoomPanel />

      {/* corkboard lobby */}
      <div className="overflow-x-auto">
        <Corkboard className="relative min-h-[720px] min-w-[860px] p-6">
          {/* banner */}
          <div className="paper-strip absolute left-1/2 top-5 w-[70%] -translate-x-1/2 rounded-sm px-6 py-3 text-center">
            <Typewriter
              text="Game Lobby — Corkboard"
              as="h1"
              animate
              className="text-xl md:text-2xl"
            />
            <Pin className="absolute -top-2.5 left-8" />
            <Pin className="absolute -top-2.5 right-8" />
          </div>

          <RedStringLayer
            connections={[
              { from: { x: 20, y: 48 }, to: { x: 48, y: 42 } },
              { from: { x: 48, y: 42 }, to: { x: 70, y: 62 } },
              { from: { x: 20, y: 48 }, to: { x: 42, y: 74 } },
              { from: { x: 82, y: 32 }, to: { x: 70, y: 62 } },
              { from: { x: 42, y: 74 }, to: { x: 84, y: 84 } },
            ]}
          />

          {/* playable category folders */}
          {cats.map((cat, i) => {
            const pos = [
              { left: '20%', top: '48%' },
              { left: '70%', top: '62%' },
            ][i % 2];
            const catGames = games.filter((g) => g.category === cat);
            return (
              <div
                key={cat}
                className="absolute w-56 -translate-x-1/2 -translate-y-1/2"
                style={{ left: pos.left, top: pos.top }}
              >
                <Pin className="absolute -top-3 left-1/2 z-10 -translate-x-1/2" />
                <ManilaFolder
                  onClick={() => toggleFolder(cat)}
                  className={i % 2 ? 'rotate-[1.5deg]' : '-rotate-[2deg]'}
                >
                  <div className="font-type text-[0.7rem] tracking-[0.2em] opacity-60">
                    CASE FILE
                  </div>
                  <div className="font-type text-sm font-bold tracking-[0.1em] uppercase">
                    {cat}
                  </div>
                  <div className="mt-1 font-type text-[0.7rem] opacity-70">
                    {catGames.length} game{catGames.length === 1 ? '' : 's'} · tap to open
                  </div>
                  <AnimatePresence>
                    {openFolder === cat && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 space-y-2 border-t border-[#3a2c17]/20 pt-3">
                          {catGames.map((g) => (
                            <Link
                              key={g.slug}
                              href={`/play/${g.slug}`}
                              className="block rounded-lg bg-[#3a2c17]/10 p-2 hover:bg-[#3a2c17]/20"
                            >
                              <span className="mr-2">{g.icon}</span>
                              <span className="font-type text-[0.78rem] font-bold uppercase tracking-[0.08em]">
                                {g.title}
                              </span>
                              <span className="ml-2 rounded-full bg-[#3a2c17]/15 px-2 py-0.5 font-type text-[0.62rem] uppercase">
                                {g.players}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </ManilaFolder>
              </div>
            );
          })}

          {/* featured sample polaroid */}
          {games[0] && (
            <Link
              href={`/play/${games[0].slug}`}
              className="absolute w-44 -translate-x-1/2 -translate-y-1/2 rotate-[3deg]"
              style={{ left: '48%', top: '42%' }}
            >
              <Pin className="absolute -top-3 left-1/2 z-10 -translate-x-1/2" />
              <Polaroid caption={`${games[0].icon} ${games[0].title}`}>
                <div className="grid aspect-square place-items-center bg-gradient-to-br from-[#2a2a2e] to-[#101012] text-5xl">
                  {games[0].icon}
                </div>
              </Polaroid>
            </Link>
          )}

          {/* evidence polaroid */}
          <div
            className="absolute w-40 -translate-x-1/2 -translate-y-1/2 -rotate-[4deg]"
            style={{ left: '82%', top: '32%' }}
          >
            <Pin className="absolute -top-3 left-1/2 z-10 -translate-x-1/2" />
            <Polaroid caption="Evidence #03 — torn ticket">
              <div className="grid aspect-square place-items-center bg-[#d8cfb8] p-3 font-type text-[0.6rem] text-[#3a2c17]">
                <div className="border border-dashed border-[#3a2c17]/50 p-2 text-center">
                  ADMIT ONE
                  <br />
                  SURAT → VADODARA
                  <br />
                  23:40
                </div>
              </div>
            </Polaroid>
          </div>

          {/* sealed teaser folders */}
          {SEALED_CASES.slice(0, 2).map((s, i) => (
            <div
              key={s.title}
              className="absolute w-48 -translate-x-1/2 -translate-y-1/2"
              style={{ left: i === 0 ? '42%' : '66%', top: i === 0 ? '74%' : '80%' }}
            >
              <Pin className="absolute -top-3 left-1/2 z-10 -translate-x-1/2" />
              <div className="manila-folder rotate-[-1deg] p-4 opacity-90">
                <div className="text-2xl">{s.icon}</div>
                <div className="font-type text-[0.78rem] font-bold uppercase tracking-[0.1em]">
                  {s.title}
                </div>
                <div className="font-type text-[0.65rem] opacity-70">{s.note}</div>
                <div className="mt-2 inline-block rounded-full bg-[var(--blood)] px-2.5 py-0.5 font-type text-[0.6rem] tracking-[0.2em] text-white">
                  SEALED
                </div>
              </div>
            </div>
          ))}

          {/* love notes card */}
          <Link
            href="/lovenotes"
            className="absolute block w-52 -translate-x-1/2 -translate-y-1/2 rotate-[2deg]"
            style={{ left: '86%', top: '82%' }}
          >
            <GlassCard className="p-4 text-center">
              <div className="font-type text-[0.8rem] tracking-[0.14em]">💌 Love Notes</div>
              <div className="mt-2 flex justify-center">
                <WaxSeal size={52} />
              </div>
              <div className="mt-2 font-type text-[0.62rem] leading-relaxed text-[var(--ink-dim)]">
                TO: PARTNER —
                <br />
                SEALED WITH A KISS.
                <br />
                CO-OP BONUS: +150 XP
              </div>
            </GlassCard>
          </Link>

          {/* stat strip */}
          <div className="absolute bottom-4 left-6 flex gap-3">
            <div className="glass-card !rounded-2xl px-4 py-2">
              <div className="eyebrow">Active cases</div>
              <div className="font-type text-xl">{String(games.length).padStart(2, '0')}</div>
            </div>
            <div className="glass-card !rounded-2xl px-4 py-2">
              <div className="eyebrow">Evidence filed</div>
              <div className="font-type text-xl">{evidenceCount}</div>
            </div>
          </div>
        </Corkboard>
      </div>

      <p className="text-center font-type text-[0.7rem] tracking-[0.2em] text-[var(--ink-faint)] uppercase">
        Private channel · two detectives · zero witnesses
      </p>
    </div>
  );
}
