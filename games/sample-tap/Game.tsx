'use client';

/* SAMPLE GAME — Tap Duel.
 * First detective to 20 taps wins. State lives in
 * shared.games['sample-tap'] = { taps: { [playerId]: n }, winner: playerId | null }.
 * Game agents: copy this shape for your own games.
 */

import { useEffect, useRef } from 'react';
import type { GameProps } from '../types';
import { TAP_TARGET, tapWinner } from './logic';
import { awardXP, syncXpToRoom, XP_AWARDS } from '../../lib/xp';
import { sounds } from '../../lib/sound';
import '../ui-kit/kit.css';
import '../ui-kit/realism.css';
import './sample-tap.css';
import { ResultModal, ScoreHUD, SectionTitle } from '../ui-kit';

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

  const peerName = room.peer?.name ?? 'Partner';
  const winnerName = winner === room.me.id ? 'You' : peerName;

  return (
    <div className="gk-root gk-modal-scope mx-auto max-w-xl">
      <div className="mb-4 rounded-xl border border-dashed border-[var(--amber-glow)] bg-[rgba(232,163,61,0.08)] px-4 py-2 text-center font-type text-[0.72rem] tracking-[0.18em] uppercase text-[var(--gk-ink-dim)]">
        🕹️ Practice cabinet — warm up your tapping finger
      </div>

      <div className="mb-5 text-center">
        <SectionTitle eyebrow="DUO PRACTICE" title="Tap Duel" />
        <p className="mt-2 text-sm text-[var(--gk-ink-dim)]">
          First detective to {TAP_TARGET} taps cracks the case.
        </p>
      </div>

      <ScoreHUD leftLabel="You" leftValue={myTaps} rightLabel={peerName} rightValue={peerTaps} />

      {!winner && (
        <div className="st-cabinet mt-6">
          <span className="st-marquee">First to {TAP_TARGET}</span>
          <div>
            <button
              type="button"
              onClick={tap}
              className="st-button"
              aria-label={`Tap! ${myTaps} of ${TAP_TARGET}`}
            >
              TAP
            </button>
          </div>
          <div>
            <span className="st-score" aria-hidden>{myTaps}</span>
          </div>
          {!room.roomCode && (
            <p className="mt-4 text-center text-xs text-white/60">
              Solo practice — create a room from the hub to duel live.
            </p>
          )}
        </div>
      )}

      <ResultModal
        open={!!winner}
        eyebrow="TAP DUEL"
        headline={winner === room.me.id ? 'Case Closed' : 'Partner Wins'}
        tone={winner === room.me.id ? 'win' : 'draw'}
        stat={`${winnerName.toUpperCase()} · ${winner === room.me.id ? myTaps : peerTaps} TAPS`}
        primaryLabel="New round"
        onPrimary={reset}
      />
    </div>
  );
}
