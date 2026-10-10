'use client';

/* Crime Mystery top nav: logo, centered tabs, CO-OP ONLINE pill, settings. */

import { Fingerprint, Settings } from 'lucide-react';

export type MysteryTab = 'cases' | 'hypotheses' | 'notes' | 'profile';

const TABS: { id: MysteryTab; label: string }[] = [
  { id: 'cases', label: 'Cases' },
  { id: 'hypotheses', label: 'Hypotheses' },
  { id: 'notes', label: 'Notes' },
  { id: 'profile', label: 'Profile' },
];

export function TopNav({
  tab,
  setTab,
  online,
  caseTitle,
  lobbyHref,
}: {
  tab: MysteryTab;
  setTab: (t: MysteryTab) => void;
  online: boolean;
  caseTitle?: string;
  lobbyHref?: string;
}) {
  return (
    <header className="cm-topnav">
      <a
        href={lobbyHref ?? '/'}
        className="cm-logo"
        title="Back to lobby"
        aria-label="Back to lobby"
      >
        <span className="cm-logo-mark">
          <Fingerprint size={20} strokeWidth={1.8} />
        </span>
        <div>
          <div className="cm-font-display text-sm tracking-[0.18em] text-[var(--cm-gold)]">
            DETECTIVE DUO
          </div>
          <div className="cm-font-mono text-[0.6rem] tracking-[0.24em] text-[var(--cm-ink-dim)]">
            {caseTitle ? caseTitle.toUpperCase().slice(0, 26) : 'CASE FILES'}
          </div>
        </div>
      </a>

      <nav className="cm-tabs" aria-label="Mystery sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            className="cm-tab"
            data-active={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <span className="cm-pill">
        <span className="dot" />
        {online ? 'CO-OP ONLINE' : 'SOLO'}
      </span>
      <button className="cm-icon-btn" aria-label="Settings" title="Settings">
        <Settings size={17} />
      </button>
    </header>
  );
}
