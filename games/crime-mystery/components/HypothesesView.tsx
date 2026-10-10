'use client';

/* Hypotheses tab: interrogation room + the road to accusation. */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Gavel } from 'lucide-react';
import type { CaseFile } from '../../../lib/content/cases';
import { INTERROGATIONS } from '../qa';
import type { QA } from '../types';
import { Typewriter } from '../../../components/Typewriter';
import { sounds } from '../../../lib/sound';

export function HypothesesView({
  caseFile,
  focusSuspect,
  onAccuse,
}: {
  caseFile: CaseFile;
  focusSuspect: string | null;
  onAccuse: () => void;
}) {
  const [suspect, setSuspect] = useState<string>(
    focusSuspect ?? caseFile.suspects[0]?.name ?? '',
  );
  const [asked, setAsked] = useState<Record<string, number[]>>({});

  const effective = focusSuspect ?? suspect;
  const qa: QA[] = INTERROGATIONS[caseFile.id]?.[effective] ?? [];
  const s = caseFile.suspects.find((x) => x.name === effective);

  const pick = (name: string) => {
    sounds.paperShuffle();
    setSuspect(name);
  };

  const ask = (i: number) => {
    sounds.typewriterClick();
    setAsked((prev) => ({ ...prev, [effective]: [...(prev[effective] ?? []), i] }));
  };

  return (
    <div className="cm-section">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="cm-font-display text-xl tracking-[0.14em] text-[var(--cm-gold)]">
            HYPOTHESES
          </h2>
          <p className="cm-font-mono mt-1 text-xs text-[var(--cm-ink-dim)]">
            Press each suspect. Watch for the tells.
          </p>
        </div>
        <button className="cm-btn-red" onClick={onAccuse}>
          <Gavel size={15} /> MAKE THE ACCUSATION
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[250px_1fr]">
        <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
          {caseFile.suspects.map((sp) => (
            <button
              key={sp.name}
              onClick={() => pick(sp.name)}
              className={`flex shrink-0 items-center gap-3 rounded-xl border p-2.5 text-left transition-all lg:w-full ${
                effective === sp.name
                  ? 'border-[var(--cm-gold)] bg-[rgba(217,164,65,0.1)]'
                  : 'border-[var(--cm-border)] hover:border-[var(--cm-gold)]'
              }`}
            >
              {sp.portrait && (
                <img
                  src={sp.portrait}
                  alt={sp.name}
                  className="h-12 w-12 rounded-lg object-cover object-top"
                  style={{ filter: 'grayscale(1) contrast(1.05)' }}
                />
              )}
              <div className="min-w-0">
                <div className="cm-font-display truncate text-[0.85rem]">{sp.name}</div>
                <div className="cm-font-mono truncate text-[0.6rem] tracking-[0.12em] text-[var(--cm-ink-dim)]">
                  {sp.descriptor ?? ''}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="cm-panel">
          {s && (
            <>
              <div className="mb-1 flex items-center justify-between gap-2">
                <h3 className="cm-font-display text-base tracking-[0.1em]">
                  INTERROGATION — {s.name.toUpperCase()}
                </h3>
                <span className="cm-font-mono text-[0.62rem] tracking-[0.2em] text-[var(--cm-red)]">
                  ● RECORDING
                </span>
              </div>

              <div className="cm-dossier">
                <div className="cm-dossier-box">
                  <span className="k text-[var(--cm-red)]">MOTIVE</span>
                  {s.motive}
                </div>
                <div className="cm-dossier-box">
                  <span className="k text-[var(--cm-gold)]">ALIBI</span>
                  {s.alibi}
                </div>
                <div className="cm-dossier-box">
                  <span className="k text-[var(--cm-ink-dim)]">SECRET</span>
                  {s.secret}
                </div>
              </div>

              <div className="space-y-3">
                {qa.map((pair, i) => {
                  const isAsked = (asked[effective] ?? []).includes(i);
                  return (
                    <div key={i} className="cm-qa-card">
                      <button className="cm-qa-q" onClick={() => ask(i)}>
                        ❝ {pair.q}
                      </button>
                      {isAsked && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="cm-qa-a"
                        >
                          <Typewriter text={pair.a} as="p" animate speed={14} />
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
