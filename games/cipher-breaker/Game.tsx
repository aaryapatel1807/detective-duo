'use client';

/* Cipher Breaker — decode intercepted Caesar / substitution messages.
 * Every solved cipher grants ONE hint token (shared.hintTokens) that the
 * Crime Mystery reads as evidence. First solver per cipher gets the XP.
 * State: room.shared.games['cipher-breaker'] (see types.ts).
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameProps } from '../types';
import type { CipherBreakerShared } from './types';
import {
  checkAnswer,
  evidenceTokenCount,
  grantToken,
  type HintToken,
} from './logic';
import { BREAKER_CIPHERS, getBreakerCipher } from './content';
import { awardXP, syncXpToRoom, XP_AWARDS } from '../../lib/xp';
import { sounds } from '../../lib/sound';
import { GlassCard } from '../../components/GlassCard';
import { ManilaFolder, Polaroid } from '../../components/props';
import '../ui-kit/kit.css';
import { GameButton, ScoreHUD, DifficultyBadge, SectionTitle } from '../ui-kit';

const SLUG = 'cipher-breaker';

const DIFFICULTY_LEVEL: Record<string, 'easy' | 'medium' | 'hard'> = {
  easy: 'easy',
  medium: 'medium',
  hard: 'hard',
};

function playerName(room: GameProps['room'], pid: string | null | undefined): string {
  if (!pid) return '—';
  if (pid === room.me.id) return 'You';
  return room.peer?.name ?? 'Partner';
}

export default function CipherBreakerGame({ room }: GameProps) {
  const gs: CipherBreakerShared = room.shared?.games?.[SLUG] ?? {};
  const solvedBy = gs.solvedBy ?? {};
  const awardedRef = useRef<Set<string>>(new Set());

  const [openId, setOpenId] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [wrong, setWrong] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const tokens: HintToken[] = room.shared?.hintTokens ?? [];
  const evidence = evidenceTokenCount(tokens);
  const cipher = openId ? getBreakerCipher(openId) : undefined;
  const solvedCount = Object.keys(solvedBy).length;

  const write = (patch: Partial<CipherBreakerShared>) =>
    room.setShared({ games: { [SLUG]: patch } });

  const openCipher = (id: string) => {
    sounds.paperShuffle();
    setOpenId(id);
    setAnswer('');
    setWrong(false);
    setShowHint(false);
  };

  const submit = () => {
    if (!cipher || solvedBy[cipher.id]) return;
    if (checkAnswer(cipher.solution, answer)) {
      sounds.stampThud();
      // mark solved (first solver wins the token)
      write({ solvedBy: { ...solvedBy, [cipher.id]: room.me.id } });
      // grant the hint token — arrays REPLACE on merge, so write the full list
      const current: HintToken[] = room.shared?.hintTokens ?? [];
      if (!current.some((t) => t.from === 'cipher-breaker' && t.text === `Hint token: ${cipher.keyword}`)) {
        room.setShared({ hintTokens: grantToken(current, cipher.keyword) });
      }
      // XP once per cipher for the solver
      if (!awardedRef.current.has(cipher.id)) {
        awardedRef.current.add(cipher.id);
        awardXP(XP_AWARDS.cipherSolved);
        syncXpToRoom(room.setShared, room.me.id, room.me.name);
      }
    } else {
      setWrong(true);
      sounds.typewriterClick();
    }
  };

  const reset = () => {
    awardedRef.current = new Set();
    write({ solvedBy: {} });
    setOpenId(null);
  };

  useEffect(() => {
    setWrong(false);
  }, [answer]);

  return (
    <div className="gk-root mx-auto max-w-2xl">
      <div className="mb-4 text-center">
        <SectionTitle eyebrow="Case file № 52 — Word & Code Duels" title="Cipher Breaker" />
        <p className="mt-1 text-sm text-[var(--ink-dim)]">
          Intercepted messages from the underworld. Decode them — each solved cipher plants an{' '}
          <span className="text-[var(--amber-glow)]">evidence token</span> for the Crime Mystery.
        </p>
        <div className="mx-auto mt-3 max-w-sm">
          <ScoreHUD
            leftLabel="Cracked"
            leftValue={solvedCount}
            rightLabel="Evidence tokens"
            rightValue={evidence}
            leftSub={`${BREAKER_CIPHERS.length} files`}
            record="none"
          />
        </div>
      </div>

      {!cipher ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {BREAKER_CIPHERS.map((c, i) => {
              const solver = solvedBy[c.id];
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <ManilaFolder onClick={() => openCipher(c.id)} className="h-full">
                    <div className="flex items-start justify-between gap-2">
                      <DifficultyBadge difficulty={DIFFICULTY_LEVEL[c.difficulty] ?? 'medium'} />
                      <span className="eyebrow">{c.type === 'caesar' ? 'Caesar' : 'Substitution'}</span>
                      {solver && <div className="text-lg">✅</div>}
                    </div>
                    <div className="type-heading mt-1 text-lg leading-snug">{c.title}</div>
                    <div className="mt-2 truncate font-type text-sm text-[var(--ink-dim)]">
                      {c.message.slice(0, 34)}…
                    </div>
                    {solver ? (
                      <div className="mt-2 text-xs text-[var(--ink-dim)]">
                        Cracked by {playerName(room, solver)} → 🎞️ {c.keyword}
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-[var(--amber-glow)]">▶ Open to decode</div>
                    )}
                  </ManilaFolder>
                </motion.div>
              );
            })}
          </div>
          {solvedCount > 0 && (
            <div className="mt-4 text-center">
              <GameButton variant="ghost" size="sm" onClick={reset}>
                Reset solved ciphers
              </GameButton>
            </div>
          )}
        </>
      ) : (
        <GlassCard className="p-6">
          <GameButton variant="ghost" size="sm" onClick={() => setOpenId(null)}>
            ← Back to intercepts
          </GameButton>
          <div className="mt-3 text-center">
            <SectionTitle
              eyebrow={`${cipher.difficulty.toUpperCase()} · ${cipher.type === 'caesar' ? 'Caesar cipher' : 'Substitution cipher'}`}
              title={cipher.title}
            />
          </div>

          <Polaroid caption="Intercepted message" className="mx-auto mt-4 max-w-md p-4">
            <div className="bg-[rgba(0,0,0,0.55)] p-4 font-type text-lg leading-relaxed tracking-wider text-[var(--amber-glow)]">
              {cipher.message}
            </div>
          </Polaroid>

          {solvedBy[cipher.id] ? (
            <div className="paper-strip mt-4 text-center">
              ✅ Decoded by {playerName(room, solvedBy[cipher.id])}
              <div className="mt-1 font-type text-sm">{cipher.solution}</div>
              <div className="mt-1 text-xs text-[var(--amber-glow)]">
                🎞️ Evidence token planted: {cipher.keyword}
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <label className="eyebrow">Your decoding</label>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={2}
                placeholder="TYPE THE PLAINTEXT HERE…"
                className="noir-input mt-1 w-full font-type tracking-wider"
              />
              {wrong && (
                <div className="mt-1 text-xs text-[var(--blood)]">
                  ❌ Not quite — the wires are crossed. Try again{!showHint && ', or take a hint below'}.
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <GameButton variant="primary" onClick={submit} disabled={!answer.trim()}>
                  🔓 Submit decoding
                </GameButton>
                <GameButton variant="ghost" onClick={() => { setShowHint(true); sounds.pinTap(); }}>
                  💡 {showHint ? 'Hide hint' : 'Need a hint?'}
                </GameButton>
              </div>
              {showHint && (
                <div className="paper-strip mt-3 text-center text-sm">💡 {cipher.hint}</div>
              )}
            </div>
          )}
        </GlassCard>
      )}
    </div>
  );
}
