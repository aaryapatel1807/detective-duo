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
 * Collapsible noir sidebar (desktop only, >= lg; bottom nav takes over on
 * mobile). Dark navy frosted glass, gold active-link pill, JetBrains Mono
 * labels. Collapsed state persists in localStorage 'dd-sidebar-collapsed'.
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
          className="hub-sidebar-toggle hub-glass lg-3 fixed left-3 top-1/2 z-40 h-16 w-12 -translate-y-1/2 text-xl"
          title="Open sidebar"
          aria-label="Open sidebar"
        >
          <span style={{ color: 'var(--hub-gold)' }}>→</span>
        </motion.button>
      )}

      <motion.aside
        data-app-sidebar
        initial={false}
        animate={{ x: collapsed ? '-105%' : '0%' }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        className="hub-sidebar hub-glass lg-3 fixed bottom-4 left-4 top-4 z-40 w-[268px] gap-4 overflow-y-auto p-5"
        aria-hidden={collapsed}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="grid h-11 w-11 flex-none place-items-center rounded-full text-2xl shadow-lg"
              style={{
                background: 'linear-gradient(135deg, var(--hub-gold) 0%, #8a5f1c 100%)',
                boxShadow: '0 6px 18px rgba(217, 164, 65, 0.35)',
              }}
            >
              🛡️
            </div>
            <div>
              <div className="hub-display text-[1.05rem] font-bold tracking-[0.12em]" style={{ color: 'var(--hub-gold)' }}>
                CASE HUB
              </div>
              <div className="hub-eyebrow mt-0.5">Noir Agency</div>
            </div>
          </div>
          <button
            onClick={toggle}
            className="hub-icon-btn"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            ←
          </button>
        </div>

        <nav className="flex flex-col gap-1.5" aria-label="Hub">
          {NAV.map((n) => {
            const active = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn('hub-navlink', active && 'active')}
                aria-current={active ? 'page' : undefined}
              >
                <span className="text-lg">{n.icon}</span>
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="hub-glass p-4" style={{ borderRadius: 18 }}>
          <div className="hub-eyebrow mb-1.5">Status</div>
          <div className="hub-mono text-[0.78rem] tracking-[0.1em]" style={{ color: 'var(--hub-ink)' }}>
            {roomCode ? (
              <>
                ROOM {roomCode} · {peer ? '2 PLAYERS' : 'WAITING'}
              </>
            ) : (
              'OFFLINE · SOLO'
            )}{' '}
            <span
              className="ml-1 inline-block h-2 w-2 rounded-full"
              style={{ background: connected ? 'var(--hub-green)' : 'var(--hub-ink-dim)' }}
              aria-hidden
            />
          </div>
        </div>

        <div className="hub-glass p-4" style={{ borderRadius: 18 }}>
          <div className="hub-eyebrow mb-1.5">Sync Protocol</div>
          <div className="hub-mono text-[0.78rem] tracking-[0.1em]" style={{ color: 'var(--hub-ink-dim)' }}>
            {connected ? '🔒 SECURE · ENCRYPTED' : '📡 AWAITING UPLINK'}
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-2">
          <SoundToggle />
          <ThemeToggle />
          {roomCode && (
            <Link href={`/room/${roomCode}`} className="hub-btn !text-[0.7rem]">
              → Room {roomCode}
            </Link>
          )}
        </div>
      </motion.aside>
    </>
  );
}
