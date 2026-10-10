'use client';

/* Case-file picker: noir file cards in escalating order. */

import { motion } from 'framer-motion';
import { CheckCircle2, Snowflake } from 'lucide-react';
import { ALL_CASES } from '../cases';
import type { CaseFile } from '../../../lib/content/cases';
import { sounds } from '../../../lib/sound';

const DIFF_STAMP: Record<CaseFile['difficulty'], { label: string; color: string }> = {
  easy: { label: 'ROUTINE', color: '#d9a441' },
  medium: { label: 'TRICKY', color: '#e0913d' },
  hard: { label: 'COLD-BLOODED', color: '#b3261e' },
};

export function CaseSelect({
  onStart,
  roomLog,
  peerName,
}: {
  onStart: (c: CaseFile) => void;
  roomLog: Record<string, 'solved' | 'failed'>;
  peerName: string | null;
}) {
  return (
    <div>
      <div className="px-[1.1rem] pt-[1.1rem] text-center">
        <h2 className="cm-font-display text-2xl tracking-[0.2em] text-[var(--cm-gold)]">
          THE CASE FILES
        </h2>
        <p className="cm-font-mono mt-2 text-xs text-[var(--cm-ink-dim)]">
          {peerName
            ? `You and ${peerName} get the same file — but different clues. Talk.`
            : 'No partner in the room — open a file to practice solo.'}
        </p>
      </div>

      <div className="cm-select-grid">
        {ALL_CASES.map((c, i) => {
          const stamp = DIFF_STAMP[c.difficulty];
          const result = roomLog[c.id];
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.4), type: 'spring', stiffness: 140, damping: 16 }}
            >
              <button
                className="cm-file-card"
                onClick={() => {
                  sounds.paperShuffle();
                  onStart(c);
                }}
              >
                <span className="cm-pin" style={{ top: -8 }} />
                {c.cover && (
                  <img
                    src={c.cover}
                    alt=""
                    loading="lazy"
                    className="mb-3 h-28 w-full rounded-lg object-cover"
                    style={{ filter: 'grayscale(1) contrast(1.05) brightness(0.85)' }}
                  />
                )}
                <div className="cm-font-mono text-[0.62rem] tracking-[0.28em] text-[var(--cm-ink-dim)]">
                  CASE FILE № {String(i + 1).padStart(2, '0')}
                </div>
                <h3>{c.title}</h3>
                <div className="flex items-center gap-2">
                  <span
                    className="cm-diff-stamp"
                    style={{ borderColor: stamp.color, color: stamp.color }}
                  >
                    {stamp.label}
                  </span>
                  <span className="cm-font-mono text-[0.64rem] text-[var(--cm-ink-dim)]">
                    {c.clues.length} clues · {c.suspects.length} suspects
                  </span>
                </div>
                {c.location && (
                  <div className="cm-font-mono mt-2 text-[0.66rem] tracking-[0.1em] text-[var(--cm-ink-dim)]">
                    📍 {c.location.toUpperCase()}
                  </div>
                )}
                {result && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs font-bold tracking-[0.2em]">
                    {result === 'solved' ? (
                      <span className="flex items-center gap-1.5 text-[var(--cm-green)]">
                        <CheckCircle2 size={14} /> CLOSED
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[var(--cm-red)]">
                        <Snowflake size={14} /> COLD
                      </span>
                    )}
                  </div>
                )}
                <div className="cm-font-mono mt-3 text-[0.68rem] tracking-[0.2em] text-[var(--cm-gold)]">
                  → OPEN THE FILE
                </div>
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
