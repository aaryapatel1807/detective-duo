'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, FileSearch, Trophy, Heart, Settings } from 'lucide-react';
import { cn } from '../lib/cn';

const TABS = [
  { href: '/', label: 'Home', Icon: House },
  { href: '/solo', label: 'Solo', Icon: FileSearch },
  { href: '/scoreboard', label: 'Scoreboard', Icon: Trophy },
  { href: '/lovenotes', label: 'Love Notes', Icon: Heart },
  { href: '/settings', label: 'Settings', Icon: Settings },
];

/**
 * Mobile bottom tab bar (< lg): floating island with 5 tabs, icon + label,
 * gold-tinted active pill. Hidden on desktop (sidebar takes over) and while
 * a full-bleed game board is mounted.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav data-bottom-nav className="hub-bottomnav" aria-label="Primary">
      <div className="hub-bottomnav-inner">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn('hub-tab', active && 'active')}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="hub-tab-icon" strokeWidth={active ? 2.25 : 1.8} aria-hidden />
              <span className="hub-tab-label">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
