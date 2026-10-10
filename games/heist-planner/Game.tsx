'use client';

/* Heist Planner — co-op asymmetric.
 * The Mastermind sees the vault map (walls, lasers, camera cones, vault).
 * The Lookout sees guard patrol routes + the timing table.
 * Phase 1 PLANNING: both place waypoints on their own view and agree over
 * the radio. Phase 2 EXECUTION: step the crew through the plan turn by turn
 * while guards patrol. 3 alarms = busted; reach the vault = the score.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameProps } from '../types';
import type { RoomApi } from '../../lib/realtime/useRoom';
import type { HeistMap, HeistPhase, HeistRole, HeistShared, XY } from './types';
import { HEIST_MAPS, getMap } from './maps';
import {
  MAX_ALARMS,
  buildPath,
  cameraCone,
  canPlace,
  guardAt,
  laserActive,
  same,
  stepHeist,
  key,
} from './logic';
import ChatBox from './ChatBox';
import { GlassCard } from '../../components/GlassCard';
import { awardXP, syncXpToRoom, XP_AWARDS } from '../../lib/xp';
import { recordCoopWin } from '../../lib/lovenotes';
import { sounds } from '../../lib/sound';

const SLUG = 'heist-planner';

function patch(room: RoomApi, p: Partial<HeistShared>) {
  room.setShared({ games: { [SLUG]: p } });
}

function freshHeist(mapId: string, roles: Record<string, HeistRole>): HeistShared {
  return {
    mapId,
    roles,
    phase: 'plan',
    plan: [],
    ready: {},
    stepIdx: 0,
    tick: 0,
    alarms: 0,
    log: [],
    awarded: {},
  };
}

export default function HeistPlannerGame({ room }: GameProps) {
  const gs: HeistShared = room.shared?.games?.[SLUG] ?? {};
  const map = getMap(gs.mapId);
  const phase: HeistPhase = gs.phase ?? 'plan';
  const roles = gs.roles ?? {};
  const myRole: HeistRole | undefined = roles[room.me.id];
  const plan = gs.plan ?? [];
  const awardedRef = useRef(false);

  /* both locked in -> execution (idempotent; either tab may fire) */
  useEffect(() => {
    if (phase !== 'plan') return;
    if (!room.peer) return;
    const r = gs.ready ?? {};
    if (r[room.me.id] && r[room.peer.id] && plan.length > 0) {
      if (room.shared?.games?.[SLUG]?.phase === 'plan') {
        patch(room, { phase: 'execute', stepIdx: 0, tick: 0, alarms: 0, log: ['🎬 Execution begins. Step the crew through the plan.'] });
        sounds.paperShuffle();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, JSON.stringify(gs.ready), plan.length, room.peer?.id]);

  /* co-op win awards (each tab awards its own player; shared marker = rejoin-safe) */
  useEffect(() => {
    if (phase !== 'won' || awardedRef.current) return;
    if (gs.awarded?.[room.me.id]) return;
    awardedRef.current = true;
    awardXP(XP_AWARDS.coopWin);
    syncXpToRoom(room.setShared, room.me.id, room.me.name);
    recordCoopWin();
    sounds.stampThud();
    patch(room, { awarded: { ...(gs.awarded ?? {}), [room.me.id]: true } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, room.me.id]);

  const chooseRole = (r: HeistRole) => {
    sounds.pinTap();
    if (room.peer) {
      const other: HeistRole = r === 'mastermind' ? 'lookout' : 'mastermind';
      patch(room, { roles: { [room.me.id]: r, [room.peer.id]: other } });
    } else {
      patch(room, { roles: { [room.me.id]: r } });
    }
  };

  const selectMap = (id: string) => {
    sounds.paperShuffle();
    patch(room, freshHeist(id, roles));
  };

  const reset = () => {
    awardedRef.current = false;
    patch(room, freshHeist(map.id, roles));
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="type-heading text-2xl">🏦 Heist Planner</h2>
          <p className="text-sm text-[var(--ink-dim)]">
            {map.name} · {map.difficulty} ·{' '}
            {myRole === 'mastermind'
              ? 'You are the MASTERMIND — you see the vault, lasers and cameras.'
              : myRole === 'lookout'
                ? 'You are the LOOKOUT — you see the guard patrols and timings.'
                : 'Pick a role to begin.'}
          </p>
        </div>
        {phase === 'execute' && (
          <div className="flex items-center gap-4">
            <span className="font-type text-sm text-[var(--ink-dim)]">
              TICK <span className="text-[var(--amber-glow)]">{gs.tick ?? 0}</span>
            </span>
            <span className="text-sm" title="Alarms">
              {Array.from({ length: MAX_ALARMS }).map((_, i) => (
                <span key={i} className={i < (gs.alarms ?? 0) ? '' : 'opacity-25'}>
                  🚨
                </span>
              ))}
            </span>
          </div>
        )}
      </div>

      {!myRole && (
        <RolePick room={room} myRole={myRole} roles={roles} onChoose={chooseRole} />
      )}

      {myRole && phase === 'plan' && (
        <PlanPhase
          room={room}
          gs={gs}
          map={map}
          myRole={myRole}
          onChoose={chooseRole}
          onSelectMap={selectMap}
        />
      )}

      {myRole && phase === 'execute' && (
        <ExecutePhase room={room} gs={gs} map={map} myRole={myRole} onChoose={chooseRole} />
      )}

      {myRole && (phase === 'won' || phase === 'failed') && (
        <EndView
          phase={phase}
          alarms={gs.alarms ?? 0}
          tick={gs.tick ?? 0}
          mapName={map.name}
          onReset={reset}
        />
      )}
    </div>
  );
}

/* ---------------- role pick + map select ---------------- */

function RolePick({
  room, myRole, roles, onChoose,
}: {
  room: RoomApi; myRole: HeistRole | undefined; roles: Record<string, HeistRole>;
  onChoose: (r: HeistRole) => void;
}) {
  const peerRole = room.peer ? roles[room.peer.id] : undefined;
  return (
    <GlassCard className="p-8 text-center">
      <h3 className="type-heading text-xl">Assemble the crew</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm text-[var(--ink-dim)]">
        The Mastermind studies the vault map — lasers, cameras, the vault
        itself. The Lookout tracks every guard's patrol route and timing.
        Neither sees the other's intel.
      </p>
      <div className="mx-auto mt-6 grid max-w-2xl gap-3 sm:grid-cols-2">
        {(
          [
            { r: 'mastermind' as HeistRole, icon: '🗺️', title: 'Mastermind', desc: 'Vault map: walls, lasers, camera cones.' },
            { r: 'lookout' as HeistRole, icon: '🔭', title: 'Lookout', desc: 'Guard patrol routes + timing table.' },
          ]
        ).map(({ r, icon, title, desc }) => (
          <motion.button
            key={r}
            whileTap={{ scale: 0.97 }}
            onClick={() => onChoose(r)}
            className={`glass-card !rounded-2xl p-5 text-left transition ${
              myRole === r ? '!border-[var(--amber-glow)] shadow-[0_0_24px_rgba(232,163,61,0.25)]' : 'hover:!border-[var(--brass)]'
            }`}
          >
            <div className="text-3xl">{icon}</div>
            <div className="type-heading mt-2">{title}</div>
            <div className="text-sm text-[var(--ink-dim)]">{desc}</div>
            {peerRole === r && room.peer && (
              <div className="eyebrow mt-2">{room.peer.name} has this</div>
            )}
          </motion.button>
        ))}
      </div>
    </GlassCard>
  );
}

function MapSelect({ map, onSelectMap }: { map: HeistMap; onSelectMap: (id: string) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {HEIST_MAPS.map((m) => (
        <button
          key={m.id}
          onClick={() => onSelectMap(m.id)}
          className={`glass-card !rounded-2xl p-3 text-left transition ${
            m.id === map.id ? '!border-[var(--amber-glow)]' : 'hover:!border-[var(--brass)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="type-heading text-sm">{m.name}</span>
            <span
              className={`eyebrow rounded-full px-2 py-0.5 ${
                m.difficulty === 'Easy'
                  ? 'bg-[rgba(61,220,116,0.15)] text-[#3ddc74]'
                  : m.difficulty === 'Medium'
                    ? 'bg-[rgba(232,163,61,0.15)] text-[var(--amber-glow)]'
                    : 'bg-[rgba(179,38,30,0.2)] text-[var(--blood-bright)]'
              }`}
            >
              {m.difficulty}
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--ink-dim)]">{m.blurb}</p>
        </button>
      ))}
    </div>
  );
}

/* ---------------- the grid ---------------- */

function HeistGrid({
  map,
  role,
  plan,
  stepIdx,
  tick,
  onCell,
  interactive,
}: {
  map: HeistMap;
  role: HeistRole;
  plan: XY[];
  stepIdx: number;
  tick: number;
  onCell: (x: number, y: number) => void;
  interactive: boolean;
}) {
  const path = useMemo(() => buildPath(map, plan), [map, plan]);
  const token = path[Math.min(stepIdx, path.length - 1)];

  const cones = useMemo(() => {
    if (role !== 'mastermind') return new Set<string>();
    const s = new Set<string>();
    for (const cam of map.cameras)
      for (const c of cameraCone(map, cam, tick)) s.add(c);
    return s;
  }, [map, role, tick]);

  const routeMarks = useMemo(() => {
    if (role !== 'lookout') return new Map<string, string>();
    const m = new Map<string, string>();
    map.guards.forEach((g, gi) => {
      g.route.forEach((p, i) => {
        const k = key(p.x, p.y);
        m.set(k, `${g.name[0]}${i}`);
      });
    });
    return m;
  }, [map, role]);

  const guardHere = useMemo(() => {
    if (role !== 'lookout') return new Map<string, string>();
    const m = new Map<string, string>();
    for (const g of map.guards) {
      const p = guardAt(g, tick);
      m.set(key(p.x, p.y), g.name);
    }
    return m;
  }, [map, role, tick]);

  const wallSet = useMemo(() => new Set(map.walls.map((w) => key(w.x, w.y))), [map]);
  const wpIndex = useMemo(() => {
    const m = new Map<string, number>();
    plan.forEach((p, i) => m.set(key(p.x, p.y), i + 1));
    return m;
  }, [plan]);

  const cells = [];
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const k = key(x, y);
      const isWall = wallSet.has(k);
      const isEntry = same(map.entry, { x, y });
      const isVault = same(map.vault, { x, y });
      const isToken = token && token.x === x && token.y === y;
      const wp = wpIndex.get(k);
      const laser = map.lasers.find((l) => l.x === x && l.y === y);
      const laserLive = laser && laserActive(laser, tick);
      const inCone = cones.has(k);
      const routeMark = routeMarks.get(k);
      const guardName = guardHere.get(k);

      let content: React.ReactNode = null;
      let bg = 'rgba(255,255,255,0.035)';
      if (isWall) { bg = 'rgba(0,0,0,0.55)'; }
      if (inCone) bg = 'rgba(232,163,61,0.16)';
      if (isEntry) { bg = 'rgba(61,220,116,0.14)'; content = '🚪'; }
      if (isVault) { bg = 'rgba(201,162,39,0.22)'; content = '🏦'; }
      if (laser && role === 'mastermind') {
        content = '⚡';
        bg = laserLive ? 'rgba(214,58,44,0.4)' : 'rgba(214,58,44,0.12)';
      }
      if (routeMark && role === 'lookout' && !isWall) {
        content = <span className="font-type text-[0.55rem] text-[#7db8ff]">{routeMark}</span>;
        bg = 'rgba(61,125,232,0.10)';
      }
      if (wp != null) {
        content = <span className="font-type text-xs font-bold text-[var(--amber-glow)]">{wp}</span>;
        bg = 'rgba(232,163,61,0.22)';
      }
      if (guardName && role === 'lookout') { content = '💂'; bg = 'rgba(214,58,44,0.3)'; }
      if (isToken) { content = '🕵️'; bg = 'rgba(201,162,39,0.35)'; }

      cells.push(
        <button
          key={k}
          onClick={() => onCell(x, y)}
          disabled={!interactive || isWall}
          className="flex aspect-square items-center justify-center rounded-[4px] border border-[rgba(255,255,255,0.05)] text-sm transition"
          style={{ background: bg, cursor: interactive && !isWall ? 'pointer' : 'default' }}
          title={`(${x},${y})${laser ? ` laser${laserLive ? ' LIVE' : ' idle'}` : ''}${guardName ? ` ${guardName}` : ''}`}
        >
          {content}
        </button>,
      );
    }
  }

  return (
    <div
      className="grid w-full gap-[3px]"
      style={{ gridTemplateColumns: `repeat(${map.width}, minmax(0,1fr))` }}
    >
      {cells}
    </div>
  );
}

/* ---------------- planning phase ---------------- */

function PlanPhase({
  room, gs, map, myRole, onChoose, onSelectMap,
}: {
  room: RoomApi; gs: HeistShared; map: HeistMap; myRole: HeistRole;
  onChoose: (r: HeistRole) => void; onSelectMap: (id: string) => void;
}) {
  const plan = gs.plan ?? [];
  const ready = gs.ready ?? {};
  const solo = !room.peer;

  const clickCell = (x: number, y: number) => {
    const last = plan[plan.length - 1];
    if (last && last.x === x && last.y === y) {
      sounds.typewriterClick();
      patch(room, { plan: plan.slice(0, -1), ready: {} });
      return;
    }
    if (!canPlace(map, plan, x, y)) return;
    sounds.pinTap();
    patch(room, { plan: [...plan, { x, y }], ready: {} });
  };

  const endsAtVault = plan.length > 0 && same(plan[plan.length - 1], map.vault);

  return (
    <div className="space-y-4">
      <MapSelect map={map} onSelectMap={onSelectMap} />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {solo && (
            <div className="flex gap-2">
              {(['mastermind', 'lookout'] as HeistRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => onChoose(r)}
                  className={`noir-btn-ghost !py-1.5 text-xs ${myRole === r ? '!border-[var(--amber-glow)]' : ''}`}
                >
                  {r === 'mastermind' ? '🗺️ Map view' : '🔭 Patrol view'}
                </button>
              ))}
            </div>
          )}
          <GlassCard className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="eyebrow">
                {myRole === 'mastermind' ? '🗺️ Vault map — your eyes only' : '🔭 Patrol chart — your eyes only'}
              </span>
              <span className="font-type text-xs text-[var(--ink-dim)]">
                {plan.length} waypoint{plan.length === 1 ? '' : 's'}
              </span>
            </div>
            <HeistGrid
              map={map} role={myRole} plan={plan} stepIdx={0} tick={0}
              onCell={clickCell} interactive
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={() => { sounds.typewriterClick(); patch(room, { plan: plan.slice(0, -1), ready: {} }); }}
                disabled={plan.length === 0}
                className="noir-btn-ghost !py-1.5 text-xs disabled:opacity-40"
              >
                ↩ Undo
              </button>
              <button
                onClick={() => { sounds.paperShuffle(); patch(room, { plan: [], ready: {} }); }}
                disabled={plan.length === 0}
                className="noir-btn-ghost !py-1.5 text-xs disabled:opacity-40"
              >
                🗑 Clear
              </button>
              <span className="ml-auto text-xs text-[var(--ink-dim)]">
                Click tiles to plot the route · click the last pin to remove it
              </span>
            </div>
            {!endsAtVault && plan.length > 0 && (
              <p className="mt-2 text-xs text-[var(--blood-bright)]">
                ⚠ The route must end at the vault 🏦.
              </p>
            )}
          </GlassCard>

          {myRole === 'lookout' ? (
            <TimingTable map={map} />
          ) : (
            <IntelPanel map={map} />
          )}
        </div>

        <div className="space-y-3">
          <ChatBox
            room={room}
            actionType="chat"
            title="Planning radio"
            quickPhrases={['Route looks clean', 'Guard on my mark', 'Laser timing?', 'Lock it in']}
          />
          <GlassCard className="p-4 text-center">
            <div className="eyebrow mb-2">Lock in the plan</div>
            <div className="flex justify-center gap-6 text-sm">
              <span>{room.me.name}: {ready[room.me.id] ? '✅ ready' : '⏳ …'}</span>
              {room.peer && (
                <span>{room.peer.name}: {ready[room.peer.id] ? '✅ ready' : '⏳ …'}</span>
              )}
            </div>
            <button
              onClick={() => {
                sounds.stampThud();
                patch(room, { ready: { ...ready, [room.me.id]: !ready[room.me.id] } });
              }}
              disabled={plan.length === 0 || !endsAtVault}
              className={`noir-btn mt-3 w-full !py-3 disabled:opacity-40 ${ready[room.me.id] ? '!border-[var(--brass)]' : ''}`}
            >
              {ready[room.me.id] ? '✅ Plan locked — waiting on partner' : '🔒 LOCK IN THE PLAN'}
            </button>
            {!room.peer && plan.length > 0 && endsAtVault && (
              <button
                onClick={() => patch(room, { phase: 'execute', stepIdx: 0, tick: 0, alarms: 0, log: ['🎬 Solo run — execution begins.'] })}
                className="noir-btn-ghost mt-2 w-full !py-2 text-sm"
              >
                ▶ Solo practice: run it
              </button>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

/** Lookout's intel: guard patrol routes + timing table. */
function TimingTable({ map }: { map: HeistMap }) {
  return (
    <div className="manila-folder p-5">
      <span className="eyebrow">📋 Guard patrols — timing table (tick → tile)</span>
      <div className="mt-3 space-y-3">
        {map.guards.map((g) => (
          <div key={g.name} className="paper-strip p-3">
            <div className="type-heading text-sm">💂 {g.name}</div>
            <div className="mt-1 font-type text-xs leading-relaxed text-[var(--ink-dim)]">
              {g.route.map((p, i) => (
                <span key={i}>
                  <span className="text-[var(--amber-glow)]">t{i}</span>({p.x},{p.y})
                  {i < g.route.length - 1 ? ' → ' : ' ↺ repeats'}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-[var(--ink-dim)]">
        Read the route aloud to your Mastermind — they can't see any of this.
        Route marks on your chart read as guard-initial + tick.
      </p>
    </div>
  );
}

/** Mastermind's intel summary: lasers + cameras. */
function IntelPanel({ map }: { map: HeistMap }) {
  return (
    <div className="manila-folder p-5">
      <span className="eyebrow">📋 Your intel — lasers & cameras (tick 0 shown)</span>
      <div className="mt-3 space-y-2">
        {map.lasers.map((l, i) => (
          <div key={i} className="paper-strip p-2 font-type text-xs">
            ⚡ Laser ({l.x},{l.y}) — live {Math.ceil(l.period / 2)}/{l.period} ticks, offset {l.offset}
          </div>
        ))}
        {map.cameras.map((c, i) => (
          <div key={i} className="paper-strip p-2 font-type text-xs">
            📷 Camera ({c.x},{c.y}) facing {c.dir}, range {c.range}
            {c.sweep ? `, sweeps every ${c.sweep} ticks` : ', fixed'}
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-[var(--ink-dim)]">
        Amber tiles are camera cones, red ⚡ tiles are lasers (bright = live).
        Your Lookout can't see any of this — describe the safe corridors.
      </p>
    </div>
  );
}

/* ---------------- execution phase ---------------- */

function ExecutePhase({
  room, gs, map, myRole, onChoose,
}: {
  room: RoomApi; gs: HeistShared; map: HeistMap; myRole: HeistRole;
  onChoose: (r: HeistRole) => void;
}) {
  const plan = gs.plan ?? [];
  const stepIdx = gs.stepIdx ?? 0;
  const tick = gs.tick ?? 0;
  const alarms = gs.alarms ?? 0;
  const log = gs.log ?? [];
  const path = buildPath(map, plan);
  const finished = stepIdx >= path.length - 1 && !same(path[stepIdx], map.vault);

  const step = () => {
    const cur = room.shared?.games?.[SLUG] as HeistShared | undefined;
    if (cur?.phase !== 'execute') return;
    const res = stepHeist(map, cur.plan ?? [], cur.stepIdx ?? 0, cur.tick ?? 0, cur.alarms ?? 0);
    sounds.typewriterClick();
    if (res.failed) {
      sounds.stampThud();
      patch(room, { phase: 'failed', stepIdx: res.stepIdx, tick: res.tick, alarms: res.alarms, log: [...(cur.log ?? []).slice(-9), ...res.events] });
    } else if (res.won) {
      patch(room, { phase: 'won', stepIdx: res.stepIdx, tick: res.tick, alarms: res.alarms, log: [...(cur.log ?? []).slice(-9), ...res.events] });
    } else {
      if (res.alarms > (cur.alarms ?? 0)) sounds.stampThud();
      patch(room, { stepIdx: res.stepIdx, tick: res.tick, alarms: res.alarms, log: [...(cur.log ?? []).slice(-9), ...res.events] });
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        {!room.peer && (
          <div className="flex gap-2">
            {(['mastermind', 'lookout'] as HeistRole[]).map((r) => (
              <button
                key={r}
                onClick={() => onChoose(r)}
                className={`noir-btn-ghost !py-1.5 text-xs ${myRole === r ? '!border-[var(--amber-glow)]' : ''}`}
              >
                {r === 'mastermind' ? '🗺️ Map view' : '🔭 Patrol view'}
              </button>
            ))}
          </div>
        )}
        <GlassCard className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="eyebrow">
              🎬 Execution — {myRole === 'mastermind' ? 'watch the lasers & cameras' : 'watch the guards'}
            </span>
            <span className="font-type text-xs text-[var(--ink-dim)]">
              step {Math.min(stepIdx + 1, path.length)}/{path.length}
            </span>
          </div>
          <HeistGrid
            map={map} role={myRole} plan={plan} stepIdx={stepIdx} tick={tick}
            onCell={() => {}} interactive={false}
          />
          <button
            onClick={step}
            disabled={finished}
            className="noir-btn mt-4 w-full !py-4 !text-base disabled:opacity-40"
          >
            {finished ? '⛔ Route complete — vault not reached' : '👣 STEP THE CREW →'}
          </button>
          {finished && (
            <p className="mt-2 text-center text-xs text-[var(--blood-bright)]">
              The plan ended before the vault. Abort and replan — or add the vault as the final waypoint next time.
            </p>
          )}
        </GlassCard>
        <div className="glass-card !rounded-2xl p-4">
          <span className="eyebrow">📻 Run log</span>
          <div className="mt-2 max-h-36 space-y-1 overflow-y-auto font-type text-xs text-[var(--ink-dim)]">
            {log.map((l, i) => (
              <p key={i}>{l}</p>
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <ChatBox
          room={room}
          actionType="chat"
          title="Execution radio"
          quickPhrases={['Hold…', 'Now!', 'Guard close', 'Abort?']}
        />
        <button
          onClick={() => { sounds.paperShuffle(); patch(room, { phase: 'plan', ready: {} }); }}
          className="noir-btn-ghost w-full !py-2 text-sm"
        >
          ↩ Abort run — back to planning
        </button>
      </div>
    </div>
  );
}

/* ---------------- end ---------------- */

function EndView({
  phase, alarms, tick, mapName, onReset,
}: {
  phase: HeistPhase; alarms: number; tick: number; mapName: string; onReset: () => void;
}) {
  const won = phase === 'won';
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card-strong mx-auto max-w-xl p-10 text-center"
    >
      <div className="text-6xl">{won ? '💰' : '🚔'}</div>
      <h3 className="type-heading mt-4 text-3xl">
        {won ? 'THE SCORE IS OURS' : 'BUSTED'}
      </h3>
      <p className="mt-2 text-sm text-[var(--ink-dim)]">
        {won
          ? `${mapName} cracked in ${tick} ticks with ${alarms} alarm${alarms === 1 ? '' : 's'}. Clean work, crew.`
          : `Three alarms at ${mapName}. The crew is in the wind — plan a quieter route and go again.`}
      </p>
      {won && (
        <div className="eyebrow mt-3 text-[var(--amber-glow)]">
          +{XP_AWARDS.coopWin} XP each · love-notes surprise unlocked 💌
        </div>
      )}
      <button onClick={onReset} className="noir-btn mt-6 !px-10 !py-3">
        {won ? 'Plan the next score' : 'Replan the heist'}
      </button>
    </motion.div>
  );
}
