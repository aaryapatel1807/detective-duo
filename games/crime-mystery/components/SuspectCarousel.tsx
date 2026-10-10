'use client';

/* Bottom suspect carousel: horizontal scroll-snap, arrow buttons,
 * grayscale portrait cards, stats line, VIEW PROFILE button. */

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CaseFile } from '../../../lib/content/cases';
import { sounds } from '../../../lib/sound';

export function SuspectCarousel({
  caseFile,
  onViewProfile,
  id,
}: {
  caseFile: CaseFile;
  onViewProfile: (name: string) => void;
  id?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    sounds.typewriterClick();
    el.scrollBy({ left: dir * 260, behavior: 'smooth' });
  };

  return (
    <div className="cm-carousel-wrap" id={id}>
      <div className="cm-carousel-head">
        <h3 className="cm-font-display text-sm tracking-[0.2em] text-[var(--cm-gold)]">
          SUSPECT LINEUP
        </h3>
        <div className="flex gap-2">
          <button
            className="cm-carousel-arrow"
            onClick={() => scrollBy(-1)}
            aria-label="Scroll suspects left"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="cm-carousel-arrow"
            onClick={() => scrollBy(1)}
            aria-label="Scroll suspects right"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div ref={trackRef} className="cm-carousel">
        {caseFile.suspects.map((s) => (
          <article key={s.name} className="cm-suspect-card">
            {s.portrait && (
              <img src={s.portrait} alt={s.name} loading="lazy" draggable={false} />
            )}
            <div className="cm-suspect-body">
              <div className="cm-suspect-name">{s.name}</div>
              <div className="cm-suspect-desc">{s.descriptor ?? 'PERSON OF INTEREST'}</div>
              <p className="cm-suspect-stats">
                <span className="text-[var(--cm-gold)]">MOTIVE — </span>
                {s.motive}
              </p>
              <button
                className="cm-btn-outline"
                onClick={() => {
                  sounds.paperShuffle();
                  onViewProfile(s.name);
                }}
              >
                VIEW PROFILE
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
