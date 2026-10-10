'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '../lib/cn';
import { SoundToggle } from './SoundToggle';
import { ThemeToggle } from './ThemeToggle';
import { useRoom } from '../lib/realtime/useRoom';

const SIDEBAR_KEY = 'dd-sidebar-collapsed';

const NAV = [
  { href: '/', label: 'Case Hub', icon: '🗂️' },
  { href: '/solo', label: 'Solo Files', icon: '🔎' },
  { href: '/lovenotes', label: 'Love Notes', icon: '💌' },
  { href: '/scoreboard', label: 'Scoreboard', icon: '🏅' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

/**
 * Collapsible glass sidebar (NutriAI style): slides left, persists in
 * localStorage 'dd-sidebar-collapsed'. CASE HUB panel with status,
 * active cases, evidence collected, sync protocol — like the reference.
 */
export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { roomCode, connected, peer } = useRoom();

  useEffect(() => {
    setMounted(true);
    try {
      setCollapsed(window.localStorage.getItem(SIDEBAR_KEY) === '1');
    } catch {}
  }, []);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      window.localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
    } catch {}
  };

  return (
    <>
      {/* Reopen tab when collapsed */}
      {mounted && collapsed && (
        <motion.button
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          onClick={toggle}
          data-sidebar-toggle
          className="glass-card fixed left-3 top-1/2 z-40 grid h-16 w-10 -translate-y-1/2 place-items-center text-xl"
          title="Open sidebar"
        >
          →
        </motion.button>
      )}

      <motion.aside
        data-app-sidebar
        initial={false}
        animate={{ x: collapsed ? '-105%' : '0%' }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        className="fixed bottom-4 left-4 top-4 z-40 flex w-[268px] flex-col gap-4 overflow-y-auto p-5 glass-card"
        aria-hidden={collapsed}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-[var(--brass)] to-[var(--brass-deep)] text-2xl shadow-lg">
              🛡️
            </div>
            <span className="type-heading text-lg">Case Hub</span>
          </div>
          <button
            onClick={toggle}
            className="grid h-8 w-8 place-items-center rounded-full border border-[var(--glass-border)] text-[var(--ink-dim)] hover:text-[var(--ink)]"
            title="Collapse sidebar"
          >
            ←
          </button>
        </div>

        <nav className="flex flex-col gap-1.5">
          {NAV.map((n) => {
            const active = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-4 py-2.5 font-type text-[0.8rem] tracking-[0.14em] uppercase transition-colors',
                  active
                    ? 'bg-[rgba(232,163,61,0.16)] text-[var(--ink)] border border-[var(--amber-glow)]'
                    : 'text-[var(--ink-dim)] hover:text-[var(--ink)] border border-transparent hover:border-[var(--glass-border)]',
                )}
              >
                <span className="text-lg">{n.icon}</span>
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="glass-card !rounded-2xl p-4">
          <div className="eyebrow mb-1.5">Status</div>
          <div className="font-type text-[0.8rem] tracking-[0.12em]">
            {roomCode ? (
              <>
                ROOM {roomCode} · {peer ? '2 PLAYERS' : 'WAITING'}
              </>
            ) : (
              'OFFLINE · SOLO'
            )}{' '}
            <span className={cn('inline-block h-2 w-2 rounded-full', connected ? 'bg-green-400' : 'bg-[var(--ink-faint)]')} />
          </div>
        </div>

        <div className="glass-card !rounded-2xl p-4">
          <div className="eyebrow mb-1.5">Sync Protocol</div>
          <div className="font-type text-[0.8rem] tracking-[0.12em] text-[var(--ink-dim)]">
            {connected ? '🔒 SECURE · ENCRYPTED' : '📡 AWAITING UPLINK'}
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-2">
          <SoundToggle />
          <ThemeToggle />
          {roomCode && (
            <Link href={`/room/${roomCode}`} className="noir-btn text-center !text-[0.7rem]">
              → Room {roomCode}
            </Link>
          )}
        </div>
      </motion.aside>
    </>
  );
}
