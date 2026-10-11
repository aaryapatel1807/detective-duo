'use client';

/* Coloring — solo file. Four hand-authored noir line-art pages.
 * Pick a palette color, click a region to fill it. Finished pieces are
 * saved to localStorage; the first finish of each page awards XP.
 */

import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameProps } from '../types';
import { GlassCard } from '../../components/GlassCard';
import { awardXP, syncXpToRoom, XP_AWARDS } from '../../lib/xp';
import { readJSON, writeJSON } from '../../lib/store';
import { sounds } from '../../lib/sound';
import { PAGES, PALETTE, type ArtDecor, type ArtRegion, type ShapeKind } from './art';
import { filledCount, isComplete, setFill, type Fills } from './logic';
import type { ColoringSaves } from './types';
import '../ui-kit/kit.css';
import { GameButton, SectionTitle } from '../ui-kit';

const SAVES_KEY = 'dd-coloring-saves';

function Shape({
  kind,
  attrs,
  fill,
  onClick,
  decor,
}: {
  kind: ShapeKind;
  attrs: Record<string, string | number>;
  fill?: string;
  onClick?: () => void;
  decor?: boolean;
}) {
  const common = {
    ...attrs,
    fill: decor ? 'none' : (fill ?? 'rgba(0,0,0,0)'),
    stroke: 'currentColor',
    strokeWidth: decor ? 2 : 2.5,
    strokeLinejoin: 'round' as const,
    onClick,
    style: onClick ? { cursor: 'pointer' } : undefined,
    pointerEvents: decor ? ('none' as const) : undefined,
  };
  if (kind === 'path') return <path {...common} />;
  if (kind === 'circle') return <circle {...common} />;
  if (kind === 'ellipse') return <ellipse {...common} />;
  return <rect {...common} />;
}

export default function ColoringGame({ room }: GameProps) {
  const [pageId, setPageId] = useState(PAGES[0].id);
  const [color, setColor] = useState(PALETTE[0].hex);
  const [saves, setSaves] = useState<ColoringSaves>(() => readJSON<ColoringSaves>(SAVES_KEY, {}));

  const page = PAGES.find((p) => p.id === pageId) ?? PAGES[0];
  const fills: Fills = saves[page.id]?.fills ?? {};
  const done = saves[page.id]?.done ?? isComplete(page, fills);

  const persist = useCallback((next: ColoringSaves) => {
    setSaves(next);
    writeJSON(SAVES_KEY, next);
  }, []);

  const paint = (region: ArtRegion) => {
    sounds.pinTap();
    const nextFills = setFill(fills, region.id, color);
    const prev = saves[page.id];
    const nowDone = isComplete(page, nextFills);
    const next: ColoringSaves = {
      ...saves,
      [page.id]: { fills: nextFills, done: nowDone || prev?.done === true, awarded: prev?.awarded === true },
    };
    if (nowDone && !prev?.awarded) {
      next[page.id].awarded = true;
      awardXP(XP_AWARDS.soloWin);
      syncXpToRoom(room.setShared, room.me.id, room.me.name);
      sounds.stampThud();
    }
    persist(next);
  };

  const clearPage = () => {
    sounds.paperShuffle();
    const prev = saves[page.id];
    persist({
      ...saves,
      [page.id]: { fills: {}, done: false, awarded: prev?.awarded === true },
    });
  };

  const finishedPages = PAGES.filter((p) => saves[p.id]?.done).length;

  return (
    <div className="gk-root mx-auto max-w-xl">
      <div className="mb-4 text-center">
        <SectionTitle eyebrow="THE SKETCHBOOK" title="Coloring" />
        <p className="mt-2 text-sm text-[var(--ink-dim)]">
          Pick a color, click a region. Finished pieces stay in your case file ({finishedPages}/4).
        </p>
      </div>

      <div className="mb-3 flex flex-wrap justify-center gap-2">
        {PAGES.map((p) => (
          <GameButton
            key={p.id}
            size="sm"
            variant={p.id === page.id ? 'primary' : 'ghost'}
            onClick={() => {
              setPageId(p.id);
              sounds.paperShuffle();
            }}
          >
            {p.icon} {p.title} {saves[p.id]?.done ? '✓' : ''}
          </GameButton>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <GlassCard className="p-4">
          <div className="mb-3 flex flex-wrap justify-center gap-2">
            {PALETTE.map((c) => (
              <button
                key={c.hex}
                title={c.name}
                aria-label={`Pick ${c.name}`}
                onClick={() => {
                  setColor(c.hex);
                  sounds.typewriterClick();
                }}
                className={`h-11 w-11 rounded-full border-2 transition-transform ${
                  color === c.hex ? 'scale-110 border-[var(--amber-glow)]' : 'border-[rgba(0,0,0,0.4)]'
                }`}
                style={{ background: c.hex }}
              />
            ))}
          </div>

          <div className="mx-auto max-w-[320px] text-[var(--ink)]">
            <svg viewBox="0 0 200 200" className="w-full rounded-xl bg-[rgba(217,201,163,0.08)]">
              {page.regions.map((r) => (
                <Shape
                  key={r.id}
                  kind={r.kind}
                  attrs={r.attrs}
                  fill={fills[r.id]}
                  onClick={() => paint(r)}
                />
              ))}
              {page.decor.map((d: ArtDecor, i) => (
                <Shape key={`d${i}`} kind={d.kind} attrs={d.attrs} decor />
              ))}
            </svg>
          </div>

          <div className="mt-3 text-center font-type text-xs tracking-[0.14em] uppercase text-[var(--ink-dim)]">
            {filledCount(page, fills)}/{page.regions.length} regions · {page.title}
          </div>

          {done && (
            <div className="mt-3 rounded-xl border border-[var(--amber-glow)] bg-[rgba(232,163,61,0.1)] p-3 text-center">
              <div className="type-heading text-base text-[var(--amber-glow)]">
                🖼️ Piece finished — saved to your case file!
              </div>
              <p className="mt-1 text-sm text-[var(--ink-dim)]">+{XP_AWARDS.soloWin} XP filed on first finish.</p>
            </div>
          )}

          <div className="mt-3 text-center">
            <GameButton variant="danger" size="sm" onClick={clearPage}>
              ↺ Clear page
            </GameButton>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
