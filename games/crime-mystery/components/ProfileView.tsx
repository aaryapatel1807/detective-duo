'use client';

/* Profile tab: detective rank, XP, co-op wins, case log. */

import { Award, FileCheck2, HeartHandshake } from 'lucide-react';
import { ALL_CASES } from '../cases';
import { getCoopWins } from '../../../lib/lovenotes';
import { getXP, progressToNext } from '../../../lib/xp';

export function ProfileView({
  roomLog,
  meName,
}: {
  roomLog: Record<string, 'solved' | 'failed'>;
  meName: string;
}) {
  const xp = getXP();
  const prog = progressToNext(xp);
  const wins = getCoopWins();

  return (
    <div className="cm-section mx-auto max-w-3xl">
      <h2 className="cm-font-display text-xl tracking-[0.14em] text-[var(--cm-gold)]">
        DETECTIVE PROFILE
      </h2>
      <p className="cm-font-mono mt-1 text-xs text-[var(--cm-ink-dim)]">
        {meName.toUpperCase()} · PRECINCT FILE
      </p>

      <div className="cm-panel mt-4 text-center">
        <div className="cm-rank-ring">
          <Award size={44} className="text-[var(--cm-gold)]" />
        </div>
        <div className="cm-font-display mt-3 text-xl">{prog.rank.name}</div>
        <div className="cm-font-mono mt-1 text-xs text-[var(--cm-ink-dim)]">
          {xp} XP
          {prog.next ? ` · ${prog.into}/${prog.span} to ${prog.next.name}` : ' · MAX RANK'}
        </div>
        <div className="cm-progress-track mx-auto mt-3 max-w-sm">
          <div className="cm-progress-fill" style={{ width: `${Math.round(prog.pct * 100)}%` }} />
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 text-sm text-[var(--cm-ink-dim)]">
          <HeartHandshake size={15} className="text-[var(--cm-green)]" />
          <span>
            <span className="font-bold text-[var(--cm-green)]">{wins}</span> co-op case
            {wins === 1 ? '' : 's'} closed together
          </span>
        </div>
      </div>

      <div className="mt-6">
        <div className="cm-font-mono mb-2 text-xs tracking-[0.25em] text-[var(--cm-ink-dim)]">
          CASE LOG
        </div>
        <div className="space-y-2">
          {ALL_CASES.map((c, i) => {
            const r = roomLog[c.id];
            return (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-xl border border-[var(--cm-border)] bg-[var(--cm-panel)] px-4 py-2.5"
              >
                <span className="cm-font-mono text-[0.62rem] tracking-[0.2em] text-[var(--cm-ink-dim)]">
                  № {String(i + 1).padStart(2, '0')}
                </span>
                <span className="cm-font-display flex-1 text-[0.9rem]">{c.title}</span>
                {r ? (
                  r === 'solved' ? (
                    <span className="flex items-center gap-1 text-xs font-bold tracking-[0.18em] text-[var(--cm-green)]">
                      <FileCheck2 size={13} /> CLOSED
                    </span>
                  ) : (
                    <span className="text-xs font-bold tracking-[0.18em] text-[var(--cm-red)]">
                      COLD
                    </span>
                  )
                ) : (
                  <span className="cm-font-mono text-[0.62rem] tracking-[0.2em] text-[var(--cm-ink-dim)]">
                    OPEN
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
