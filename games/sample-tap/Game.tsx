'use client';

/* SAMPLE GAME — Tap Duel.
 * First detective to 20 taps wins. State lives in
 * shared.games['sample-tap'] = { taps: { [playerId]: n }, winner: playerId | null }.
 * Game agents: copy this shape for your own games.
 */

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { GameProps } from '../types';
import { TAP_TARGET, tapWinner } from './logic';
import { awardXP, syncXpToRoom, XP_AWARDS } from '../../lib/xp';
import { sounds } from '../../lib/sound';
import { GlassCard } from '../../components/GlassCard';

interface TapShared {
  taps?: Record<string, number>;
  winner?: string | null;
}

export default function TapDuelGame({ room }: GameProps) {
  const gs: TapShared = room.shared?.games?.['sample-tap'] ?? {};
  const taps = gs.taps ?? {};
  const winner = tapWinner(taps);
  const myTaps = taps[room.me.id] ?? 0;
  const peerTaps = room.peer ? taps[room.peer.id] ?? 0 : 0;
  const awardedRef = useRef(false);

  // Award XP once when the game is decided (only the winner's tab awards).
  useEffect(() => {
    if (winner && winner === room.me.id && !awardedRef.current) {
      awardedRef.current = true;
      awardXP(XP_AWARDS.duoWin);
      syncXpToRoom(room.setShared, room.me.id, room.me.name);
      sounds.stampThud();
    }
  }, [winner, room]);

  const tap = () => {
    if (winner) return;
    sounds.typewriterClick();
    const next = (taps[room.me.id] ?? 0) + 1;
    const patch: Record<string, any> = {
      games: { 'sample-tap': { taps: { [room.me.id]: next } } },
    };
    if (next >= TAP_TARGET && !winner) {
      patch.games['sample-tap'].winner = room.me.id;
    }
    room.setShared(patch);
  };

  const reset = () => {
    awardedRef.current = false;
    room.setShared({ games: { 'sample-tap': { taps: {}, winner: null } } });
  };

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 rounded-xl border border-dashed border-[var(--amber-glow)] bg-[rgba(232,163,61,0.08)] px-4 py-2 text-center font-type text-[0.72rem] tracking-[0.18em] uppercase text-[var(--ink-dim)]">
        ⚠ Sample game — proves the registry + realtime contract
      </div>

      <GlassCard className="p-8 text-center">
        <h2 className="type-heading text-2xl">Tap Duel</h2>
        <p className="mt-2 text-sm text-[var(--ink-dim)]">
          First detective to {TAP_TARGET} taps cracks the case.
        </p>

        {winner ? (
          <div className="mt-6">
            <div className="type-heading text-xl text-[var(--amber-glow)]">
              🏆 Case closed by {winner === room.me.id ? 'YOU' : room.peer?.name ?? 'partner'}!
            </div>
            <button onClick={reset} className="noir-btn-ghost mt-5">
              New round
            </button>
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="glass-card !rounded-2xl p-4">
                <div className="eyebrow">You</div>
                <div className="type-heading mt-1 text-4xl">{myTaps}</div>
              </div>
              <div className="glass-card !rounded-2xl p-4">
                <div className="eyebrow">{room.peer?.name ?? 'Partner'}</div>
                <div className="type-heading mt-1 text-4xl">{peerTaps}</div>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={tap}
              className="noir-btn mt-8 !px-14 !py-6 !text-lg"
            >
              👆 TAP
            </motion.button>
            {!room.roomCode && (
              <p className="mt-4 text-xs text-[var(--ink-faint)]">
                Solo practice — create a room from the hub to duel live.
              </p>
            )}
          </>
        )}
      </GlassCard>
    </div>
  );
}
