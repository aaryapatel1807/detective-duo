'use client';

/* The cork evidence board: draggable polaroids/notes/reports, suspect
 * portrait cards, detective sticky notes, red pins, and live red strings.
 * Positions sync through room.shared (gs.pins / gs.stickies).
 * framer-motion v10: only motion.div wrappers are animated. */

import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Plus, X } from 'lucide-react';
import type { CaseFile, Clue } from '../../../lib/content/cases';
import {
  clampPos,
  linkExists,
  toggleLink,
} from '../logic';
import type { BoardSticky, MysteryShared, PinPos, Side } from '../types';
import { sounds } from '../../../lib/sound';

const CARD_W = 200;

function hashRot(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return (Math.abs(h) % 70) / 10 - 3.5; // -3.5..3.5 deg
}

interface BoardItem {
  id: string;
  kind: 'clue' | 'suspect' | 'sticky';
  pos: PinPos;
  rotate: number;
}

export function EvidenceBoard({
  caseFile,
  gs,
  patch,
  mySide,
  mine,
  onOpenSuspect,
  onAddClue,
}: {
  caseFile: CaseFile;
  gs: MysteryShared;
  patch: (p: MysteryShared) => void;
  mySide: Side;
  mine: Clue[];
  onOpenSuspect: (name: string) => void;
  onAddClue: () => void;
}) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [linkMode, setLinkMode] = useState(false);
  const [linkSel, setLinkSel] = useState<string | null>(null);
  const [live, setLive] = useState<Record<string, PinPos>>({});
  const [editingSticky, setEditingSticky] = useState<string | null>(null);
  const dragStart = useRef<{ id: string; px: number; py: number } | null>(null);

  const pins = gs.pins ?? {};
  const links = gs.links ?? [];
  const stickies = gs.stickies ?? [];

  const mineIds = useMemo(() => new Set(mine.map((c) => c.id)), [mine]);
  const clueById = useMemo(() => {
    const m = new Map<string, Clue>();
    for (const c of caseFile.clues) m.set(c.id, c);
    for (const c of mine) m.set(c.id, c);
    return m;
  }, [caseFile, mine]);

  /* ---- build the data array: clues + suspects + stickies ---- */
  const items: BoardItem[] = useMemo(() => {
    const arr: BoardItem[] = [];
    const n = caseFile.suspects.length;
    caseFile.clues.forEach((c, i) => {
      const fallback = { x: 8 + ((i * 37) % 70), y: 6 + ((i * 23) % 52) };
      arr.push({
        id: c.id,
        kind: 'clue',
        pos: pins[c.id] ?? fallback,
        rotate: hashRot(c.id),
      });
    });
    if (gs.bonusRevealed) {
      const bonus = mine.find((c) => !caseFile.clues.some((k) => k.id === c.id));
      if (bonus && !arr.some((a) => a.id === bonus.id)) {
        arr.push({
          id: bonus.id,
          kind: 'clue',
          pos: pins[bonus.id] ?? { x: 70, y: 60 },
          rotate: hashRot(bonus.id),
        });
      }
    }
    caseFile.suspects.forEach((s, i) => {
      const key = `suspect:${s.name}`;
      arr.push({
        id: key,
        kind: 'suspect',
        pos: pins[key] ?? { x: 6 + (i * 82) / Math.max(1, n - 1), y: 80 },
        rotate: hashRot(key),
      });
    });
    stickies.forEach((st) => {
      arr.push({ id: st.id, kind: 'sticky', pos: st.pos, rotate: st.rotate });
    });
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseFile, pins, gs.bonusRevealed, mine, stickies]);

  const posOf = (id: string): PinPos => {
    const it = items.find((i) => i.id === id);
    return live[id] ?? it?.pos ?? { x: 10, y: 10 };
  };

  const commitPos = (id: string, pos: PinPos) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    if (item.kind === 'sticky') {
      patch({
        stickies: stickies.map((s) => (s.id === id ? { ...s, pos } : s)),
      });
    } else {
      patch({ pins: { ...pins, [id]: pos } });
    }
  };

  /* ---- drag handlers (framer-motion drag on the wrapper) ---- */
  const onDragStartItem = (id: string) => {
    const p = posOf(id);
    dragStart.current = { id, px: p.x, py: p.y };
  };

  const onDragItem = (id: string, offsetX: number, offsetY: number) => {
    const el = boardRef.current;
    const s = dragStart.current;
    if (!el || !s || s.id !== id) return;
    const r = el.getBoundingClientRect();
    const nx = clampPos({
      x: s.px + (offsetX / r.width) * 100,
      y: s.py + (offsetY / r.height) * 100,
    });
    setLive((prev) => ({ ...prev, [id]: nx }));
  };

  const onDragEndItem = (id: string) => {
    const p = live[id];
    dragStart.current = null;
    setLive((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (p) {
      sounds.pinTap();
      commitPos(id, p);
    }
  };

  /* ---- link mode tap ---- */
  const onCardTap = (id: string, kind: BoardItem['kind']) => {
    if (linkMode) {
      if (linkSel === null) {
        setLinkSel(id);
        sounds.typewriterClick();
      } else if (linkSel === id) {
        setLinkSel(null);
      } else {
        const next = toggleLink(links, linkSel, id);
        if (next.length !== links.length || linkExists(next, linkSel, id))
          sounds.pinTap();
        patch({ links: next });
        setLinkSel(null);
      }
      return;
    }
    if (kind === 'suspect') {
      const name = id.replace(/^suspect:/, '');
      sounds.paperShuffle();
      onOpenSuspect(name);
    }
    if (kind === 'sticky') setEditingSticky(id);
  };

  const deleteSticky = (id: string) => {
    patch({ stickies: stickies.filter((s) => s.id !== id) });
    setEditingSticky(null);
  };

  const strings = links
    .filter((l) => items.some((i) => i.id === l.a) && items.some((i) => i.id === l.b))
    .map((l) => {
      const a = posOf(l.a);
      const b = posOf(l.b);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2 + 5; // sag
      return { key: `${l.a}-${l.b}`, d: `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}` };
    });

  const partnerName = 'partner';

  return (
    <div>
      <div className="cm-board-tools">
        <button
          onClick={() => {
            setLinkMode(!linkMode);
            setLinkSel(null);
            sounds.typewriterClick();
          }}
          className={linkMode ? 'cm-btn-gold' : 'cm-btn-ghost'}
          style={linkMode ? {} : undefined}
        >
          🧶 {linkMode ? 'Linking… tap two cards' : 'Link with red string'}
        </button>
        <button onClick={onAddClue} className="cm-btn-ghost">
          <Plus size={14} /> Sticky note
        </button>
        <span className="cm-board-hint">
          drag cards to arrange · {mine.length} clues in your hands
          {linkMode && linkSel ? ' · one end pinned — tap another card' : ''}
        </span>
      </div>

      <div className="cm-board-frame">
        <div ref={boardRef} className="cm-board">
          <svg
            className="cm-strings"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            {strings.map((s) => (
              <path key={s.key} d={s.d} vectorEffect="non-scaling-stroke" fill="none" />
            ))}
          </svg>

          {items.map((item) => {
            const p = live[item.id] ?? item.pos;
            const w = item.kind === 'suspect' ? 132 : item.kind === 'sticky' ? 164 : CARD_W;
            const isEditing = editingSticky === item.id;
            return (
              <motion.div
                key={item.id}
                className="cm-card"
                data-selected={linkSel === item.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                drag={!isEditing}
                dragMomentum={false}
                dragElastic={0}
                onDragStart={() => onDragStartItem(item.id)}
                onDrag={(_, info) => onDragItem(item.id, info.offset.x, info.offset.y)}
                onDragEnd={() => onDragEndItem(item.id)}
                onTap={() => onCardTap(item.id, item.kind)}
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  width: w,
                  zIndex: live[item.id] ? 30 : linkSel === item.id ? 20 : 10,
                  touchAction: linkMode || isEditing ? 'pan-y' : 'none',
                  cursor: linkMode ? 'crosshair' : 'grab',
                }}
              >
                <span className="cm-pin" />
                <CardBody
                  item={item}
                  caseFile={caseFile}
                  clueById={clueById}
                  mineIds={mineIds}
                  stickies={stickies}
                  editing={isEditing}
                  setEditing={(v) => setEditingSticky(v ? item.id : null)}
                  onDeleteSticky={() => deleteSticky(item.id)}
                  patch={patch}
                  partnerName={partnerName}
                />
              </motion.div>
            );
          })}
        </div>
      </div>

      {links.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {links.map((l, i) => (
            <span
              key={`${l.a}-${l.b}-${i}`}
              className="cm-font-mono inline-flex items-center gap-2 rounded-full border border-[var(--cm-red)] px-3 py-1 text-xs"
            >
              🧶 {shortLabel(l.a)} ↔ {shortLabel(l.b)}
              <button
                onClick={() => patch({ links: toggleLink(links, l.a, l.b) })}
                className="text-[var(--cm-red)] hover:scale-125"
                aria-label="remove string"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function shortLabel(id: string): string {
  return id.replace(/^suspect:/, '').split('-').slice(-1)[0].toUpperCase().slice(0, 10);
}

function CardBody({
  item,
  caseFile,
  clueById,
  mineIds,
  stickies,
  editing,
  setEditing,
  onDeleteSticky,
  patch,
  partnerName,
}: {
  item: BoardItem;
  caseFile: CaseFile;
  clueById: Map<string, Clue>;
  mineIds: Set<string>;
  stickies: BoardSticky[];
  editing: boolean;
  setEditing: (v: boolean) => void;
  onDeleteSticky: () => void;
  patch: (p: MysteryShared) => void;
  partnerName: string;
}) {
  const innerStyle = {
    transform: `translateX(-50%) rotate(${item.rotate}deg)`,
    marginTop: 4,
    width: '100%',
  } as const;

  if (item.kind === 'suspect') {
    const name = item.id.replace(/^suspect:/, '');
    const s = caseFile.suspects.find((x) => x.name === name);
    if (!s) return null;
    return (
      <div className="cm-card-suspect" style={{ width: 130 }}>
        <div className="cm-card-inner" style={innerStyle}>
          {s.portrait && <img src={s.portrait} alt={s.name} draggable={false} />}
          <div className="who">{s.name.toUpperCase()}</div>
        </div>
      </div>
    );
  }

  if (item.kind === 'sticky') {
    const st = stickies.find((s) => s.id === item.id);
    if (!st) return null;
    return (
      <div className="cm-card-sticky" style={{ width: 160 }}>
        <div className="cm-card-inner" style={innerStyle}>
          {editing ? (
            <div onPointerDown={(e) => e.stopPropagation()}>
              <textarea
                autoFocus
                value={st.text}
                rows={3}
                onChange={(e) =>
                  patch({
                    stickies: stickies.map((x) =>
                      x.id === st.id ? { ...x, text: e.target.value } : x,
                    ),
                  })
                }
                onBlur={() => setEditing(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) setEditing(false);
                }}
                className="cm-font-hand w-full bg-transparent text-[1.3rem] leading-tight text-[#3d3413] outline-none"
              />
              <button
                onClick={onDeleteSticky}
                className="mt-1 inline-flex items-center gap-1 text-xs text-red-800"
              >
                <X size={12} /> remove
              </button>
            </div>
          ) : (
            <div className="hand-text">
              <Pencil size={12} className="mb-1 opacity-50" />
              <div>{st.text || 'New lead…'}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // clue
  const isMine = mineIds.has(item.id);
  const clue = clueById.get(item.id);
  const card = clue?.card ?? 'note';

  if (!isMine) {
    return (
      <div className="cm-card-sealed" style={{ width: CARD_W }}>
        <div className="cm-card-inner" style={innerStyle}>
          <div className="cm-font-mono text-[0.62rem] tracking-[0.24em]">🔒 SEALED</div>
          <p className="cm-font-mono mt-2 text-[0.72rem] leading-snug opacity-70">
            {partnerName}&apos;s evidence.
            <br />
            Ask them about it.
          </p>
        </div>
      </div>
    );
  }

  if (card === 'polaroid' && clue?.art) {
    return (
      <div className="cm-card-polaroid" style={{ width: CARD_W }}>
        <div className="cm-card-inner" style={innerStyle}>
          <img className="evidence" src={clue.art} alt={clue.label ?? 'evidence'} draggable={false} />
          <div className="caption">{clue.label ?? ''}</div>
        </div>
      </div>
    );
  }

  if (card === 'report') {
    return (
      <div className="cm-card-report" style={{ width: CARD_W }}>
        <div className="cm-card-inner" style={innerStyle}>
          <div className="cm-exhibit-tag">EXHIBIT · {clue?.label ?? item.id.toUpperCase()}</div>
          <p className="cm-report-text">{clue?.text}</p>
        </div>
      </div>
    );
  }

  // note (handwritten)
  return (
    <div className="cm-card-note" style={{ width: CARD_W }}>
      <div className="cm-card-inner" style={innerStyle}>
        <div className="cm-exhibit-tag">{clue?.label ?? item.id.toUpperCase()}</div>
        <p className="hand-text">{clue?.text}</p>
      </div>
    </div>
  );
}
