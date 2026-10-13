'use client';

/* Escape Room — co-op, shared room.
 * Both detectives see the same noir office. Click hotspots to examine,
 * collect journal notes, crack 4-digit locks, and find the exit key.
 * Every action syncs: if one detective pockets the key, it's gone for both.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import '../ui-kit/kit.css';
import '../ui-kit/realism.css';
import './escape-room.css';
import { GameButton, ResultModal, TimerChip, SectionTitle } from '../ui-kit';
import type { GameProps } from '../types';
import type { RoomApi } from '../../lib/realtime/useRoom';
import type { EscapeShared, Hotspot } from './types';
import { ESCAPE_ROOMS, getRoomDef } from './content';
import {
  freshEscape,
  hasExitKey,
  hasItem,
  hotspotById,
  inventoryItems,
  journalNotes,
  tryCode,
  visibleHotspots,
} from './logic';
import { GlassCard } from '../../components/GlassCard';
import { awardXP, syncXpToRoom, XP_AWARDS } from '../../lib/xp';
import { recordCoopWin } from '../../lib/lovenotes';
import { sounds } from '../../lib/sound';

const SLUG = 'escape-room';

function patch(room: RoomApi, p: Partial<EscapeShared>) {
  room.setShared({ games: { [SLUG]: p } });
}

function fmt(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function EscapeRoomGame({ room }: GameProps) {
  const gs: EscapeShared = room.shared?.games?.[SLUG] ?? {};
  const def = getRoomDef(gs.roomId);
  const awardedRef = useRef(false);
  const [now, setNow] = useState(() => Date.now());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const won = gs.won || hasExitKey(def, gs);
  const inventory = useMemo(() => inventoryItems(def, gs), [def, gs]);
  const notes = useMemo(() => journalNotes(def, gs), [def, gs]);
  const visible = useMemo(() => visibleHotspots(def, gs), [def, gs]);
  const selected = selectedId ? hotspotById(def, selectedId) : undefined;

  /* flavor timer */
  useEffect(() => {
    if (!gs.roomId || won) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [gs.roomId, won]);

  /* exit key found -> room cleared */
  useEffect(() => {
    if (won && !gs.won) patch(room, { won: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won]);

  /* co-op win awards (each tab awards its own player; shared marker = rejoin-safe) */
  useEffect(() => {
    if (!gs.won || awardedRef.current) return;
    if (gs.awarded?.[room.me.id]) return;
    awardedRef.current = true;
    awardXP(XP_AWARDS.coopWin);
    syncXpToRoom(room.setShared, room.me.id, room.me.name);
    recordCoopWin();
    sounds.stampThud();
    patch(room, { awarded: { ...(gs.awarded ?? {}), [room.me.id]: true } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gs.won, room.me.id]);

  const startRoom = (id: string) => {
    sounds.paperShuffle();
    awardedRef.current = false;
    setSelectedId(null);
    patch(room, freshEscape(id));
  };

  if (!gs.roomId) {
    return <RoomSelect onStart={startRoom} />;
  }

  const remaining = def.timeMs - (now - (gs.startedAt ?? now));

  return (
    <div className="gk-root gk-modal-scope mx-auto max-w-6xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <SectionTitle eyebrow="ESCAPE ROOM" title={`🔎 ${def.title}`} />
          <p className="max-w-xl text-sm text-[var(--gk-ink-dim)]">{def.intro}</p>
        </div>
        <div className="flex items-center gap-3">
          <TimerChip
            seconds={remaining > 0 ? Math.floor(remaining / 1000) : 0}
            label="TIME"
          />
          <GameButton size="sm" variant="ghost" onClick={() => startRoom(def.id)}>
            ↻ Restart room
          </GameButton>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          <RoomScene
            hotspots={visible}
            selectedId={selectedId}
            unlocked={gs.unlocked ?? {}}
            onSelect={(h) => examine(room, gs, h, setSelectedId)}
          />
          <InventoryBar items={inventory} />
        </div>
        <div className="space-y-3">
          <DetailPanel
            room={room}
            gs={gs}
            hotspot={selected}
            onClose={() => setSelectedId(null)}
          />
          <JournalPanel notes={notes} />
        </div>
      </div>

      <ResultModal
        open={!!gs.won}
        eyebrow={def.title.toUpperCase()}
        headline="Escaped"
        tone="win"
        stat={`${notes.length} CLUE${notes.length === 1 ? '' : 'S'} IN THE JOURNAL · +${XP_AWARDS.coopWin} XP EACH`}
        primaryLabel="Replay room"
        onPrimary={() => startRoom(def.id)}
        secondaryLabel="Other room"
        onSecondary={() => patch(room, { roomId: undefined })}
      />
    </div>
  );
}

/** Examine = open detail + collect note + reveal linked hotspots. */
function examine(
  room: RoomApi,
  gs: EscapeShared,
  h: Hotspot,
  setSelectedId: (id: string) => void,
) {
  setSelectedId(h.id);
  sounds.pinTap();
  const updates: Partial<EscapeShared> = {};
  const canInteract = !h.requires || hasItemRef(room, gs, h.requires);
  if (h.note && !(gs.notes ?? []).includes(h.note.id)) {
    updates.notes = [...(gs.notes ?? []), h.note.id];
    sounds.paperShuffle();
  }
  if (canInteract) {
    const fresh = (h.reveals ?? []).filter((r) => !(gs.revealed ?? []).includes(r));
    if (fresh.length) updates.revealed = [...(gs.revealed ?? []), ...fresh];
  }
  if (Object.keys(updates).length > 0) patch(room, updates);
}

/* hasItem needs the room def — resolve via the shared roomId */
function hasItemRef(room: RoomApi, gs: EscapeShared, itemId: string): boolean {
  const def = getRoomDef(gs.roomId);
  return hasItem(def, gs, itemId);
}

/* ---------------- room select ---------------- */

function RoomSelect({ onStart }: { onStart: (id: string) => void }) {
  return (
    <div className="gk-root mx-auto max-w-3xl">
      <GlassCard className="p-8 text-center">
        <h2 className="type-heading text-2xl">🔎 Escape Room</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-[var(--gk-ink-dim)]">
          Two detectives, one locked room, twenty soft minutes. Examine
          everything, crack the codes, find the exit key — together.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {ESCAPE_ROOMS.map((r) => (
            <motion.button
              key={r.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => onStart(r.id)}
              className="manila-folder p-5 text-left transition hover:!border-[var(--amber-glow)]"
            >
              <div className="type-heading text-lg">{r.title}</div>
              <p className="mt-1 text-sm text-[var(--gk-ink-dim)]">{r.blurb}</p>
              <div className="eyebrow mt-2">{r.hotspots.length} hotspots · 20:00</div>
            </motion.button>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

/* ---------------- room scene ---------------- */

function RoomScene({
  hotspots,
  selectedId,
  unlocked,
  onSelect,
}: {
  hotspots: Hotspot[];
  selectedId: string | null;
  unlocked: Record<string, boolean>;
  onSelect: (h: Hotspot) => void;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-[var(--glass-border)]"
      style={{
        aspectRatio: '16 / 9.5',
        background:
          'radial-gradient(120% 90% at 72% -6%, rgba(232,163,61,0.20) 0%, rgba(232,163,61,0.05) 40%, transparent 60%), linear-gradient(180deg, #221a12 0%, #171009 55%, #0e0a06 100%)',
      }}
    >
      {/* faint floorboards */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] opacity-25"
        style={{
          background:
            'repeating-linear-gradient(90deg, rgba(0,0,0,0.5) 0 2px, transparent 2px 72px), linear-gradient(180deg, #2b1f12, #17100a)',
        }}
      />
      {hotspots.map((h) => (
        <motion.button
          key={h.id}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => onSelect(h)}
          className={`er-hotspot absolute -translate-x-1/2 -translate-y-1/2 ${selectedId === h.id ? 'er-hotspot--selected' : ''}`}
          style={{ left: `${h.pos.x}%`, top: `${h.pos.y}%` }}
          title={h.name}
          aria-label={`Examine ${h.name}`}
        >
          <span aria-hidden>{h.icon}</span>
          {h.lock && !unlocked[h.id] && (
            <span className="er-hotspot__lock" aria-hidden>
              🔒
            </span>
          )}
        </motion.button>
      ))}
      <div className="pointer-events-none absolute bottom-2 left-3 font-type text-[0.65rem] tracking-[0.2em] text-[var(--gk-ink-faint)]">
        CRIME SCENE — DO NOT CROSS
      </div>
    </div>
  );
}

/* ---------------- inventory ---------------- */

function InventoryBar({ items }: { items: { id: string; name: string; icon: string }[] }) {
  return (
    <div className="glass-card !rounded-2xl p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="eyebrow">🎒 Shared inventory</span>
        <span className="font-type text-xs text-[var(--gk-ink-dim)]">{items.length} items</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-[var(--gk-ink-faint)]">
          Empty pockets. Examine the room — anything you take appears here for both detectives.
        </p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {items.map((it) => (
            <span key={it.id} className="er-item" title={it.name}>
              <span className="er-item__icon" aria-hidden>{it.icon}</span>
              <span>
                <span className="er-item__name">{it.name}</span>
                <span className="er-item__tag">Evidence</span>
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- detail panel ---------------- */

function DetailPanel({
  room,
  gs,
  hotspot,
  onClose,
}: {
  room: RoomApi;
  gs: EscapeShared;
  hotspot: Hotspot | undefined;
  onClose: () => void;
}) {
  const [code, setCode] = useState('');
  const [badCode, setBadCode] = useState(false);

  useEffect(() => {
    setCode('');
    setBadCode(false);
  }, [hotspot?.id]);

  if (!hotspot) {
    return (
      <div className="glass-card !rounded-2xl p-4">
        <span className="eyebrow">🔍 Examine</span>
        <p className="mt-2 text-sm text-[var(--gk-ink-dim)]">
          Click a hotspot in the room to examine it. Clues land in the journal —
          both detectives share everything.
        </p>
      </div>
    );
  }

  const h = hotspot;
  const isUnlocked = !h.lock || gs.unlocked?.[h.id];
  const taken = !!gs.taken?.[h.id];
  const needItem = h.requires && !hasItemRef(room, gs, h.requires);
  const takeable = !taken && (h.item || (h.inside && isUnlocked));
  const foundNote = h.note && (gs.notes ?? []).includes(h.note.id);

  const take = () => {
    sounds.pinTap();
    patch(room, { taken: { ...(gs.taken ?? {}), [h.id]: true } });
  };

  const submitCode = () => {
    if (tryCode(h, code)) {
      patch(room, { unlocked: { ...(gs.unlocked ?? {}), [h.id]: true } });
      sounds.stampThud();
      setBadCode(false);
    } else {
      setBadCode(true);
      sounds.typewriterClick();
    }
  };

  return (
    <motion.div
      key={h.id}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      className="manila-folder p-5"
    >
      <div className="flex items-start justify-between">
        <h3 className="type-heading text-lg">
          {h.icon} {h.name}
        </h3>
        <button onClick={onClose} className="text-[var(--gk-ink-dim)] hover:text-[var(--gk-ink)]">
          ✕
        </button>
      </div>
      <p className="mt-2 text-sm text-[var(--gk-ink-dim)]">{h.desc}</p>

      {foundNote && h.note && (
        <div className="paper-strip mt-3 p-3">
          <div className="eyebrow">📝 {h.note.title}</div>
          <p className="mt-1 font-type text-xs leading-relaxed">{h.note.text}</p>
        </div>
      )}

      {needItem && (
        <p className="mt-3 rounded-xl border border-[var(--blood)] bg-[rgba(179,38,30,0.12)] p-3 text-xs text-[var(--gk-ink)]">
          🔒 {h.requiresHint ?? 'You need something to use this.'}
        </p>
      )}

      {h.lock && !isUnlocked && !needItem && (
        <div className="mt-3">
          <div className="eyebrow mb-1">4-digit combination</div>
          <p className="mb-2 text-xs italic text-[var(--gk-ink-dim)]">Hint: {h.lock.hint}</p>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              inputMode="numeric"
              maxLength={4}
              className={`noir-input w-28 text-center font-type text-xl tracking-[0.3em] ${badCode ? 'border-[var(--blood-bright)]' : ''}`}
            />
            <GameButton onClick={submitCode}>
              Unlock
            </GameButton>
          </div>
          {badCode && (
            <p className="mt-1 text-xs text-[var(--blood-bright)]">
              Wrong code — the tumblers refuse to turn.
            </p>
          )}
        </div>
      )}

      {takeable && !needItem && (
        <GameButton onClick={take} className="mt-3 w-full">
          ✋ Take {(h.item ?? h.inside)!.name} {(h.item ?? h.inside)!.icon}
        </GameButton>
      )}
      {taken && (
        <p className="mt-3 text-xs text-[var(--gk-ink-faint)]">Picked clean — nothing left here.</p>
      )}
      {isUnlocked && h.lock && !taken && !h.inside && (
        <p className="mt-3 text-xs text-[var(--gk-ink-faint)]">Unlocked — empty.</p>
      )}
    </motion.div>
  );
}

/* ---------------- journal ---------------- */

function JournalPanel({ notes }: { notes: { id: string; title: string; text: string }[] }) {
  return (
    <div className="glass-card !rounded-2xl p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="eyebrow">📓 Clue journal</span>
        <span className="font-type text-xs text-[var(--gk-ink-dim)]">{notes.length} found</span>
      </div>
      {notes.length === 0 ? (
        <p className="text-xs text-[var(--gk-ink-faint)]">No clues yet. Examine the room.</p>
      ) : (
        <div className="max-h-56 space-y-2 overflow-y-auto">
          {notes.map((n) => (
            <div key={n.id} className="paper-strip p-2.5">
              <div className="eyebrow !text-[0.65rem]">{n.title}</div>
              <p className="mt-0.5 font-type text-[0.72rem] leading-relaxed">{n.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
