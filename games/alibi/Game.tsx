'use client';

/* Alibi — versus, best of 3 rounds.
 * A crime card is drawn; the criminal invents an alibi (typed), the
 * interrogator cross-examines over the local wire — including TIMED questions
 * (45s on the clock for the criminal to answer) — then judges BUSTED or CLEAN.
 * Roles swap each round. Shared: phase, round, criminalId, crimeId, alibi,
 * timedQ, verdict, scores, winner.
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameProps } from '../types';
import type { AlibiShared, Verdict } from './types';
import { drawCrime, getCrimeCard } from './content';
import {
  TOTAL_ROUNDS,
  TIMED_QUESTION_SECONDS,
  isLastRound,
  matchWinner,
  scoreForVerdict,
  timedRemaining,
  validAlibi,
} from './logic';
import ChatBox from './ChatBox';
import { awardXP, syncXpToRoom, XP_AWARDS } from '../../lib/xp';
import { sounds } from '../../lib/sound';
import { GlassCard } from '../../components/GlassCard';

export default function AlibiGame({ room }: GameProps) {
  const gs: AlibiShared = room.shared?.games?.['alibi'] ?? {};
  const phase = gs.phase ?? 'lobby';
  const round = gs.round ?? 0;
  const criminalId = gs.criminalId ?? null;
  const crimeId = gs.crimeId ?? null;
  const usedCrimes = gs.usedCrimes ?? [];
  const alibi = gs.alibi ?? '';
  const timedQ = gs.timedQ ?? null;
  const verdict = gs.verdict ?? null;
  const scores = gs.scores ?? {};
  const winner = gs.winner ?? null;

  const isCriminal = criminalId === room.me.id;
  const isInterrogator = criminalId !== null && !isCriminal;
  const peerId = room.peer?.id ?? null;
  const crime = crimeId ? getCrimeCard(crimeId) : undefined;

  const [alibiDraft, setAlibiDraft] = useState('');
  const [timedDraft, setTimedDraft] = useState('');
  const [now, setNow] = useState(Date.now());
  const awardedRef = useRef(false);

  const patch = (p: Partial<AlibiShared>) => room.setShared({ games: { alibi: p } });

  // Ticking clock for timed questions.
  useEffect(() => {
    if (phase !== 'cross' || !timedQ) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [phase, timedQ]);

  useEffect(() => {
    if (phase === 'over' && winner === room.me.id && !awardedRef.current) {
      awardedRef.current = true;
      awardXP(XP_AWARDS.duoWin);
      syncXpToRoom(room.setShared, room.me.id, room.me.name);
      sounds.xpTick();
    }
  }, [phase, winner, room]);

  const startMatch = () => {
    const card = drawCrime([]);
    sounds.paperShuffle();
    setAlibiDraft('');
    patch({
      phase: 'alibiwriting', round: 1, criminalId: room.me.id,
      crimeId: card.id, usedCrimes: [card.id], alibi: '',
      timedQ: null, verdict: null, scores: {}, winner: null,
    });
  };

  const submitAlibi = () => {
    if (!validAlibi(alibiDraft)) return;
    sounds.stampThud();
    patch({ alibi: alibiDraft.trim(), phase: 'cross' });
  };

  const askTimed = () => {
    const text = timedDraft.trim();
    if (!text || !isInterrogator) return;
    sounds.pinTap();
    setTimedDraft('');
    const askedAt = Date.now();
    patch({ timedQ: { text, askedAt, deadline: askedAt + TIMED_QUESTION_SECONDS * 1000, from: room.me.id } });
    room.send('alibi-chat', { from: room.me.id, name: room.me.name, text: `⏱️ TIMED (${TIMED_QUESTION_SECONDS}s): ${text}`, timed: true });
  };

  const judge = (v: Verdict) => {
    sounds.stampThud();
    const nextScores = scoreForVerdict(scores, room.me.id, criminalId ?? '', v);
    patch({ verdict: v, scores: nextScores, phase: 'roundEnd', timedQ: null });
  };

  const nextRound = () => {
    const card = drawCrime(usedCrimes);
    sounds.paperShuffle();
    setAlibiDraft('');
    if (isLastRound(round)) {
      patch({ phase: 'over', winner: matchWinner(scores) });
    } else {
      patch({
        phase: 'alibiwriting', round: round + 1, criminalId: peerId,
        crimeId: card.id, usedCrimes: [...usedCrimes, card.id],
        alibi: '', timedQ: null, verdict: null,
      });
    }
  };

  const reset = () => {
    awardedRef.current = false;
    setAlibiDraft('');
    patch({ phase: 'lobby', round: 0, criminalId: null, crimeId: null, alibi: '', timedQ: null, verdict: null, scores: {}, winner: null });
  };

  const scoreLine = (id: string) => `${id === room.me.id ? 'You' : room.peer?.name ?? 'Partner'}: ${scores[id] ?? 0}`;
  const remaining = timedQ ? Math.ceil(timedRemaining(timedQ.deadline, now) / 1000) : 0;

  const crimeCard = crime && (
    <div className="manila-folder relative p-6">
      <div className="brass-pin absolute -top-2 left-6" />
      <div className="eyebrow">🚨 Crime report · round {round}/{TOTAL_ROUNDS}</div>
      <div className="type-heading mt-1 text-xl">{crime.crime}</div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-[var(--glass-border)] px-3 py-1">🕰️ {crime.time}</span>
        <span className="rounded-full border border-[var(--glass-border)] px-3 py-1">📍 {crime.place}</span>
      </div>
      <p className="mt-2 text-sm italic text-[var(--ink-dim)]">{crime.detail}</p>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 text-center">
        <div className="eyebrow">Suspect room · best of {TOTAL_ROUNDS}</div>
        <h2 className="type-heading mt-1 text-2xl">Alibi</h2>
        {round > 0 && phase !== 'over' && phase !== 'lobby' && (
          <div className="mt-2 text-xs text-[var(--ink-dim)]">
            {scoreLine(room.me.id)} — {peerId ? scoreLine(peerId) : ''}
            {' · '} Suspect: <b className="text-[var(--blood-bright)]">{isCriminal ? 'YOU' : room.peer?.name ?? '—'}</b>
          </div>
        )}
      </div>

      {/* ---- lobby ---- */}
      {phase === 'lobby' && (
        <GlassCard className="p-8 text-center">
          <p className="mx-auto max-w-md text-sm text-[var(--ink-dim)]">
            A crime card is drawn. The suspect invents an <b>alibi</b> — then the interrogator
            cross-examines over the wire, firing <b>timed questions</b> (45 seconds to answer).
            Finally: <b className="text-[var(--blood-bright)]">BUSTED</b> or <b className="text-[#7ee787]">CLEAN</b>.
            Roles swap every round — best of {TOTAL_ROUNDS} wins.
          </p>
          <button onClick={startMatch} className="noir-btn mt-6" disabled={!peerId}>
            🚨 Draw a crime & start
          </button>
          {!peerId && <p className="mt-3 text-xs italic text-[var(--ink-faint)]">Waiting for your partner…</p>}
        </GlassCard>
      )}

      {/* ---- criminal writes alibi ---- */}
      {phase === 'alibiwriting' && (
        <div className="space-y-4">
          {crimeCard}
          {isCriminal ? (
            <GlassCard className="p-6">
              <div className="type-heading mb-2 text-center text-lg">Invent your alibi, suspect</div>
              <p className="mb-3 text-center text-xs text-[var(--ink-dim)]">
                Where were you at {crime?.time}? Make it airtight — the interrogator is already suspicious.
              </p>
              <textarea
                value={alibiDraft}
                onChange={(e) => setAlibiDraft(e.target.value)}
                rows={5}
                maxLength={1200}
                placeholder="I was at…"
                className="noir-input w-full"
              />
              <button onClick={submitAlibi} className="noir-btn mt-3 w-full" disabled={!validAlibi(alibiDraft)}>
                📨 Submit alibi ({alibiDraft.trim().length}/{20} min chars)
              </button>
            </GlassCard>
          ) : (
            <GlassCard className="p-8 text-center">
              <div className="type-heading text-lg">The suspect is writing…</div>
              <p className="mt-2 text-sm text-[var(--ink-dim)]">Prepare your questions, interrogator. Liars hate specifics.</p>
            </GlassCard>
          )}
        </div>
      )}

      {/* ---- cross-examination ---- */}
      {phase === 'cross' && (
        <div className="space-y-4">
          {crimeCard}
          <div className="rounded-2xl border border-[var(--amber-glow)] bg-[rgba(232,163,61,0.06)] p-5">
            <div className="eyebrow">The suspect's alibi — on the record</div>
            <p className="mt-2 text-sm leading-relaxed">“{alibi}”</p>
          </div>

          {timedQ && remaining > 0 && (
            <div className="rounded-2xl border border-[var(--blood-bright)] bg-[rgba(211,58,44,0.1)] p-4 text-center">
              <div className="eyebrow !text-[var(--blood-bright)]">⏱️ Timed question on the clock</div>
              <div className="type-heading mt-1 text-3xl text-[var(--blood-bright)]">{remaining}s</div>
              <p className="mt-1 text-sm">“{timedQ.text}”</p>
            </div>
          )}
          {timedQ && remaining === 0 && (
            <div className="rounded-2xl border border-[var(--glass-border)] p-4 text-center text-sm text-[var(--ink-dim)]">
              ⏱️ Time's up on: “{timedQ.text}” — {isInterrogator ? 'note the hesitation, interrogator.' : 'the interrogator noticed that.'}
            </div>
          )}

          <ChatBox room={room} label="Cross-examination wire" />

          {isInterrogator && (
            <GlassCard className="p-5">
              <div className="eyebrow mb-2">⏱️ Fire a timed question ({TIMED_QUESTION_SECONDS}s to answer)</div>
              <div className="flex gap-2">
                <input
                  value={timedDraft}
                  onChange={(e) => setTimedDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && askTimed()}
                  placeholder="e.g. Who exactly was with you at the bar?"
                  className="noir-input flex-1"
                  maxLength={200}
                />
                <button onClick={askTimed} className="noir-btn" disabled={!timedDraft.trim()}>
                  ⏱️ Ask
                </button>
              </div>
              <button onClick={() => { sounds.stampThud(); patch({ phase: 'judgment', timedQ: null }); }} className="noir-btn-ghost mt-4 w-full">
                ⚖️ Enough — deliver the verdict
              </button>
            </GlassCard>
          )}
          {isCriminal && (
            <p className="text-center text-xs italic text-[var(--ink-faint)]">
              Hold your story together, suspect. The verdict is coming.
            </p>
          )}
        </div>
      )}

      {/* ---- judgment ---- */}
      {phase === 'judgment' && (
        <div className="space-y-4">
          {crimeCard}
          <GlassCard className="p-8 text-center">
            <div className="type-heading text-xl">The interrogator deliberates…</div>
            {isInterrogator ? (
              <div className="mt-6 flex justify-center gap-4">
                <button onClick={() => judge('busted')} className="noir-btn !border-[var(--blood-bright)] !text-[var(--blood-bright)]">
                  🚨 BUSTED
                </button>
                <button onClick={() => judge('clean')} className="noir-btn !border-[#7ee787] !text-[#7ee787]">
                  ✅ CLEAN
                </button>
              </div>
            ) : (
              <p className="mt-4 text-sm italic text-[var(--ink-dim)]">Sweat, suspect. The gavel is falling.</p>
            )}
          </GlassCard>
        </div>
      )}

      {/* ---- round verdict ---- */}
      {phase === 'roundEnd' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className="p-8 text-center">
            <div className="wax-seal mx-auto mb-3" />
            <div className={`type-heading text-2xl ${verdict === 'busted' ? 'text-[var(--blood-bright)]' : 'text-[#7ee787]'}`}>
              {verdict === 'busted' ? '🚨 BUSTED!' : '✅ CLEAN — WALKS FREE'}
            </div>
            <p className="mt-3 text-sm text-[var(--ink-dim)]">
              {verdict === 'busted'
                ? 'The alibi cracked under pressure. Point to the interrogator.'
                : 'The story held. Point to the suspect.'}
            </p>
            <p className="mt-2 text-sm">{scoreLine(room.me.id)} — {peerId ? scoreLine(peerId) : ''}</p>
            <button onClick={nextRound} className="noir-btn mt-5">
              {isLastRound(round) ? '🏁 Final verdict' : '➡️ Next round — roles swap'}
            </button>
          </GlassCard>
        </motion.div>
      )}

      {/* ---- match over ---- */}
      {phase === 'over' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className="p-8 text-center">
            <div className="wax-seal mx-auto mb-3" />
            <div className="type-heading text-xl text-[var(--amber-glow)]">📁 CASE CLOSED</div>
            <p className="mt-2 text-sm text-[var(--ink-dim)]">{scoreLine(room.me.id)} — {peerId ? scoreLine(peerId) : ''}</p>
            <p className="mt-3 text-lg">
              Winner: <b className="text-[var(--amber-glow)]">
                {winner === null ? 'A perfect tie — both walked.' : winner === room.me.id ? 'YOU' : room.peer?.name ?? 'Partner'}
              </b>
              {' · '} +{XP_AWARDS.duoWin} XP
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button onClick={startMatch} className="noir-btn">🔄 Rematch</button>
              <button onClick={reset} className="noir-btn-ghost">Lobby</button>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}
