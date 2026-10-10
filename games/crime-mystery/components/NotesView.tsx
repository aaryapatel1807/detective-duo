'use client';

/* Notes tab: Field Intel tokens + the shared detective notepad. */

import { motion } from 'framer-motion';
import { KeyRound } from 'lucide-react';
import type { GameProps } from '../../types';
import type { CaseFile } from '../../../lib/content/cases';
import { hintsAvailable, spendHint } from '../logic';
import type { HintToken, MysteryShared } from '../types';
import { sounds } from '../../../lib/sound';

export function NotesView({
  room,
  gs,
  caseFile,
  patch,
}: {
  room: GameProps['room'];
  gs: MysteryShared;
  caseFile: CaseFile;
  patch: (p: MysteryShared) => void;
}) {
  const namespaced = gs.hintTokens ?? [];
  const legacy = (room.shared?.hintTokens as HintToken[] | undefined) ?? [];
  const seen = new Set<string>();
  const tokens: HintToken[] = [...namespaced, ...legacy].filter(
    (t) => t && !seen.has(t.text) && (seen.add(t.text), true),
  );
  const used = gs.hintsUsed ?? 0;
  const available = hintsAvailable(tokens.length, used);
  const nudges = gs.nudgesShown ?? [];

  const spend = () => {
    if (available <= 0) return;
    const y = spendHint(caseFile.id, used);
    sounds.stampThud();
    if (y.kind === 'bonus') {
      const pins = gs.pins ?? {};
      patch({
        hintsUsed: used + 1,
        bonusRevealed: true,
        pins: { ...pins, [y.clue.id]: { x: 70, y: 55 } },
      });
    } else if (y.kind === 'nudge') {
      patch({ hintsUsed: used + 1, nudgesShown: [...nudges, y.text] });
    } else {
      patch({ hintsUsed: used + 1 });
    }
  };

  return (
    <div className="cm-section mx-auto max-w-3xl">
      <h2 className="cm-font-display text-xl tracking-[0.14em] text-[var(--cm-gold)]">
        FIELD NOTES
      </h2>
      <p className="cm-font-mono mt-1 text-xs text-[var(--cm-ink-dim)]">
        Intel from your partner&apos;s cipher work — and the shared notepad.
      </p>

      {/* intel */}
      <motion.div
        initial={{ rotate: -1, y: 14 }}
        animate={{ rotate: 0, y: 0 }}
        className="cm-panel mt-4 text-center"
      >
        <div className="cm-font-mono mx-auto mb-3 flex h-12 w-28 items-center justify-center rounded-b-xl border-2 border-t-0 border-[var(--cm-gold)] bg-[rgba(217,164,65,0.08)] text-[0.66rem] tracking-[0.25em] text-[var(--cm-gold)]">
          ✉ INTEL
        </div>
        <div className="cm-font-display text-lg tracking-[0.12em]">FIELD INTEL</div>
        <p className="mt-2 text-sm text-[var(--cm-ink-dim)]">
          Decoded intercepts from your partner&apos;s cipher work. Spend a token to shake
          something loose — the first one cracks open a sealed exhibit.
        </p>
        <div className="cm-font-mono mt-4 text-sm">
          Tokens available:{' '}
          <span className="text-lg font-bold text-[var(--cm-gold)]">{available}</span>
          <span className="text-[var(--cm-ink-dim)]"> / {tokens.length} earned</span>
        </div>
        <div className="mx-auto mt-4 max-w-xs">
          <button onClick={spend} disabled={available <= 0} className="cm-btn-gold">
            <KeyRound size={14} /> SPEND A TOKEN
          </button>
        </div>
        {available <= 0 && tokens.length === 0 && (
          <p className="cm-font-mono mx-auto mt-4 max-w-md text-xs leading-relaxed text-[var(--cm-ink-dim)]">
            No intel yet. Your partner earns Field Intel tokens by solving ciphers in{' '}
            <span className="text-[var(--cm-gold)]">Cipher Breaker</span> — each cracked
            code drops one here.
          </p>
        )}
      </motion.div>

      {tokens.length > 0 && (
        <div className="mt-4 space-y-2">
          {tokens.map((t, i) => (
            <div key={i} className={`cm-token ${i < used ? 'spent' : 'fresh'}`}>
              <span className="cm-font-mono text-xs text-[var(--cm-ink-dim)]">
                FROM {t.from.toUpperCase()} {i < used ? '· SPENT' : '· SEALED'}
              </span>
              <p className="mt-1">{t.text}</p>
            </div>
          ))}
        </div>
      )}

      {nudges.length > 0 && (
        <div className="mt-4">
          <div className="cm-font-mono text-xs tracking-[0.25em] text-[var(--cm-ink-dim)]">
            STREET NUDGES
          </div>
          {nudges.map((n, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              className="mt-2 border-l-4 border-[var(--cm-gold)] bg-black/30 p-3 text-sm"
            >
              {n}
            </motion.div>
          ))}
        </div>
      )}

      {/* shared notepad */}
      <div className="mt-6">
        <div className="cm-font-mono mb-2 text-xs tracking-[0.25em] text-[var(--cm-ink-dim)]">
          DETECTIVE NOTEPAD — SHARED
        </div>
        <textarea
          className="cm-notepad"
          value={gs.notepad ?? ''}
          onChange={(e) => patch({ notepad: e.target.value })}
          placeholder="Theories, timelines, things the captain must never see…"
        />
      </div>
    </div>
  );
}
