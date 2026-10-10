'use client';

/* Full-page evidence-board canvas: a 3000x2000 pannable/zoomable world.
 * - drag empty space to pan, wheel/pinch to zoom (0.4x..2x)
 * - cards drag via pointer events; positions commit to room.shared on release
 * - link mode: tap one card, then another, to string them together
 * - partner presence is MOCKED with local state (cursor + nudges)
 * No framer-motion here — pointer events only. */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MousePointer2 } from 'lucide-react';
import type { CaseFile, Clue } from '../../../../lib/content/cases';
import { clampPos, defaultPins, linkExists, toggleLink } from '../../logic';
import type { BoardSticky, MysteryShared } from '../../types';
import { sounds } from '../../../../lib/sound';
import {
  WORLD_W,
  WORLD_H,
  fitCamera,
  screenToWorld,
  worldToPct,
  pctToWorld,
  zoomToward,
  type Camera,
  type Pt,
} from './boardMath';
import { StringLayer, type CardRect } from './StringLayer';
import { CardVisual, type CardKind } from './EvidenceCard';
import { SealedVisual } from './SealedCard';
import { Toolbar } from './Toolbar';

const CLUE_W = 220;
const SUSPECT_W = 150;
const STICKY_W = 180;
const TAP_SLOP = 6; // px — below this a press counts as a tap

function hashRot(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return (Math.abs(h) % 70) / 10 - 3.5;
}

interface BoardItem {
  id: string;
  kind: CardKind;
  pos: Pt; // world px, top-left
  rotate: number;
  w: number;
}

export function BoardCanvas({
  caseFile,
  gs,
  patch,
  mine,
  onOpenSuspect,
  onAddSticky,
}: {
  caseFile: CaseFile;
  gs: MysteryShared;
  patch: (p: MysteryShared) => void;
  mine: Clue[];
  onOpenSuspect: (name: string) => void;
  onAddSticky: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [cam, setCamState] = useState<Camera>({ x: 0, y: 0, scale: 0.5 });
  const camRef = useRef(cam);
  const setCam = (c: Camera | ((p: Camera) => Camera)) =>
    setCamState((prev) => {
      const next = typeof c === 'function' ? (c as (p: Camera) => Camera)(prev) : c;
      camRef.current = next;
      return next;
    });

  const [linkMode, setLinkMode] = useState(false);
  const [linkSel, setLinkSel] = useState<string | null>(null);
  const [previewAt, setPreviewAt] = useState<Pt | null>(null); // screen px
  const [live, setLive] = useState<Record<string, Pt>>({});
  const [editingSticky, setEditingSticky] = useState<string | null>(null);
  const [frontId, setFrontId] = useState<string | null>(null);

  const pins = gs.pins ?? {};
  const links = gs.links ?? [];
  const stickies: BoardSticky[] = gs.stickies ?? [];

  const mineIds = useMemo(() => new Set(mine.map((c) => c.id)), [mine]);
  const clueById = useMemo(() => {
    const m = new Map<string, Clue>();
    for (const c of caseFile.clues) m.set(c.id, c);
    for (const c of mine) m.set(c.id, c);
    return m;
  }, [caseFile, mine]);

  /* ---- items in world coords ---- */
  const items: BoardItem[] = useMemo(() => {
    const arr: BoardItem[] = [];
    caseFile.clues.forEach((c, i) => {
      const fallback = { x: 8 + ((i * 37) % 70), y: 6 + ((i * 23) % 52) };
      arr.push({
        id: c.id,
        kind: 'clue',
        pos: pctToWorld(pins[c.id] ?? fallback),
        rotate: hashRot(c.id),
        w: CLUE_W,
      });
    });
    if (gs.bonusRevealed) {
      const bonus = mine.find((c) => !caseFile.clues.some((k) => k.id === c.id));
      if (bonus && !arr.some((a) => a.id === bonus.id)) {
        arr.push({
          id: bonus.id,
          kind: 'clue',
          pos: pctToWorld(pins[bonus.id] ?? { x: 70, y: 60 }),
          rotate: hashRot(bonus.id),
          w: CLUE_W,
        });
      }
    }
    const n = caseFile.suspects.length;
    caseFile.suspects.forEach((s, i) => {
      const key = `suspect:${s.name}`;
      const fb = { x: 6 + (i * 82) / Math.max(1, n - 1), y: 78 };
      arr.push({
        id: key,
        kind: 'suspect',
        pos: pctToWorld(pins[key] ?? fb),
        rotate: hashRot(key),
        w: SUSPECT_W,
      });
    });
    stickies.forEach((st) => {
      arr.push({ id: st.id, kind: 'sticky', pos: pctToWorld(st.pos), rotate: st.rotate, w: STICKY_W });
    });
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseFile, pins, gs.bonusRevealed, mine, stickies]);

  const posOf = (id: string): Pt => {
    const it = items.find((i) => i.id === id);
    return live[id] ?? it?.pos ?? { x: 100, y: 100 };
  };

  const commitPos = (id: string, world: Pt) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const pct = clampPos(worldToPct(world));
    if (item.kind === 'sticky') {
      patch({ stickies: stickies.map((s) => (s.id === id ? { ...s, pos: pct } : s)) });
    } else {
      patch({ pins: { ...pins, [id]: pct } });
    }
  };

  /* ---- fit / reset ---- */
  const fit = () => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCam(fitCamera(r.width, r.height));
  };
  useLayoutEffect(() => {
    fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetBoard = () => {
    setLive({});
    setLinkSel(null);
    patch({ pins: defaultPins(caseFile.clues) });
    fit();
  };

  /* ---- wheel zoom (non-passive) ---- */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const at = { x: e.clientX - r.left, y: e.clientY - r.top };
      setCam((prev) => zoomToward(prev, at, Math.exp(-e.deltaY * 0.0012)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  /* ---- background pan + pinch ---- */
  const bgPointers = useRef(new Map<number, Pt>());
  const panState = useRef<{ cam: Camera; lastMid: Pt; lastDist: number } | null>(null);

  const bgDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-card]')) return;
    const el = wrapRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    const r = el.getBoundingClientRect();
    const p = { x: e.clientX - r.left, y: e.clientY - r.top };
    bgPointers.current.set(e.pointerId, p);
    if (bgPointers.current.size === 2) {
      const [a, b] = [...bgPointers.current.values()];
      panState.current = {
        cam: camRef.current,
        lastMid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        lastDist: Math.hypot(a.x - b.x, a.y - b.y),
      };
    } else {
      panState.current = { cam: camRef.current, lastMid: p, lastDist: 0 };
    }
    setPreviewAt(null);
  };

  const bgMove = (e: React.PointerEvent) => {
    // link-mode string preview follows the cursor
    if (linkMode && linkSel) {
      const el = wrapRef.current;
      if (el) {
        const r = el.getBoundingClientRect();
        setPreviewAt({ x: e.clientX - r.left, y: e.clientY - r.top });
      }
    }
    const st = panState.current;
    if (!st || !bgPointers.current.has(e.pointerId)) return;
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    bgPointers.current.set(e.pointerId, { x: e.clientX - r.left, y: e.clientY - r.top });
    const pts = [...bgPointers.current.values()];
    if (pts.length >= 2) {
      const [a, b] = pts;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      let cam = st.cam;
      if (st.lastDist > 0 && dist > 0) cam = zoomToward(cam, mid, dist / st.lastDist);
      cam = { ...cam, x: cam.x + (mid.x - st.lastMid.x), y: cam.y + (mid.y - st.lastMid.y) };
      setCam(cam);
      panState.current = { cam, lastMid: mid, lastDist: dist };
    } else {
      const p = pts[0];
      setCam({ ...st.cam, x: st.cam.x + (p.x - st.lastMid.x), y: st.cam.y + (p.y - st.lastMid.y) });
    }
  };

  const bgUp = (e: React.PointerEvent) => {
    bgPointers.current.delete(e.pointerId);
    if (bgPointers.current.size === 0) panState.current = null;
    else if (bgPointers.current.size === 1) {
      const [p] = [...bgPointers.current.values()];
      panState.current = { cam: camRef.current, lastMid: p, lastDist: 0 };
    }
  };

  /* ---- card drag (pointer events) ---- */
  const dragRef = useRef<{
    id: string;
    sx: number;
    sy: number;
    start: Pt;
    moved: boolean;
  } | null>(null);

  const cardDown = (e: React.PointerEvent, item: BoardItem) => {
    e.stopPropagation();
    if (editingSticky === item.id) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      id: item.id,
      sx: e.clientX,
      sy: e.clientY,
      start: posOf(item.id),
      moved: false,
    };
    setFrontId(item.id);
  };

  const cardMove = (e: React.PointerEvent, item: BoardItem) => {
    const d = dragRef.current;
    if (!d || d.id !== item.id) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < TAP_SLOP) return;
    d.moved = true;
    const s = camRef.current.scale;
    const nx = Math.max(0, Math.min(WORLD_W - item.w, d.start.x + dx / s));
    const ny = Math.max(0, Math.min(WORLD_H - 60, d.start.y + dy / s));
    setLive((prev) => ({ ...prev, [item.id]: { x: nx, y: ny } }));
  };

  const cardUp = (e: React.PointerEvent, item: BoardItem) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || d.id !== item.id) return;
    const p = live[item.id];
    if (!d.moved) {
      onCardTap(item);
      return;
    }
    setLive((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
    if (p) {
      sounds.pinTap();
      commitPos(item.id, p);
    }
  };

  /* ---- tap: link mode / open suspect / edit sticky ---- */
  const onCardTap = (item: BoardItem) => {
    if (linkMode) {
      if (linkSel === null) {
        setLinkSel(item.id);
        sounds.typewriterClick();
      } else if (linkSel === item.id) {
        setLinkSel(null);
      } else {
        const next = toggleLink(links, linkSel, item.id);
        if (next.length !== links.length || linkExists(next, linkSel, item.id)) sounds.pinTap();
        patch({ links: next });
        setLinkSel(null);
        setPreviewAt(null);
      }
      return;
    }
    if (item.kind === 'suspect') {
      sounds.paperShuffle();
      onOpenSuspect(item.id.replace(/^suspect:/, ''));
    }
    if (item.kind === 'sticky') setEditingSticky(item.id);
  };

  const deleteSticky = (id: string) => {
    patch({ stickies: stickies.filter((s) => s.id !== id) });
    setEditingSticky(null);
  };

  /* ---- partner presence (MOCK — local state only) ---- */
  const [mockCursor, setMockCursor] = useState<Pt>({ x: 1500, y: 1000 });
  const [mockNudge, setMockNudge] = useState<{ id: string; dx: number; dy: number } | null>(null);
  useEffect(() => {
    let t = Math.random() * 10;
    let raf = 0;
    const tick = () => {
      t += 0.006;
      setMockCursor({
        x: 1500 + Math.cos(t) * 800,
        y: 1000 + Math.sin(t * 1.4) * 500,
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  useEffect(() => {
    if (items.length === 0) return;
    const iv = setInterval(() => {
      const pick = items[Math.floor(Math.random() * items.length)];
      setMockNudge({
        id: pick.id,
        dx: (Math.random() - 0.5) * 140,
        dy: (Math.random() - 0.5) * 100,
      });
      setTimeout(() => setMockNudge(null), 2600);
    }, 14000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, caseFile.id]);

  /* ---- strings ---- */
  const rects = useMemo(() => {
    const m = new Map<string, CardRect>();
    for (const it of items) {
      const p = live[it.id] ?? it.pos;
      m.set(it.id, { id: it.id, x: p.x, y: p.y, w: it.w });
    }
    return m;
  }, [items, live]);

  const previewWorld = useMemo(() => {
    if (!linkMode || !linkSel || !previewAt) return null;
    const r = rects.get(linkSel);
    if (!r) return null;
    return {
      from: { x: r.x + r.w / 2, y: r.y + 10 },
      to: screenToWorld(previewAt, camRef.current),
    };
  }, [linkMode, linkSel, previewAt, rects]);

  return (
    <div
      ref={wrapRef}
      className="cm-canvas-wrap"
      onPointerDown={bgDown}
      onPointerMove={bgMove}
      onPointerUp={bgUp}
      onPointerCancel={bgUp}
    >
      <div
        className="cm-canvas-world"
        style={{
          transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.scale})`,
        }}
      >
        <StringLayer links={links} rects={rects} preview={previewWorld} />

        {items.map((item) => {
          const p = live[item.id] ?? item.pos;
          const nudge = mockNudge?.id === item.id ? mockNudge : null;
          const px = p.x + (nudge?.dx ?? 0);
          const py = p.y + (nudge?.dy ?? 0);
          const isEditing = editingSticky === item.id;
          const clue = item.kind === 'clue' ? clueById.get(item.id) : undefined;
          const isMine = item.kind === 'clue' ? mineIds.has(item.id) : true;
          const sticky = item.kind === 'sticky' ? stickies.find((s) => s.id === item.id) : undefined;
          return (
            <div
              key={item.id}
              data-card={item.id}
              className="cm-card"
              data-selected={linkSel === item.id}
              data-partner={nudge ? 'true' : undefined}
              onPointerDown={(e) => cardDown(e, item)}
              onPointerMove={(e) => cardMove(e, item)}
              onPointerUp={(e) => cardUp(e, item)}
              onPointerCancel={() => {
                dragRef.current = null;
              }}
              style={{
                left: px,
                top: py,
                width: item.w,
                transform: `rotate(${item.rotate}deg)`,
                zIndex: frontId === item.id ? 60 : linkSel === item.id ? 50 : 10,
                touchAction: 'none',
                cursor: linkMode ? 'crosshair' : 'grab',
              }}
            >
              <span className="cm-pin" />
              {item.kind === 'clue' && !isMine ? (
                <SealedVisual />
              ) : (
                <CardVisual
                  kind={item.kind}
                  caseFile={caseFile}
                  clue={clue}
                  suspectName={
                    item.kind === 'suspect' ? item.id.replace(/^suspect:/, '') : undefined
                  }
                  sticky={sticky}
                  stickies={stickies}
                  mine={isMine}
                  editing={isEditing}
                  setEditing={(v) => setEditingSticky(v ? item.id : null)}
                  onDeleteSticky={() => deleteSticky(item.id)}
                  patch={patch}
                />
              )}
            </div>
          );
        })}

        {/* mocked partner cursor (counter-scaled to stay constant size) */}
        <div
          className="cm-partner-cursor"
          style={{
            left: mockCursor.x,
            top: mockCursor.y,
            transform: `scale(${1 / cam.scale})`,
          }}
          aria-hidden
        >
          <MousePointer2 size={22} />
          <span>PARTNER</span>
        </div>
      </div>

      <Toolbar
        linkMode={linkMode}
        linkSel={linkSel !== null}
        linksCount={links.length}
        onToggleLinkMode={() => {
          setLinkMode(!linkMode);
          setLinkSel(null);
          setPreviewAt(null);
        }}
        onAddSticky={onAddSticky}
        onFit={fit}
        onReset={resetBoard}
      />

    </div>
  );
}

// re-export world size for CSS/tests consumers
export { WORLD_W, WORLD_H };
