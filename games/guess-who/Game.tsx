'use client';

/* Guess Who — suspect edition, versus.
 * Each detective secretly picks a suspect (LOCAL only), then alternates
 * yes/no attribute questions and eliminates suspects on their own board.
 * Synced: phase, turn, ready flags, winner. Secret picks and boards never sync.
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameProps } from '../types';
import type { GuessWhoShared } from './types';
import {
  ATTRIBUTE_KEYS,
  ATTRIBUTE_LABELS,
  SUSPECTS,
  getSuspect,
  type BooleanAttr,
} from './content';
import { firstTurn, isCorrectAccusation, remainingAfterAnswer } from './logic';
import { awardXP, syncXpToRoom, XP_AWARDS } from '../../lib/xp';
import { sounds } from '../../lib/sound';
import { GlassCard } from '../../components/GlassCard';
import '../ui-kit/kit.css';
import '../ui-kit/realism.css';
import './guess-who.css';
import { GameButton, TurnBanner, ProgressBar, ResultModal, SectionTitle } from '../ui-kit';

interface QLog {
  attr: BooleanAttr;
  value: boolean;
  asker: string;
}

export default function GuessWhoGame({ room }: GameProps) {
  const gs: GuessWhoShared = room.shared?.games?.['guess-who'] ?? {};
  const phase = gs.phase ?? 'setup';
  const turn = gs.turn ?? null;
  const ready = gs.ready ?? {};
  const winner = gs.winner ?? null;
  const resolved = gs.resolvedAccusation ?? null;

  const [myPick, setMyPick] = useState<string | null>(null);
  const [eliminated, setEliminated] = useState<string[]>([]);
  const [attr, setAttr] = useState<BooleanAttr>('hat');
  const [qlog, setQlog] = useState<QLog[]>([]);
  const [accusing, setAccusing] = useState<string | null>(null);
  const [practice, setPractice] = useState(false);
  const [botPick, setBotPick] = useState<string | null>(null);
  const awardedRef = useRef(false);

  const peerId = room.peer?.id ?? null;
  const myTurn = phase === 'play' && (turn === room.me.id || (practice && botPick !== null));
  const bothReady = practice ? myPick !== null : !!(ready[room.me.id] && peerId && ready[peerId]);

  const patch = (p: Partial<GuessWhoShared>) => room.setShared({ games: { 'guess-who': p } });

  // Start practice mode: the desk picks a random suspect, auto-answers.
  const startPractice = () => {
    const bot = SUSPECTS[Math.floor(Math.random() * SUSPECTS.length)];
    setBotPick(bot.id);
    setPractice(true);
    sounds.paperShuffle();
  };

  // Opponent auto-answers questions against their secret pick (truthful by construction).
  useEffect(() => {
    const unsubAsk = room.onAction('gw-ask', (payload: any) => {
      if (payload.from === room.me.id || !myPick) return;
      const suspect = getSuspect(myPick);
      if (!suspect) return;
      const value = suspect.attrs[payload.attr as BooleanAttr];
      room.send('gw-answer', { attr: payload.attr, value, from: room.me.id, to: payload.from });
    });
    return unsubAsk;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myPick, room.me.id]);

  // Questioner receives the answer and prunes their board.
  useEffect(() => {
    const unsubAns = room.onAction('gw-answer', (payload: any) => {
      if (payload.to !== room.me.id) return;
      sounds.pinTap();
      const a = payload.attr as BooleanAttr;
      setEliminated((prev) => {
        const remaining = SUSPECTS.map((s) => s.id).filter((id) => !prev.includes(id));
        const kept = new Set(remainingAfterAnswer(remaining, SUSPECTS, a, payload.value));
        return SUSPECTS.map((s) => s.id).filter((id) => !kept.has(id));
      });
      setQlog((l) => [...l, { attr: a, value: payload.value, asker: room.me.id }]);
      // pass the turn to the opponent
      patch({ turn: peerId ?? room.me.id });
    });
    return unsubAns;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerId]);

  // The non-accuser judges the accusation against their secret pick.
  useEffect(() => {
    const unsubAcc = room.onAction('gw-accuse', (payload: any) => {
      const secret = practice ? botPick : myPick;
      if (payload.accuserId === room.me.id || !secret) return;
      const correct = isCorrectAccusation(payload.suspectId, secret);
      patch({
        phase: 'over',
        winner: correct ? payload.accuserId : room.me.id,
        resolvedAccusation: { accuserId: payload.accuserId, suspectId: payload.suspectId, correct },
      });
      sounds.stampThud();
    });
    return unsubAcc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myPick, botPick, practice]);

  // XP for the winner, once.
  useEffect(() => {
    if (phase === 'over' && winner === room.me.id && !awardedRef.current) {
      awardedRef.current = true;
      awardXP(XP_AWARDS.duoWin);
      syncXpToRoom(room.setShared, room.me.id, room.me.name);
      sounds.xpTick();
    }
  }, [phase, winner, room]);

  const confirmPick = (id: string) => {
    setMyPick(id);
    sounds.pinTap();
    if (practice) {
      patch({ phase: 'play', turn: room.me.id });
      return;
    }
    if (!peerId) return;
    patch({ ready: { ...ready, [room.me.id]: true } });
    if (ready[peerId]) {
      patch({ phase: 'play', turn: firstTurn([room.me.id, peerId]) });
    }
  };

  const ask = () => {
    if (!myTurn || !peerId) return;
    sounds.typewriterClick();
    if (practice && botPick) {
      const suspect = getSuspect(botPick);
      if (!suspect) return;
      const value = suspect.attrs[attr];
      setEliminated((prev) => {
        const remaining = SUSPECTS.map((s) => s.id).filter((id) => !prev.includes(id));
        const kept = new Set(remainingAfterAnswer(remaining, SUSPECTS, attr, value));
        return SUSPECTS.map((s) => s.id).filter((id) => !kept.has(id));
      });
      setQlog((l) => [...l, { attr, value, asker: room.me.id }]);
      return;
    }
    room.send('gw-ask', { attr, from: room.me.id });
  };

  const accuse = (suspectId: string) => {
    if (!myTurn) return;
    sounds.stampThud();
    setAccusing(null);
    if (practice && botPick) {
      const correct = isCorrectAccusation(suspectId, botPick);
      patch({ phase: 'over', winner: correct ? room.me.id : 'desk', resolvedAccusation: { accuserId: room.me.id, suspectId, correct } });
      return;
    }
    room.send('gw-accuse', { suspectId, accuserId: room.me.id });
  };

  const reset = () => {
    awardedRef.current = false;
    setMyPick(null);
    setEliminated([]);
    setQlog([]);
    setAccusing(null);
    setPractice(false);
    setBotPick(null);
    patch({ phase: 'setup', turn: null, ready: {}, winner: null, resolvedAccusation: null });
    sounds.paperShuffle();
  };

  const remaining = SUSPECTS.filter((s) => !eliminated.includes(s.id));
  const myPickSuspect = myPick ? getSuspect(myPick) : undefined;

  return (
    <div className="gk-root mx-auto max-w-3xl">
      <div className="mb-5 text-center">
        <SectionTitle eyebrow="Lineup · 12 suspects" title="Guess Who: Suspects" />
        {phase === 'play' && (
          <div className="mx-auto mt-3 max-w-md">
            <TurnBanner
              isYourTurn={myTurn}
              yourText="🎯 Your move, detective"
              theirText={practice ? '⏳ The desk is thinking' : `⏳ Waiting on ${room.peer?.name ?? 'partner'}`}
            />
            <div className="mt-2">
              <ProgressBar label="Suspects standing" value={remaining.length} max={SUSPECTS.length} />
            </div>
          </div>
        )}
      </div>

      {/* ---- setup: pick your secret suspect ---- */}
      {phase === 'setup' && !myPick && (
        <div className="gw-board gw-board--red">
          <div className="gw-board__label">Choose your secret suspect</div>
          <p className="mb-4 text-center text-xs text-white/80">
            Only you will know. Your partner asks questions to find them.
          </p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {SUSPECTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => confirmPick(s.id)}
                className="gw-tile"
                aria-label={`Pick ${s.name} as your secret suspect`}
              >
                <span className="gw-tile__inner">
                  <span className="gw-tile__face gw-tile__face--front">
                    <span className="gw-tile__mug" aria-hidden>{s.face}</span>
                    <span className="gw-tile__name">{s.name}</span>
                  </span>
                  <span className="gw-tile__face gw-tile__face--back" aria-hidden />
                </span>
              </button>
            ))}
          </div>
          {!peerId && !practice && (
            <div className="mt-4 text-center">
              <GameButton variant="ghost" onClick={startPractice}>
                🎲 Practice vs the desk (solo)
              </GameButton>
            </div>
          )}
        </div>
      )}

      {/* ---- waiting for partner to pick ---- */}
      {phase === 'setup' && myPick && !bothReady && (
        <GlassCard className="p-8 text-center">
          <div className="text-5xl">{myPickSuspect?.face}</div>
          <div className="type-heading mt-2 text-xl">{myPickSuspect?.name}</div>
          <p className="mt-2 text-sm text-[var(--gk-ink-dim)]">Locked in. Your secret is safe with the desk.</p>
          <p className="mt-4 text-xs italic text-[var(--gk-ink-faint)]">Waiting for your partner to pick their suspect…</p>
        </GlassCard>
      )}

      {/* ---- play ---- */}
      {phase === 'play' && (
        <div className="space-y-4">
          <GlassCard className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow">Interrogate:</span>
              <select
                value={attr}
                onChange={(e) => setAttr(e.target.value as BooleanAttr)}
                className="noir-input !w-auto"
                disabled={!myTurn}
              >
                {ATTRIBUTE_KEYS.map((k) => (
                  <option key={k} value={k}>Is your suspect {ATTRIBUTE_LABELS[k]}?</option>
                ))}
              </select>
              <GameButton variant="primary" onClick={ask} disabled={!myTurn}>
                Ask ❓
              </GameButton>
              <span className="ml-auto text-xs text-[var(--gk-ink-faint)]">
                My secret: <b className="text-[var(--gk-ink)]">{myPickSuspect?.name ?? '—'}</b>
              </span>
            </div>
            {qlog.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {qlog.slice(-4).map((q, i) => (
                  <span key={i} className="rounded-full border border-[var(--glass-border)] px-2 py-1">
                    {ATTRIBUTE_LABELS[q.attr]} → <b className={q.value ? 'text-[#7ee787]' : 'text-[var(--blood-bright)]'}>{q.value ? 'YES' : 'NO'}</b>
                  </span>
                ))}
              </div>
            )}
          </GlassCard>

          <div className="gw-board">
            <div className="gw-board__label">Your board — tap to flip down the innocent</div>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {SUSPECTS.map((s) => {
                const out = eliminated.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      if (out) {
                        setEliminated((e) => e.filter((id) => id !== s.id));
                      } else {
                        sounds.pinTap();
                        setEliminated((e) => [...e, s.id]);
                      }
                    }}
                    className={`gw-tile ${out ? 'gw-tile--down' : ''}`}
                    aria-label={out ? `Bring back ${s.name}` : `Eliminate ${s.name}`}
                    aria-pressed={out}
                  >
                    <span className="gw-tile__inner">
                      <span className="gw-tile__face gw-tile__face--front">
                        <span className="gw-tile__mug" aria-hidden>{s.face}</span>
                        <span className="gw-tile__name">{s.name}</span>
                      </span>
                      <span className="gw-tile__face gw-tile__face--back" aria-hidden />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <GlassCard className="p-5 text-center">
            {accusing ? (
              <div>
                <div className="type-heading text-lg">
                  Accuse {getSuspect(accusing)?.name}?
                </div>
                <p className="mt-1 text-xs text-[var(--blood-bright)]">
                  ⚠ Wrong accusation loses the case on the spot.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-3">
                  <GameButton variant="danger" onClick={() => accuse(accusing)}>⚖️ Make the accusation</GameButton>
                  <GameButton variant="ghost" onClick={() => setAccusing(null)}>Keep digging</GameButton>
                </div>
              </div>
            ) : (
              <GameButton variant="primary" onClick={() => setAccusing(remaining[0]?.id ?? SUSPECTS[0].id)} disabled={!myTurn}>
                ⚖️ Make an accusation…
              </GameButton>
            )}
            {accusing === null && (
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {remaining.slice(0, 6).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => myTurn && setAccusing(s.id)}
                    className="gw-chip"
                  >
                    <span aria-hidden>{s.face}</span> {s.name}
                  </button>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* ---- game over ---- */}
      {phase === 'over' && (
        <div className="gk-modal-scope">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard className="p-8 text-center">
              {resolved && (
                <>
                  <p className="mt-2 text-sm text-[var(--gk-ink-dim)]">
                    {resolved.correct
                      ? `${resolved.accuserId === room.me.id ? 'You named' : 'Your partner named'} ${getSuspect(resolved.suspectId)?.name} — and the cuffs are on.`
                      : `${resolved.accuserId === room.me.id ? 'You accused' : 'Your partner accused'} ${getSuspect(resolved.suspectId)?.name} — an innocent. Case blown.`}
                  </p>
                </>
              )}
              <p className="mt-3 text-sm">
                Winner: <b className="text-[var(--amber-glow)]">{winner === room.me.id ? 'YOU' : winner === 'desk' ? 'The Desk' : room.peer?.name ?? 'Partner'}</b>
                {' · '} +{XP_AWARDS.duoWin} XP
              </p>
              <div className="mt-5">
                <GameButton variant="primary" onClick={reset}>🔄 New lineup</GameButton>
              </div>
            </GlassCard>
          </motion.div>
          <ResultModal
            open
            eyebrow="Lineup closed"
            headline={resolved ? (resolved.correct ? 'Bullseye' : 'Wrong accusation') : 'Case closed'}
            stat={`Winner: ${winner === room.me.id ? 'YOU' : winner === 'desk' ? 'The Desk' : room.peer?.name ?? 'Partner'}`}
            tone={winner === room.me.id ? 'win' : 'lose'}
            primaryLabel="🔄 New lineup"
            onPrimary={reset}
          />
        </div>
      )}
    </div>
  );
}
