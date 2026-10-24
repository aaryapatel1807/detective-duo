'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpenText,
  CalendarDays,
  Camera,
  Dices,
  Home,
  MailOpen,
  Play,
  Settings,
  Sparkles,
  SunMoon,
  Users,
} from 'lucide-react';
import { GAMES, DUO_GAMES, QUICK_GAMES, gameById, type GameMeta } from '@/lib/games';
import {
  getGameProgress,
  loadLocalProgress,
  syncProgress,
  type ProgressMap,
} from '@/lib/progress';
import { useTheme } from '@/components/ThemeProvider';
import { THEME_IDS, THEMES } from '@/lib/themes';
import { useMe } from '@/components/together/useMe';
import HomeArt from '@/components/ThemeArt';
import WelcomeIntro from '@/components/WelcomeIntro';
import { isWelcomeSeen } from '@/lib/welcome';
import { listLeftCases, type LeftCase } from '@/lib/together/leftCases';
import { ALL_CASES } from '@/lib/cases/bank';
import { getDailySet, getISTDateString, loadDailyState } from '@/lib/daily';
import {
  createSession,
  getDisplayName,
  joinSession,
  loadSession,
  setDisplayName,
} from '@/lib/together/session';
import {
  generateRoomCode,
  isValidRoomCode,
  normalizeRoomCode,
} from '@/lib/together/roomCode';

function Stars({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span className="chip" aria-label={`${n} of 3 stars`}>
      {'★'.repeat(n)}
      <span className="opacity-40">{'★'.repeat(3 - n)}</span>
    </span>
  );
}

type Filter = 'all' | 'solo' | 'duo' | 'quick';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'solo', label: 'Solo' },
  { id: 'duo', label: 'Duo Corner' },
  { id: 'quick', label: 'Quick games' },
];

function gamesFor(filter: Filter): { games: GameMeta[]; category: string } {
  if (filter === 'solo') return { games: GAMES, category: 'Solo' };
  if (filter === 'duo') return { games: DUO_GAMES, category: 'Duo Corner' };
  if (filter === 'quick') return { games: QUICK_GAMES, category: 'Quick games' };
  return {
    games: [...GAMES, ...DUO_GAMES, ...QUICK_GAMES],
    category: 'All games',
  };
}

function DashCard({ game, progress }: { game: GameMeta; progress: ProgressMap }) {
  const p = getGameProgress(progress, game.id);
  const starsEarned = Object.values(p.stars).reduce((s, n) => s + n, 0);
  const Icon = game.icon;
  return (
    <Link href={`/play/${game.id}`} className="dash-card">
      <span className="dash-card-art">
        <Icon size={40} aria-hidden />
      </span>
      <span className="dash-card-body">
        <span className="dash-cat">{game.live ? 'Play' : 'Soon'}</span>
        <span className="font-display text-lg font-bold leading-tight">{game.name}</span>
        <span className="text-sm text-[var(--ink-dim)]">{game.tagline}</span>
        <span className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          <span className="chip">Level {p.currentLevel}</span>
          <Stars n={Math.min(3, starsEarned)} />
        </span>
        <span className="btn mt-2 justify-center">Open →</span>
      </span>
    </Link>
  );
}

const ALL_GAMES = [...GAMES, ...DUO_GAMES, ...QUICK_GAMES];

const FEATURED = [
  {
    href: '/play/case-files',
    icon: BookOpenText,
    title: 'Case Files',
    note: 'Short mysteries with one culprit.',
  },
  { href: '/together', icon: Users, title: 'Play together', note: 'One room, two players, one code.' },
  {
    href: '/date-night',
    icon: Dices,
    title: 'Roll a date night',
    note: 'Dinner, activity, treat, entertainment — decided by dice.',
  },
  {
    href: '/photo-booth',
    icon: Camera,
    title: 'Photo booth',
    note: 'Three shots, one strip, made on this device.',
  },
];

export default function HomePage() {
  const { userId, theme, setTheme } = useTheme();
  const me = useMe();
  const router = useRouter();
  const [progress, setProgress] = useState<ProgressMap>({});
  const [leftCases, setLeftCases] = useState<LeftCase[]>([]);
  const [surprise, setSurprise] = useState(GAMES[1]);
  const [welcome, setWelcome] = useState<'loading' | 'show' | 'hide'>('loading');
  const [filter, setFilter] = useState<Filter>('all');
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [roomError, setRoomError] = useState<string | null>(null);
  const [roomBusy, setRoomBusy] = useState(false);

  // The welcome intro plays once per session, before the home screen.
  useEffect(() => {
    try {
      setWelcome(isWelcomeSeen(sessionStorage) ? 'hide' : 'show');
    } catch {
      setWelcome('show');
    }
  }, []);

  useEffect(() => {
    setProgress(loadLocalProgress());
  }, []);

  useEffect(() => {
    if (userId) {
      void syncProgress(loadLocalProgress()).then(setProgress);
    }
  }, [userId]);

  useEffect(() => {
    if (!me) return;
    void listLeftCases(me.uid).then(setLeftCases);
  }, [me]);

  useEffect(() => {
    setRoomName(getDisplayName());
  }, []);

  useEffect(() => {
    setSurprise(ALL_GAMES[Math.floor(Math.random() * ALL_GAMES.length)]);
  }, []);

  const lastPlayed = useMemo(() => {
    let best: { game: string; at: string } | null = null;
    for (const [game, p] of Object.entries(progress)) {
      if (p.lastPlayedAt && (!best || p.lastPlayedAt > best.at)) {
        best = { game, at: p.lastPlayedAt };
      }
    }
    return best ? gameById(best.game) : undefined;
  }, [progress]);

  const lastProgress = lastPlayed ? getGameProgress(progress, lastPlayed.id) : null;

  const totals = useMemo(() => {
    let played = 0;
    let stars = 0;
    let levels = 0;
    for (const p of Object.values(progress)) {
      if (p.lastPlayedAt) played += 1;
      stars += Object.values(p.stars).reduce((s, n) => s + n, 0);
      levels += Math.max(0, p.currentLevel - 1);
    }
    return { played, stars, levels };
  }, [progress]);

  const todayStr = getISTDateString();
  const dailyState = loadDailyState();
  const todayDone = dailyState.completions[todayStr] ?? {};
  const dailyDoneCount = ['case', 'cipher', 'nonogram'].filter(
    (k) => todayDone[k as keyof typeof todayDone],
  ).length;

  const cycleTheme = () => {
    const i = THEME_IDS.indexOf(theme);
    setTheme(THEME_IDS[(i + 1) % THEME_IDS.length]);
  };

  const withRoomName = () => {
    const n = roomName.trim() || 'Sachi';
    setDisplayName(n);
    return n;
  };

  const createRoom = async () => {
    if (!me) return;
    setRoomBusy(true);
    setRoomError(null);
    const code = generateRoomCode();
    await createSession(code, { uid: me.uid, name: withRoomName(), role: 'host' });
    router.push(`/together/${code}`);
  };

  const joinRoom = async () => {
    if (!me) return;
    const code = normalizeRoomCode(joinCode);
    if (!isValidRoomCode(code)) {
      setRoomError('Room codes are 4 letters — check the code and try again.');
      return;
    }
    setRoomBusy(true);
    setRoomError(null);
    const existing = await loadSession(code);
    if (!existing) {
      setRoomError(`No room with code ${code} yet. Create it, or check the letters.`);
      setRoomBusy(false);
      return;
    }
    await joinSession(code, { uid: me.uid, name: withRoomName(), role: 'guest' });
    router.push(`/together/${code}`);
  };

  if (welcome === 'loading') {
    return <main className="min-h-screen" style={{ background: 'var(--bg)' }} aria-label="Loading" />;
  }

  if (welcome === 'show') {
    return <WelcomeIntro onDone={() => setWelcome('hide')} />;
  }

  const { games: filteredGames } = gamesFor(filter);
  const daily = getDailySet(todayStr);
  const firstLeft = leftCases[0];
  const leftCase = firstLeft ? ALL_CASES.find((c) => c.id === firstLeft.caseId) : undefined;

  const sideNav = [
    { href: '/', icon: Home, label: 'Home', short: 'Home', active: true },
    { href: '/together', icon: Users, label: 'Play together', short: 'Together' },
    { href: '/daily', icon: CalendarDays, label: 'Daily desk', short: 'Daily' },
    { href: '/date-night', icon: Dices, label: 'Date night', short: 'Date night' },
    { href: '/photo-booth', icon: Camera, label: 'Photo booth', short: 'Booth' },
    { href: '/settings', icon: Settings, label: 'Settings', short: 'Settings' },
  ];

  return (
    <div className="dash-layout">
      <aside className="dash-sidebar" aria-label="Sections">
        <p className="dash-side-brand">Sachi</p>
        <p className="dash-side-tag">Games and little gifts, made for you.</p>
        <nav className="dash-side-nav">
          {sideNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`dash-side-link ${item.active ? 'active' : ''}`}
              aria-current={item.active ? 'page' : undefined}
            >
              <item.icon size={18} aria-hidden /> {item.label}
            </Link>
          ))}
        </nav>
        <button type="button" className="btn mt-2" onClick={cycleTheme}>
          <SunMoon size={18} aria-hidden /> Theme: {THEMES[theme].label}
        </button>
      </aside>

      <main className="dash-main">
        <section className="dash-masthead">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="dash-title">Sachi</h1>
              <p className="mt-1 text-[var(--ink-dim)]">
                Games and little gifts, made for you. Pick up where you left off, or try
                something gentle.
              </p>
            </div>
            <div className="home-art shrink-0" aria-hidden>
              <HomeArt />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="chip">★ {totals.stars} stars</span>
            <span className="chip">{totals.played} games played</span>
            <span className="chip">
              Today: {dailyDoneCount} of 3
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {lastPlayed && lastProgress ? (
              <Link href={`/play/${lastPlayed.id}`} className="btn btn-primary">
                <Play size={18} aria-hidden /> Continue {lastPlayed.name} · Level{' '}
                {lastProgress.currentLevel}
              </Link>
            ) : (
              <Link href="/play/logic-grids" className="btn btn-primary">
                <Play size={18} aria-hidden /> Start with Logic Grids
              </Link>
            )}
            <Link href={`/play/${surprise.id}`} className="btn">
              <Sparkles size={18} aria-hidden /> Surprise me
            </Link>
          </div>
          <p className="mt-3 text-sm text-[var(--ink-dim)]">
            Surprise me picks from all twenty-one games, at your level in whichever one it
            lands on. Every Duo Corner and quick game works alone too, against a bot.
          </p>
        </section>

        <section className="dash-room panel mt-6 p-5">
          <h2 className="text-lg font-bold">Play together</h2>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            One room, two players. Create a room and share its 4-letter code, or join with
            a code your partner shared.
          </p>
          <label className="mt-3 flex flex-col gap-1 text-sm font-semibold">
            Your name in the room
            <input
              className="input"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Sachi"
              maxLength={40}
              aria-label="Your name in the room"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={createRoom} disabled={roomBusy || !me}>
              Create a room
            </button>
            <input
              className="input max-w-32 uppercase"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="CODE"
              maxLength={4}
              aria-label="Room code"
            />
            <button type="button" className="btn" onClick={joinRoom} disabled={roomBusy || !me}>
              Join
            </button>
          </div>
          {roomError && (
            <p className="mt-2 text-sm" role="alert">
              {roomError}
            </p>
          )}
        </section>

        <section className="mt-6">
          <h2 className="text-lg font-bold">Featured</h2>
          <div className="dash-carousel mt-3">
            {FEATURED.map((f) => (
              <Link key={f.href} href={f.href} className="dash-feature">
                <span className="dash-feature-art">
                  <f.icon size={32} aria-hidden />
                </span>
                <span className="font-display text-lg font-bold leading-tight">{f.title}</span>
                <span className="text-sm text-[var(--ink-dim)]">{f.note}</span>
                <span className="btn mt-auto justify-center">Open →</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-lg font-bold">The board</h2>
          <div className="dash-filters mt-3">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`dash-filter ${filter === f.id ? 'active' : ''}`}
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="dash-grid mt-3">
            {filteredGames.map((g) => (
              <DashCard key={g.id} game={g} progress={progress} />
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-lg font-bold">Today&apos;s orders</h2>
          <div className="mt-3 grid gap-3">
            {[
              {
                name: 'Daily Case',
                detail: daily.dailyCase
                  ? daily.dailyCase.title
                  : 'No case today — the cipher and nonogram below are ready, and a fresh case arrives tomorrow.',
                href: '/daily#case',
                done: Boolean(todayDone.case),
              },
              {
                name: 'Daily Cipher',
                detail: 'A fresh coded note to decode.',
                href: '/daily#cipher',
                done: Boolean(todayDone.cipher),
              },
              {
                name: 'Daily Nonogram',
                detail: 'A fresh little picture to fill in.',
                href: '/daily#nonogram',
                done: Boolean(todayDone.nonogram),
              },
            ].map((slot) => (
              <Link key={slot.name} href={slot.href} className="panel flex items-center justify-between gap-3 p-4">
                <span>
                  <span className="font-semibold">{slot.name}</span>
                  <span className="mt-1 block text-sm text-[var(--ink-dim)]">{slot.detail}</span>
                </span>
                <span className="shrink-0 text-lg" aria-label={slot.done ? 'Done' : 'Not done yet'}>
                  {slot.done ? '✓' : '○'}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <div className="dash-stats">
            <div className="dash-stat">
              <p className="dash-cat">Games played</p>
              <p className="dash-stat-num">{totals.played}</p>
            </div>
            <div className="dash-stat">
              <p className="dash-cat">Stars earned</p>
              <p className="dash-stat-num">{totals.stars}</p>
            </div>
            <div className="dash-stat">
              <p className="dash-cat">Levels climbed</p>
              <p className="dash-stat-num">{totals.levels}</p>
            </div>
            <div className="dash-stat">
              <p className="dash-cat">Left for you</p>
              <p className="dash-stat-num">{leftCases.length}</p>
            </div>
          </div>
        </section>

        <section className="mt-6">
          {firstLeft && leftCase ? (
            <Link href={`/play/case-files?case=${leftCase.id}`} className="panel flex items-center gap-3 p-4">
              <MailOpen size={22} aria-hidden className="shrink-0" />
              <div>
                <p className="font-semibold">
                  Left for you{leftCases.length > 1 ? ` · ${leftCases.length} waiting` : ''}
                </p>
                <p className="text-sm">
                  {leftCase.title}
                  {firstLeft.note ? ` — “${firstLeft.note}”` : ''}
                </p>
                <p className="text-sm text-[var(--ink-dim)]">From your partner · tap to open</p>
              </div>
            </Link>
          ) : (
            <div className="panel flex items-center gap-3 p-4">
              <MailOpen size={22} aria-hidden className="shrink-0" />
              <div>
                <p className="font-semibold">Left for you</p>
                <p className="text-sm text-[var(--ink-dim)]">
                  Nothing here yet. When your partner leaves you a case, it will wait in
                  this spot.
                </p>
                <Link href="/together/leave" className="btn mt-2">
                  Leave one for your partner
                </Link>
              </div>
            </div>
          )}
        </section>
      </main>

      <nav className="dash-bottomnav" aria-label="Sections">
        {sideNav.map((item) => (
          <Link key={item.href} href={item.href} className={`dash-bottom-link ${item.active ? 'active' : ''}`}>
            <item.icon size={20} aria-hidden />
            <span>{item.short}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
