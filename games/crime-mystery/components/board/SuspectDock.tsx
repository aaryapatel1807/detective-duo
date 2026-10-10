'use client';

/* Bottom dock: a row of suspect polaroids along the board's bottom edge.
 * Click one to expand its dossier; interrogate jumps to Hypotheses.
 * Desktop: popover above the dock. Mobile: bottom sheet. */

import { useState } from 'react';
import { MessageCircleQuestion, X } from 'lucide-react';
import type { Suspect } from '../../../../lib/content/cases';
import { sounds } from '../../../../lib/sound';

export function SuspectDock({
  suspects,
  onInterrogate,
}: {
  suspects: Suspect[];
  onInterrogate: (name: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const current = suspects.find((s) => s.name === expanded) ?? null;

  return (
    <>
      <div className="cm-dock" aria-label="Suspect lineup">
        {suspects.map((s) => (
          <button
            key={s.name}
            className={`cm-dock-card ${expanded === s.name ? 'open' : ''}`}
            onClick={() => {
              sounds.typewriterClick();
              setExpanded(expanded === s.name ? null : s.name);
            }}
            title={`View ${s.name}`}
          >
            <span className="cm-pin sm" />
            {s.portrait && <img src={s.portrait} alt={s.name} draggable={false} />}
            <span className="who">{s.name.toUpperCase()}</span>
          </button>
        ))}
      </div>

      {current && (
        <div
          className="cm-dock-backdrop lg:hidden"
          onClick={() => setExpanded(null)}
        >
          <div
            className="cm-dock-detail"
            role="dialog"
            aria-label={`${current.name} dossier`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="cm-sheet-x"
              onClick={() => setExpanded(null)}
              aria-label="Close dossier"
            >
              <X size={16} />
            </button>
            <DossierBody s={current} onInterrogate={onInterrogate} />
          </div>
        </div>
      )}

      {current && (
        <div className="cm-dock-popover max-lg:hidden" role="dialog" aria-label={`${current.name} dossier`}>
          <button
            className="cm-sheet-x"
            onClick={() => setExpanded(null)}
            aria-label="Close dossier"
          >
            <X size={16} />
          </button>
          <DossierBody s={current} onInterrogate={onInterrogate} />
        </div>
      )}
    </>
  );
}

function DossierBody({
  s,
  onInterrogate,
}: {
  s: Suspect;
  onInterrogate: (name: string) => void;
}) {
  return (
    <div className="cm-dossier-flex">
      {s.portrait && (
        <img src={s.portrait} alt={s.name} className="cm-dossier-photo" draggable={false} />
      )}
      <div className="min-w-0">
        <div className="cm-font-mono text-[0.62rem] tracking-[0.24em] text-[var(--cm-ink-dim)]">
          SUSPECT DOSSIER
        </div>
        <h3 className="cm-font-display mt-1 text-xl tracking-[0.06em] text-[var(--cm-ink)]">
          {s.name}
        </h3>
        {s.descriptor && (
          <div className="cm-font-mono mt-1 text-[0.64rem] tracking-[0.14em] text-[var(--cm-gold)]">
            {s.descriptor}
          </div>
        )}
        <dl className="cm-dossier-list">
          <div>
            <dt>MOTIVE</dt>
            <dd>{s.motive}</dd>
          </div>
          <div>
            <dt>ALIBI</dt>
            <dd>{s.alibi}</dd>
          </div>
        </dl>
        <button
          className="cm-btn-gold mt-3"
          onClick={() => {
            sounds.paperShuffle();
            onInterrogate(s.name);
          }}
        >
          <MessageCircleQuestion size={15} /> INTERROGATE
        </button>
      </div>
    </div>
  );
}
