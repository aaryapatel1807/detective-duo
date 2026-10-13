'use client';

/* Detective Duo hub — noir mobile-game agency dashboard.
 * Masthead hero (profile + rank + partner + resource chips), room panel,
 * featured carousel, category filter + game grid, daily briefing, stats.
 * All numbers come from real local state (getXP / lib/store). No page-level
 * horizontal scroll; carousels scroll internally with snap.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { RedStringLayer } from '../components/RedString';
import { ManilaFolder } from '../components/props';
import { listGames, categories } from '../games/all';
import type { GameMeta } from '../games/types';
import { useRoom } from '../lib/realtime/useRoom';
import { getXP, progressToNext, rankFor, XP_AWARDS } from '../lib/xp';
import { CASES } from '../lib/content/cases';
import { CIPHERS } from '../lib/content/ciphers';
import { BLACK_STORIES } from '../lib/content/blackStories';
import { readStr, readJSON, writeJSON } from '../lib/store';
import { myProfile, partnerProfile } from '../lib/profile';
import { sounds } from '../lib/sound';
import s from './home.module.css';

/* ---------- real local state ---------- */

const OPENED_FILES_KEY = 'dd-opened-files';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

/** Track opened case files honestly — feeds the Daily Briefing mission. */
function markFileOpened(slug: string) {
  try {
    const seen = readJSON<string[]>(OPENED_FILES_KEY, []);
    if (!seen.includes(slug)) writeJSON(OPENED_FILES_KEY, [...seen, slug]);
  } catch {}
}

function openedFileCount(): number {
  try {
    return readJSON<string[]>(OPENED_FILES_KEY, []).length;
  } catch {
    return 0;
  }
}

function coopWins(): number {
  const n = parseInt(readStr('dd-coop-wins', '0'), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/* ---------- card presentation ---------- */

const COVER_CLASS: Record<string, string> = {
  Flagship: s.cvFlagship,
  Deduction: s.cvDeduction,
  'Word & Code Duels': s.cvWord,
  'Quick Cases': s.cvQuick,
  'Co-op Missions': s.cvCoop,
  'Chase & Bluff': s.cvChase,
  'Solo Files': s.cvSolo,
  'Quick Games': s.cvSolo,
};

const COVER_MOTIF: Record<string, string> = {
  Flagship: '★',
  Deduction: '◈',
  'Word & Code Duels': '✦',
  'Quick Cases': '⬢',
  'Co-op Missions': '◉',
  'Chase & Bluff': '⬣',
  'Solo Files': '❖',
  'Quick Games': '✚',
};

const RARITY: Record<'easy' | 'medium' | 'hard', { cls: string; label: string }> = {
  // ROUTINE/TRICKY stamp language reused from the Crime Mystery case select
  easy: { cls: s.rarityEasy, label: 'Routine' },
  medium: { cls: s.rarityMedium, label: 'Tricky' },
  hard: { cls: s.rarityHard, label: 'Hard' },
};

const MODE_LABEL: Record<GameMeta['players'], string> = {
  duo: 'VS Duel',
  coop: 'Co-op',
  solo: 'Solo',
};

function GameCard({ game }: { game: GameMeta }) {
  const diff = game.difficulty ?? 'medium';
  const rarity = RARITY[diff];
  return (
    <Link
      href={`/play/${game.slug}`}
      className={s.card}
      onClick={() => {
        sounds.paperShuffle();
        markFileOpened(game.slug);
      }}
      aria-label={`Open ${game.title}`}
    >
      <div className={`${s.cover} ${COVER_CLASS[game.category] ?? s.cvDefault}`}>
        <span className={s.coverMotif} aria-hidden>
          {COVER_MOTIF[game.category] ?? '❖'}
        </span>
        <span className={s.coverCat}>{game.category}</span>
        <span className={s.coverIcon} aria-hidden>
          {game.icon}
        </span>
        <span className={s.coverTitle}>{game.title}</span>
      </div>
      <div className={s.cardBody}>
        <div className={s.badgeRow}>
          <span className={`${s.rarity} ${rarity.cls}`}>{rarity.label}</span>
          <span className={s.modeBadge}>{MODE_LABEL[game.players]}</span>
        </div>
        <p className={s.cardBlurb}>{game.tagline ?? game.blurb}</p>
        <span className={s.openFile}>
          Open file <span aria-hidden>→</span>
        </span>
      </div>
    </Link>
  );
}

/* ---------- room panel: create/join logic identical, noir glass skin ---------- */

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
      <section className={`hub-glass ${s.roomPanel}`} aria-label="Active room">
        <div className="hub-eyebrow">Active channel</div>
        <div className={`${s.roomMeta} mt-3`}>
          <div className={s.roomCode}>{room.roomCode}</div>
          <div className="text-sm" style={{ color: 'var(--hub-ink-dim)' }}>
            {room.peer ? (
              <>
                Partner in the room: <b style={{ color: 'var(--hub-ink)' }}>{room.peer.name}</b>
              </>
            ) : (
              'Share the code — waiting for your partner…'
            )}
          </div>
          <div className="ml-auto flex gap-2">
            <Link href={`/room/${room.roomCode}`} className="hub-btn">
              Enter lobby
            </Link>
            <button onClick={() => room.leaveRoom()} className="hub-btn-ghost">
              Leave
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`hub-glass ${s.roomPanel}`} aria-label="Open a private channel">
      <div className="hub-eyebrow">Open a private channel</div>
      <div className={s.roomFields}>
        <input
          className="noir-input"
          placeholder="Your detective name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Your detective name"
        />
        <div className={s.roomBtns}>
          <button
            className="hub-btn"
            disabled={room.busy}
            onClick={() =>
              go(() => room.createRoom(name || undefined), (c: string) =>
                router.push(`/room/${c}`),
              )
            }
          >
            {room.busy ? 'Dialing…' : 'Create room'}
          </button>
          <div className={s.joinRow}>
            <input
              className="noir-input uppercase"
              placeholder="Code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              aria-label="Room code"
            />
            <button
              className="hub-btn-ghost"
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
      {err && <p className={s.roomErr}>{err}</p>}
      {!room.connected && (
        <p className={s.roomTip}>
          Tip: start the uplink first — <span className="font-type">npm run socket</span>
        </p>
      )}
    </section>
  );
}

/* ---------- daily briefing missions (real local state only) ---------- */

interface Mission {
  icon: string;
  title: string;
  done: number;
  target: number;
  reward: string;
}

function DailyBriefing() {
  const xp = typeof window !== 'undefined' ? getXP() : 0;
  const opened = typeof window !== 'undefined' ? openedFileCount() : 0;
  const wins = typeof window !== 'undefined' ? coopWins() : 0;

  const missions: Mission[] = [
    {
      icon: '🗂️',
      title: 'Open 3 case files',
      done: Math.min(opened, 3),
      target: 3,
      reward: `+${XP_AWARDS.soloParticipation} XP / case`,
    },
    {
      icon: '🤝',
      title: 'Win a co-op case together',
      done: Math.min(wins, 1),
      target: 1,
      reward: `+${XP_AWARDS.coopWin} XP`,
    },
    {
      icon: '⭐',
      title: `Reach 100 career XP — ${rankFor(100).name} rank`,
      done: Math.min(xp, 100),
      target: 100,
      reward: 'rank up',
    },
  ];

  return (
    <section className={s.briefWrap} aria-label="Daily briefing">
      <ManilaFolder className="p-5 pt-6">
        <div className="hub-eyebrow">Daily briefing</div>
        <h2 className={`hub-display ${s.sectionTitle} mt-2`}>Today&apos;s orders</h2>
        <div className={s.missionList}>
          {missions.map((m) => {
            const pct = m.target > 0 ? Math.min(1, m.done / m.target) : 0;
            const filed = m.done >= m.target;
            return (
              <div key={m.title} className={s.mission}>
                <div className={s.missionIcon} aria-hidden>
                  {filed ? '✅' : m.icon}
                </div>
                <div className={s.missionMain}>
                  <div className={s.missionTitle}>{m.title}</div>
                  <div className={s.missionBar}>
                    <div className="xp-track">
                      <motion.div
                        className="xp-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.round(pct * 100)}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                  <div className={s.missionProg}>
                    {m.done} / {m.target}
                    {filed ? ' — filed' : ''}
                  </div>
                </div>
                <div className={s.missionXp}>
                  {m.reward}
                  <br />
                  reward
                </div>
              </div>
            );
          })}
        </div>
      </ManilaFolder>
    </section>
  );
}

/* ---------- home ---------- */

export default function HubPage() {
  const room = useRoom();
  const [filter, setFilter] = useState<string>('All');
  const games = useMemo(() => listGames(), []);
  const cats = useMemo(() => categories(), []);
  const xp = typeof window !== 'undefined' ? getXP() : 0;
  const me = myProfile(room.me.name || 'Detective');
  const partner = partnerProfile(room.peer?.name ?? readStr('dd-partner-name', 'Partner'));

  const prog = progressToNext(xp);
  const xpLabel = prog.next ? `${prog.into} / ${prog.span} XP` : `${xp} XP`;
  const evidenceCount = CASES.length + CIPHERS.length + BLACK_STORIES.length;
  const wins = typeof window !== 'undefined' ? coopWins() : 0;

  const featured = useMemo(() => {
    const bySlug = (slug: string) => games.find((g) => g.slug === slug);
    const picks = ['crime-mystery', 'escape-room', 'black-stories']
      .map(bySlug)
      .filter((g): g is GameMeta => Boolean(g));
    // crime-mystery always leads; backfill from the registry if a pick is missing
    const rest = games.filter((g) => !picks.includes(g));
    return [...picks, ...rest].slice(0, 3);
  }, [games]);

  const visible = filter === 'All' ? games : games.filter((g) => g.category === filter);

  const chipClick = (cat: string) => {
    sounds.pinTap();
    setFilter(cat);
  };

  return (
    <div className={s.wrap}>
      {/* ===== masthead hero ===== */}
      <motion.header
        className={`hub-glass ${s.hero}`}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className={s.heroStrings} aria-hidden>
          <RedStringLayer
            connections={[
              { from: { x: 8, y: 12 }, to: { x: 34, y: 4 } },
              { from: { x: 34, y: 4 }, to: { x: 62, y: 16 } },
              { from: { x: 62, y: 16 }, to: { x: 90, y: 6 } },
              { from: { x: 8, y: 12 }, to: { x: 22, y: 30 } },
              { from: { x: 90, y: 6 }, to: { x: 78, y: 28 } },
            ]}
          />
        </div>

        <div className={s.masthead}>
          <span className={`hub-eyebrow ${s.agencyKicker}`}>The agency · field headquarters</span>
          <h1 className={`hub-display ${s.agencyTitle}`}>
            Detective <span className={s.gold}>Duo</span>
          </h1>
          <p className={`hub-mono ${s.agencySub}`}>
            Private channel · two detectives · zero witnesses
          </p>
        </div>

        <div className={s.profileRow}>
          <div className={s.meRow}>
            <div className={s.avatar} aria-hidden>
              {me.photo ? <img src={me.photo} alt="" /> : initials(me.name)}
            </div>
            <div className={s.rankBlock}>
              <div className={s.detectiveName}>{me.name}</div>
              <div className={`hub-mono ${s.rankLine}`}>
                Detective rank: {prog.rank.name}
                {prog.next ? ` → ${prog.next.name}` : ' · max'}
              </div>
              <div className={s.xpRow}>
                <div className="xp-track" style={{ flex: 1 }}>
                  <motion.div
                    className="xp-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round(prog.pct * 100)}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
                <span className={s.xpNum}>{xpLabel}</span>
              </div>
            </div>
          </div>

          <div className={s.partnerRow}>
            <div className={s.partnerAvatar} aria-hidden>
              {partner.photo ? <img src={partner.photo} alt="" /> : initials(partner.name)}
            </div>
            <div className={s.partnerName}>{partner.name}</div>
            <span
              className={room.peer ? s.onlineDot : s.offlineDot}
              title={room.peer ? 'In the room' : 'Away'}
            />
            <span className="hub-mono" style={{ fontSize: '0.625rem', color: 'var(--hub-ink-dim)' }}>
              {room.peer ? 'In the room' : 'Partner'}
            </span>
          </div>
        </div>

        <div className={s.resourceRow}>
          <span className="hub-badge">⭐ {xp} XP</span>
          <span className="hub-badge">🎖 {prog.rank.name}</span>
          <span className={s.spacer} />
          <Link href="/settings" className={s.gearLink} aria-label="Settings">
            ⚙️
          </Link>
        </div>
      </motion.header>

      <RoomPanel />

      {/* ===== featured carousel ===== */}
      <section aria-label="Featured cases">
        <div className={s.sectionHead}>
          <h2 className={`hub-display ${s.sectionTitle}`}>Featured cases</h2>
          <span className={s.sectionNote}>swipe →</span>
        </div>
        <div className={s.carousel}>
          {featured.map((g, i) => (
            <Link
              key={g.slug}
              href={`/play/${g.slug}`}
              className={s.featCard}
              onClick={() => {
                sounds.paperShuffle();
                markFileOpened(g.slug);
              }}
              aria-label={`Open ${g.title}`}
            >
              <div className={`${s.featCover} ${COVER_CLASS[g.category] ?? s.cvDefault}`}>
                <span className={`hub-eyebrow ${s.featFlag}`} style={{ color: 'var(--hub-gold)' }}>
                  {i === 0 ? '★ Flagship' : `№ 0${i + 1} · Featured`}
                </span>
                <span className={s.coverMotif} aria-hidden>
                  {COVER_MOTIF[g.category] ?? '❖'}
                </span>
                <span className={s.featIcon} aria-hidden>
                  {g.icon}
                </span>
                <span className={s.featTitle}>{g.title}</span>
                <span className={s.featTag}>{g.tagline ?? g.blurb}</span>
              </div>
              <div className={s.featBody}>
                <div className={s.badgeRow}>
                  <span className={`${s.rarity} ${RARITY[g.difficulty ?? 'medium'].cls}`}>
                    {RARITY[g.difficulty ?? 'medium'].label}
                  </span>
                  <span className={s.modeBadge}>{MODE_LABEL[g.players]}</span>
                </div>
                <span className={s.featOpen}>
                  Open <span aria-hidden>→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== case board: filter + grid ===== */}
      <section aria-label="All case files">
        <div className={s.sectionHead}>
          <h2 className={`hub-display ${s.sectionTitle}`}>The case board</h2>
          <span className={s.sectionNote}>{visible.length} files</span>
        </div>
        <div className={s.chipRow} role="group" aria-label="Filter by category">
          {['All', ...cats].map((cat) => (
            <button
              key={cat}
              className={`${s.chip} ${filter === cat ? s.chipActive : ''}`}
              onClick={() => chipClick(cat)}
              aria-pressed={filter === cat}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className={s.grid}>
          {visible.map((g) => (
            <GameCard key={g.slug} game={g} />
          ))}
        </div>
      </section>

      <DailyBriefing />

      {/* ===== stats strip ===== */}
      <section className={s.stats} aria-label="Agency stats">
        <div className={s.stat}>
          <div className={s.statName}>Active cases</div>
          <div className={s.statNum}>{String(games.length).padStart(2, '0')}</div>
        </div>
        <div className={s.stat}>
          <div className={s.statName}>Evidence filed</div>
          <div className={s.statNum}>{evidenceCount}</div>
        </div>
        <div className={s.stat}>
          <div className={s.statName}>Co-op wins</div>
          <div className={s.statNum}>{wins}</div>
        </div>
        <div className={s.stat}>
          <div className={s.statName}>Case categories</div>
          <div className={s.statNum}>{cats.length}</div>
        </div>
      </section>

      <p className={s.footNote}>Private channel · two detectives · zero witnesses</p>
    </div>
  );
}
