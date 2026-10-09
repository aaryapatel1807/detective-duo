'use client';

/* Battleship — 8×8 harbor grid, 4 ships each.
 * Placement phase (secret fleets), then alternating shots with synced
 * hit/miss. The fleet that sinks first loses.
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameProps } from '../types';
import type { BattleshipShared } from './types';
import {
  GRID,
  SHIP_SIZES,
  allSunk,
  canPlace,
  hitAt,
  placeShip,
} from './logic';
import { awardXP, syncXpToRoom, XP_AWARDS } from '../../lib/xp';
import { sounds } from '../../lib/sound';

export default function BattleshipGame({ room }: GameProps) {
  const gs: BattleshipShared = room.shared?.games?.['battleship'] ?? {};
  const phase = gs.phase ?? 'lobby';
  const ships = gs.ships ?? {};
  const ready = gs.ready ?? {};
  const shots = gs.shots ?? {};
  const turn = gs.turn ?? null;
  const winner = gs.winner ?? null;
  const me = room.me.id;
  const peer = room.peer;
  const awardedRef = useRef(false);
  const [horizontal, setHorizontal] = useState(true);

  const set = (patch: Partial<BattleshipShared>) =>
    room.setShared({ games: { battleship: patch } });

  const myShips: number[][] = ships[me] ?? [];
  const peerShips: number[][] = peer ? (ships[peer.id] ?? []) : [];
  const myShots: Record<number, 'hit' | 'miss'> = shots[me] ?? {};
  const peerShots: Record<number, 'hit' | 'miss'> = peer ? (shots[peer.id] ?? {}) : {};
  const myTaken = new Set(myShips.flat());

  useEffect(() => {
    if (winner && winner === me && !awardedRef.current) {
      awardedRef.current = true;
      awardXP(XP_AWARDS.duoWin);
      syncXpToRoom(room.setShared, me, room.me.name);
      sounds.stampThud();
    }
  }, [winner, me, room]);

  // Lower id opens the battle once both fleets are ready.
  useEffect(() => {
    if (phase !== 'place' || !peer) return;
    if (ready[me] && ready[peer.id] && me < peer.id) {
      set({ phase: 'battle', turn: me });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, ready[me], peer && ready[peer.id]]);

  const nameOf = (pid: string | null): string =>
    pid === null ? '—' : pid === me ? room.me.name : (peer?.name ?? 'Partner');

  const startPlacement = () => {
    if (!peer) return;
    sounds.paperShuffle();
    set({
      phase: 'place',
      ships: { [me]: [], [peer.id]: [] },
      ready: { [me]: false, [peer.id]: false },
      shots: { [me]: {}, [peer.id]: {} },
      turn: null,
      winner: null,
    });
  };

  const placeAt = (cell: number) => {
    if (phase !== 'place' || ready[me]) return;
    const idx = myShips.length;
    if (idx >= SHIP_SIZES.length) return;
    const next = placeShip(myShips, cell, SHIP_SIZES[idx], horizontal);
    if (!next) return;
    sounds.pinTap();
    set({ ships: { [me]: next } });
  };

  const clearShips = () => {
    if (phase !== 'place' || ready[me]) return;
    set({ ships: { [me]: [] } });
  };

  const markReady = () => {
    if (phase !== 'place' || myShips.length < SHIP_SIZES.length) return;
    sounds.stampThud();
    set({ ready: { [me]: true } });
  };

  const fire = (cell: number) => {
    if (phase !== 'battle' || turn !== me || !peer) return;
    if (myShots[cell]) return;
    const hit = hitAt(peerShips, cell);
    sounds.typewriterClick();
    const nextShots = { ...myShots, [cell]: hit ? 'hit' : 'miss' } as Record<number, 'hit' | 'miss'>;
    if (allSunk(peerShips, nextShots)) {
      sounds.stampThud();
      set({ shots: { [me]: nextShots }, winner: me, phase: 'over' });
      return;
    }
    set({ shots: { [me]: nextShots }, turn: peer.id });
  };

  const nextSize = myShips.length < SHIP_SIZES.length ? SHIP_SIZES[myShips.length] : null;

  const renderCell = (
    cell: number,
    opts: { own: boolean },
  ): { label: string; cls: string; onClick?: () => void } => {
    if (opts.own) {
      const isShip = myTaken.has(cell);
      const s = peerShots[cell];
      return {
        label: s === 'hit' ? '💥' : s === 'miss' ? '🌊' : isShip ? '🚢' : '',
        cls: s === 'hit'
          ? 'bg-red-500/30 border-red-400'
          : isShip
            ? 'bg-emerald-600/30 border-emerald-400/70'
            : 'bg-white/5 border-white/10',
      };
    }
    const s = myShots[cell];
    const clickable = phase === 'battle' && turn === me && !s && !winner;
    return {
      label: s === 'hit' ? '💥' : s === 'miss' ? '🌊' : '',
      cls: s
        ? s === 'hit'
          ? 'bg-red-500/30 border-red-400'
          : 'bg-sky-500/20 border-sky-400/50'
        : clickable
          ? 'bg-white/5 border-white/10 hover:border-amber-300/70 hover:bg-amber-300/10 cursor-pointer'
          : 'bg-white/5 border-white/10',
      onClick: clickable ? () => fire(cell) : undefined,
    };
  };

  const grid = (own: boolean, title: string) => (
    <div>
      <h3 style={{ fontFamily: 'var(--font-type)' }} className="mb-2 text-sm tracking-widest opacity-80">
        {title}
      </h3>
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${GRID}, minmax(0, 1fr))` }}>
        {Array.from({ length: GRID * GRID }, (_, cell) => {
          const { label, cls, onClick } = renderCell(cell, { own });
          const placeable =
            own && phase === 'place' && !ready[me] && nextSize !== null &&
            canPlace(myShips, cell, nextSize, horizontal);
          return (
            <button
              key={cell}
              onClick={own ? (placeable ? () => placeAt(cell) : undefined) : onClick}
              disabled={own ? !placeable : !onClick}
              className={`flex aspect-square items-center justify-center rounded border text-sm transition-all ${cls} ${
                placeable ? 'cursor-pointer ring-1 ring-amber-300/50' : ''
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 style={{ fontFamily: 'var(--font-type)' }} className="text-xl tracking-wide">
          🚢 BATTLESHIP
        </h2>
        <div className="text-sm opacity-80" style={{ fontFamily: 'var(--font-type)' }}>
          {phase === 'battle' && `TURN: ${turn === me ? 'YOU' : nameOf(turn).toUpperCase()}`}
        </div>
      </div>

      {!peer && (
        <div className="glass-card p-4 text-sm" style={{ fontFamily: 'var(--font-type)' }}>
          ⏳ Waiting for your partner… (code <span className="font-bold">{room.roomCode ?? '—'}</span>)
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
        {phase === 'lobby' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-center text-sm opacity-70" style={{ fontFamily: 'var(--font-type)' }}>
              Four ships each on the midnight harbor. Place them in secret, then hunt.
            </p>
            <button className="noir-btn" onClick={startPlacement} disabled={!peer}>
              📁 Deploy fleets
            </button>
          </div>
        )}

        {phase === 'place' && (
          <>
            <p className="mb-3 text-sm opacity-80" style={{ fontFamily: 'var(--font-type)' }}>
              {ready[me]
                ? `Fleet ready. Waiting for ${nameOf(peer?.id ?? null)}…`
                : `Place ship ${myShips.length + 1} of ${SHIP_SIZES.length} — size ${nextSize} (${horizontal ? 'horizontal ↔' : 'vertical ↕'}).`}
            </p>
            <div className="mb-3 flex flex-wrap gap-2">
              <button className="noir-btn noir-btn-ghost" onClick={() => setHorizontal(!horizontal)} disabled={!!ready[me]}>
                🔄 Rotate ({horizontal ? '↔' : '↕'})
              </button>
              <button className="noir-btn noir-btn-ghost" onClick={clearShips} disabled={!!ready[me] || myShips.length === 0}>
                🧹 Clear
              </button>
              <button className="noir-btn" onClick={markReady} disabled={!!ready[me] || myShips.length < SHIP_SIZES.length}>
                ⚓ Ready
              </button>
            </div>
            {grid(true, `YOUR HARBOR — ${nameOf(me).toUpperCase()}`)}
          </>
        )}

        {phase === 'battle' && (
          <div className="grid gap-6 md:grid-cols-2">
            {grid(true, `YOUR HARBOR — ${nameOf(me).toUpperCase()}`)}
            {grid(false, `ENEMY WATERS — ${nameOf(peer?.id ?? null).toUpperCase()}`)}
          </div>
        )}

        {phase === 'over' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="text-4xl">{winner === me ? '🏆' : '🕯️'}</div>
            <p className="text-center text-sm" style={{ fontFamily: 'var(--font-type)' }}>
              {winner === me
                ? 'Direct hit — the enemy fleet rests on the harbor floor.'
                : `${nameOf(winner)} sends your fleet to the deep.`}
            </p>
            <button className="noir-btn" onClick={startPlacement}>🔁 New battle</button>
          </div>
        )}
      </motion.div>

      {phase === 'battle' && (
        <p className="text-center text-xs opacity-70" style={{ fontFamily: 'var(--font-type)' }}>
          💥 hit · 🌊 miss · sink all {SHIP_SIZES.length} enemy ships to win.
        </p>
      )}
    </div>
  );
}
