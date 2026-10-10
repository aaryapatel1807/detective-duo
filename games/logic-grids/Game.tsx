'use client';

/* Logic Grids — versus race or co-op.
 * Both detectives solve the same grid on a synced timer. Cell marks (✓/✗)
 * stay LOCAL — each player works their own board; only the start time,
 * finish times, and winner sync via shared.games['logic-grids'].
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameProps } from '../types';
import type { GridMode, LogicGridsShared } from './types';
import { ALL_GRIDS, getGrid } from './content';
import {
  allFinished,
  cycleMark,
  emptyMarks,
  formatMs,
  isSolved,
  raceWinner,
  type Mark,
} from './logic';
import { awardXP, syncXpToRoom, XP_AWARDS } from '../../lib/xp';
import { sounds } from '../../lib/sound';
import { GlassCard } from '../../components/GlassCard';

export default function LogicGridsGame({ room }: GameProps) {
  const gs: LogicGridsShared = room.shared?.games?.['logic-grids'] ?? {};
  const phase = gs.phase ?? 'lobby';
  const gridId = gs.gridId ?? null;
  const mode: GridMode = gs.mode ?? 'race';
  const startAt = gs.startAt ?? null;
  const finished = gs.finished ?? {};
  const winner = gs.winner ?? null;

  const grid = gridId ? getGrid(gridId) : undefined;
  const peerId = room.peer?.id ?? null;

  const [selGrid, setSelGrid] = useState(ALL_GRIDS[0].id);
  const [selMode, setSelMode] = useState<GridMode>('race');
  const [marks, setMarks] = useState<Mark[][]>([]);
  const [now, setNow] = useState(Date.now());
  const [wrongFlash, setWrongFlash] = useState(false);
  const awardedRef = useRef(false);

  const patch = (p: Partial<LogicGridsShared>) => room.setShared({ games: { 'logic-grids': p } });

  // Reset local board when the grid changes.
  useEffect(() => {
    if (grid) setMarks(emptyMarks(grid));
  }, [gridId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ticking clock while solving.
  useEffect(() => {
    if (phase !== 'solving') return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [phase]);

  // XP once: race winner gets duoWin; co-op finishers get coopWin.
  useEffect(() => {
    if (phase !== 'over' || awardedRef.current) return;
    const iWon = mode === 'coop' ? finished[room.me.id] !== undefined : winner === room.me.id;
    if (iWon) {
      awardedRef.current = true;
      awardXP(mode === 'coop' ? XP_AWARDS.coopWin : XP_AWARDS.duoWin);
      syncXpToRoom(room.setShared, room.me.id, room.me.name);
      sounds.xpTick();
    }
  }, [phase, winner, finished, mode, room]);

  // Safety net: if both finished (e.g. near-simultaneous checks), close the case.
  useEffect(() => {
    if (phase !== 'solving' || mode !== 'coop') return;
    const ids = peerId ? [room.me.id, peerId] : [room.me.id];
    if (ids.length > 0 && allFinished(finished, ids)) {
      patch({ phase: 'over', winner: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, finished, mode, peerId]);

  const start = (gridOverride?: string) => {
    awardedRef.current = false;
    sounds.paperShuffle();
    patch({ phase: 'solving', gridId: gridOverride ?? gridId ?? selGrid, mode: selMode, startAt: Date.now(), finished: {}, winner: null });
  };

  const toggleCell = (r: number, c: number) => {
    if (phase !== 'solving' || finished[room.me.id] !== undefined) return;
    sounds.typewriterClick();
    setMarks((prev) => prev.map((rowArr, ri) => rowArr.map((m, ci) => (ri === r && ci === c ? cycleMark(m) : m))));
  };

  const check = () => {
    if (!grid || phase !== 'solving') return;
    if (!isSolved(marks, grid)) {
      sounds.typewriterClick();
      setWrongFlash(true);
      setTimeout(() => setWrongFlash(false), 1200);
      return;
    }
    sounds.stampThud();
    const elapsed = Date.now() - (startAt ?? Date.now());
    const nextFinished = { ...finished, [room.me.id]: elapsed };
    const ids = peerId ? [room.me.id, peerId] : [room.me.id];
    if (mode === 'race') {
      patch({ finished: nextFinished, phase: 'over', winner: raceWinner(nextFinished) });
    } else if (allFinished(nextFinished, ids)) {
      patch({ finished: nextFinished, phase: 'over', winner: null });
    } else {
      patch({ finished: nextFinished });
    }
  };

  const reset = () => {
    awardedRef.current = false;
    patch({ phase: 'lobby', gridId: null, startAt: null, finished: {}, winner: null });
  };

  const elapsed = startAt ? now - startAt : 0;
  const myFinished = finished[room.me.id] !== undefined;
  const peerFinished = peerId !== null && finished[peerId] !== undefined;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 text-center">
        <div className="eyebrow">Evidence board · elimination puzzle</div>
        <h2 className="type-heading mt-1 text-2xl">Logic Grids</h2>
        {phase === 'solving' && (
          <div className="mt-2 flex items-center justify-center gap-4 text-xs text-[var(--ink-dim)]">
            <span className="type-heading text-xl text-[var(--amber-glow)]">⏱️ {formatMs(myFinished ? finished[room.me.id] : elapsed)}</span>
            <span className="rounded-full border border-[var(--glass-border)] px-3 py-1 capitalize">{mode}</span>
            {peerFinished && <span className="text-[#7ee787]">Partner finished in {formatMs(finished[peerId!])}</span>}
          </div>
        )}
      </div>

      {/* ---- lobby ---- */}
      {phase === 'lobby' && (
        <GlassCard className="p-6">
          <div className="type-heading mb-3 text-center text-lg">Choose your puzzle</div>
          <div className="grid gap-3 sm:grid-cols-2">
            {ALL_GRIDS.map((g) => (
              <button
                key={g.id}
                onClick={() => { setSelGrid(g.id); sounds.pinTap(); }}
                className={`manila-folder p-4 text-left ${selGrid === g.id ? '!border-[var(--amber-glow)]' : ''}`}
              >
                <div className="type-heading text-sm">{g.title}</div>
                <div className="mt-1 text-xs text-[var(--ink-dim)]">{g.rows.length}×{g.cols.length} grid · {g.clues.length} clues</div>
              </button>
            ))}
          </div>
          <div className="mt-4 flex justify-center gap-2">
            {(['race', 'coop'] as GridMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setSelMode(m)}
                className={`rounded-full border px-4 py-1.5 text-sm capitalize ${selMode === m ? 'border-[var(--amber-glow)] text-[var(--amber-glow)]' : 'border-[var(--glass-border)]'}`}
              >
                {m === 'race' ? '🏁 Race' : '🤝 Co-op'}
              </button>
            ))}
          </div>
          <p className="mt-2 text-center text-xs text-[var(--ink-faint)]">
            {selMode === 'race' ? 'Fastest correct grid takes the case.' : 'Both detectives must crack it — the desk celebrates together.'}
          </p>
          <button onClick={() => start()} className="noir-btn mx-auto mt-4 block">🔍 Start the clock</button>
        </GlassCard>
      )}

      {/* ---- solving ---- */}
      {phase === 'solving' && grid && (
        <div className="space-y-4">
          <div className="manila-folder relative p-6">
            <div className="brass-pin absolute -top-2 left-6" />
            <div className="type-heading text-xl">{grid.title}</div>
            <p className="mt-2 text-sm text-[var(--ink-dim)]">{grid.setup}</p>
            <ul className="mt-3 space-y-1">
              {grid.clues.map((c, i) => (
                <li key={i} className="text-sm">📌 {c}</li>
              ))}
            </ul>
          </div>

          <GlassCard className={`p-5 ${wrongFlash ? 'border-[var(--blood-bright)]' : ''}`}>
            <div className="eyebrow mb-3 text-center">Tap a cell: empty → ✓ → ✗</div>
            <div className="overflow-x-auto">
              <table className="mx-auto border-collapse">
                <thead>
                  <tr>
                    <th className="p-2" />
                    {grid.cols.map((c) => (
                      <th key={c} className="type-heading max-w-[7rem] p-2 text-xs text-[var(--amber-glow)]">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grid.rows.map((r, ri) => (
                    <tr key={r}>
                      <th className="type-heading p-2 text-right text-xs">{r}</th>
                      {grid.cols.map((c, ci) => {
                        const m = marks[ri]?.[ci] ?? 'empty';
                        return (
                          <td key={c} className="p-1">
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={() => toggleCell(ri, ci)}
                              disabled={myFinished}
                              className={`flex h-12 w-12 items-center justify-center rounded-lg border text-xl transition-colors sm:h-14 sm:w-14 ${
                                m === 'yes'
                                  ? 'border-[#7ee787] bg-[rgba(76,175,80,0.15)] text-[#7ee787]'
                                  : m === 'no'
                                    ? 'border-[var(--blood-bright)] bg-[rgba(211,58,44,0.12)] text-[var(--blood-bright)]'
                                    : 'border-[var(--glass-border)] bg-[rgba(0,0,0,0.2)] hover:border-[var(--amber-glow)]'
                              }`}
                            >
                              {m === 'yes' ? '✓' : m === 'no' ? '✗' : ''}
                            </motion.button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {wrongFlash && (
              <p className="mt-2 text-center text-sm text-[var(--blood-bright)]">Not quite — recheck your eliminations.</p>
            )}
            <div className="mt-4 text-center">
              {myFinished ? (
                <p className="text-sm text-[#7ee787]">✅ Locked in at {formatMs(finished[room.me.id])}. {mode === 'coop' && !peerFinished ? 'Waiting on your partner…' : ''}</p>
              ) : (
                <button onClick={check} className="noir-btn">🔍 Check solution</button>
              )}
            </div>
          </GlassCard>
        </div>
      )}

      {/* ---- over ---- */}
      {phase === 'over' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className="p-8 text-center">
            <div className="wax-seal mx-auto mb-3" />
            <div className="type-heading text-xl text-[var(--amber-glow)]">
              {mode === 'coop' ? '🤝 CASE CRACKED TOGETHER!' : '🏁 GRID CLOSED'}
            </div>
            <div className="mt-3 space-y-1 text-sm">
              <div>You: <b className="text-[var(--amber-glow)]">{finished[room.me.id] !== undefined ? formatMs(finished[room.me.id]) : '—'}</b></div>
              {peerId && <div>{room.peer?.name ?? 'Partner'}: <b className="text-[var(--amber-glow)]">{finished[peerId] !== undefined ? formatMs(finished[peerId]) : '—'}</b></div>}
            </div>
            {mode === 'race' && (
              <p className="mt-3 text-lg">
                Winner: <b className="text-[var(--amber-glow)]">{winner === room.me.id ? 'YOU' : room.peer?.name ?? 'Partner'}</b>
                {' · '} +{XP_AWARDS.duoWin} XP
              </p>
            )}
            {mode === 'coop' && <p className="mt-3 text-sm text-[var(--ink-dim)]">+{XP_AWARDS.coopWin} XP each — the desk salutes you.</p>}
            <div className="mt-5 flex justify-center gap-3">
              <button onClick={() => start(gridId ?? undefined)} className="noir-btn">🔄 Same grid, again</button>
              <button onClick={reset} className="noir-btn-ghost">Lobby</button>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}
