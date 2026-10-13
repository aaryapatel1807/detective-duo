'use client';

/* Jigsaw — solo file. Drag pieces from the tray onto the board; they snap
 * when close to home. Image sources: a generated noir pattern, or the two
 * photos uploaded on the Settings page (localStorage dd-photo-me /
 * dd-photo-partner — read-only). XP when the photo is reassembled.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameProps } from '../types';
import { GlassCard } from '../../components/GlassCard';
import { awardXP, syncXpToRoom, XP_AWARDS } from '../../lib/xp';
import { readStr } from '../../lib/store';
import { PHOTO_ME_KEY, PHOTO_PARTNER_KEY } from '../../lib/profile';
import { sounds } from '../../lib/sound';
import {
  AREA_H,
  allPlaced,
  homeFx,
  homeFy,
  nearHome,
  pieceFrac,
  scatterPieces,
  type JigPiece,
} from './logic';
import type { JigSource } from './types';
import '../ui-kit/kit.css';
import '../ui-kit/realism.css';
import './game.css';
import { GameButton, ProgressBar, ResultModal, SectionTitle } from '../ui-kit';

const FALLBACK_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600' viewBox='0 0 600 600'><defs><linearGradient id='sky' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#33291a'/><stop offset='1' stop-color='#12100c'/></linearGradient></defs><rect width='600' height='600' fill='url(#sky)'/><circle cx='470' cy='105' r='72' fill='#e8d9b0' opacity='0.14'/><circle cx='470' cy='105' r='50' fill='#e8d9b0' opacity='0.92'/><rect x='15' y='310' width='95' height='290' fill='#1d1812'/><rect x='120' y='225' width='115' height='375' fill='#251e15'/><rect x='245' y='340' width='85' height='260' fill='#1d1812'/><rect x='340' y='185' width='125' height='415' fill='#2a2118'/><rect x='475' y='290' width='105' height='310' fill='#1d1812'/><g fill='#e8a33d' opacity='0.85'><rect x='140' y='250' width='18' height='24'/><rect x='168' y='250' width='18' height='24'/><rect x='196' y='250' width='18' height='24'/><rect x='140' y='290' width='18' height='24'/><rect x='196' y='290' width='18' height='24'/><rect x='360' y='215' width='20' height='26'/><rect x='392' y='215' width='20' height='26'/><rect x='424' y='215' width='20' height='26'/><rect x='360' y='258' width='20' height='26'/><rect x='424' y='258' width='20' height='26'/><rect x='360' y='301' width='20' height='26'/><rect x='392' y='301' width='20' height='26'/></g><path d='M0 430 L600 370' stroke='#a03030' stroke-width='4'/><circle cx='140' cy='416' r='9' fill='#c8a24a'/><circle cx='430' cy='387' r='9' fill='#c8a24a'/><circle cx='290' cy='401' r='9' fill='#c8a24a'/></svg>`;

const FALLBACK_IMG = `data:image/svg+xml,${encodeURIComponent(FALLBACK_SVG)}`;

export default function JigsawGame({ room }: GameProps) {
  const [n, setN] = useState(3);
  const [pieces, setPieces] = useState<JigPiece[]>(() => scatterPieces(3));
  const [source, setSource] = useState<JigSource>('pattern');
  const [img, setImg] = useState(FALLBACK_IMG);
  const [photos, setPhotos] = useState<{ me: string; partner: string }>({ me: '', partner: '' });
  const [done, setDone] = useState(false);
  const awardedRef = useRef(false);
  const dragRef = useRef<{ id: number; dx: number; dy: number } | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  // Read Settings photos once (read-only; the task's 'dd-photos' key does not
  // exist — Settings stores dd-photo-me / dd-photo-partner via lib/profile).
  useEffect(() => {
    setPhotos({ me: readStr(PHOTO_ME_KEY), partner: readStr(PHOTO_PARTNER_KEY) });
  }, []);

  useEffect(() => {
    const next =
      source === 'me' && photos.me
        ? photos.me
        : source === 'partner' && photos.partner
          ? photos.partner
          : FALLBACK_IMG;
    setImg(next);
  }, [source, photos]);

  const newPuzzle = useCallback(
    (size: number) => {
      awardedRef.current = false;
      setN(size);
      setPieces(scatterPieces(size));
      setDone(false);
      sounds.paperShuffle();
    },
    [],
  );

  const finish = useCallback(() => {
    setDone(true);
    sounds.stampThud();
    if (!awardedRef.current) {
      awardedRef.current = true;
      awardXP(XP_AWARDS.soloWin);
      syncXpToRoom(room.setShared, room.me.id, room.me.name);
      sounds.xpTick();
    }
  }, [room]);

  const toFrac = (clientX: number, clientY: number) => {
    const el = areaRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      fx: (clientX - rect.left) / rect.width,
      fy: ((clientY - rect.top) / rect.height) * AREA_H,
      w: rect.width,
      h: rect.height,
    };
  };

  const onPointerDown = (e: React.PointerEvent, id: number) => {
    const p = pieces.find((x) => x.id === id);
    if (!p || p.placed || done) return;
    const f = toFrac(e.clientX, e.clientY);
    if (!f) return;
    dragRef.current = { id, dx: f.fx - p.fx, dy: f.fy - p.fy };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    sounds.pinTap();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const f = toFrac(e.clientX, e.clientY);
    if (!f) return;
    const size = pieceFrac(n);
    const fx = Math.min(Math.max(f.fx - drag.dx, 0), 1 - size);
    const fy = Math.min(Math.max(f.fy - drag.dy, 0), AREA_H - size);
    setPieces((ps) => ps.map((p) => (p.id === drag.id ? { ...p, fx, fy } : p)));
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    setPieces((ps) => {
      const next = ps.map((p) => {
        if (p.id !== drag.id) return p;
        if (nearHome(p, n)) {
          sounds.typewriterClick();
          return { ...p, fx: homeFx(p.col, n), fy: homeFy(p.row, n), placed: true };
        }
        return p;
      });
      if (allPlaced(next)) window.setTimeout(finish, 350);
      return next;
    });
  };

  const size = pieceFrac(n);
  const placedCount = pieces.filter((p) => p.placed).length;

  const pieceBg = (p: JigPiece): React.CSSProperties => ({
    backgroundImage: `url("${img}")`,
    backgroundSize: `${n * 100}% ${n * 100}%`,
    backgroundPosition: `${n === 1 ? 50 : (p.col / (n - 1)) * 100}% ${n === 1 ? 50 : (p.row / (n - 1)) * 100}%`,
  });

  return (
    <div className="gk-root gk-modal-scope mx-auto max-w-lg">
      <div className="mb-4 text-center">
        <SectionTitle eyebrow="EVIDENCE PHOTO" title="Jigsaw" />
        <p className="mt-2 text-sm text-[var(--ink-dim)]">
          Drag pieces from the tray onto the board. They snap when close to home.
        </p>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
        {[3, 4].map((sizeOpt) => (
          <GameButton
            key={sizeOpt}
            size="sm"
            variant={sizeOpt === n ? 'primary' : 'ghost'}
            onClick={() => newPuzzle(sizeOpt)}
          >
            {sizeOpt}×{sizeOpt}
          </GameButton>
        ))}
        <span className="mx-1 hidden self-center text-[var(--ink-faint)] sm:inline">|</span>
        {(
          [
            ['pattern', '🌃 Noir'],
            ['me', '📷 My photo'],
            ['partner', '📷 Partner photo'],
          ] as [JigSource, string][]
        ).map(([src, label]) => {
          const missing = src === 'me' ? !photos.me : src === 'partner' ? !photos.partner : false;
          return (
            <GameButton
              key={src}
              size="sm"
              variant={src === source ? 'primary' : 'ghost'}
              onClick={() => setSource(src)}
              disabled={missing}
              ariaLabel={missing ? 'Upload a photo in Settings first' : label}
            >
              {label}
            </GameButton>
          );
        })}
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <GlassCard className="p-4">
          <div className="mb-4">
            <ProgressBar label="PIECES PLACED" value={placedCount} max={n * n} />
          </div>

          <div
            ref={areaRef}
            className="jg-table relative w-full touch-none overflow-hidden select-none"
            style={{ aspectRatio: `1 / ${AREA_H}` }}
          >
            {/* board outline */}
            <div className="pointer-events-none absolute left-0 top-0 aspect-square w-full rounded-xl border-2 border-dashed border-[var(--amber-glow)]/40" />
            <div className="eyebrow pointer-events-none absolute left-2 top-2 opacity-60">Board</div>
            <div className="eyebrow pointer-events-none absolute bottom-2 left-2 opacity-60">Tray</div>

            {pieces.map((p) => (
              <div
                key={p.id}
                onPointerDown={(e) => onPointerDown(e, p.id)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className={`jg-piece absolute ${
                  p.placed
                    ? 'jg-placed pointer-events-none'
                    : 'cursor-grab active:cursor-grabbing'
                }`}
                style={{
                  left: `${p.fx * 100}%`,
                  top: `${(p.fy / AREA_H) * 100}%`,
                  width: `${size * 100}%`,
                  aspectRatio: '1 / 1',
                  zIndex: p.placed ? 1 : 10,
                  ...pieceBg(p),
                }}
              />
            ))}
          </div>
        </GlassCard>
      </motion.div>

      <ResultModal
        open={done}
        eyebrow="EVIDENCE PHOTO"
        headline="Photo Reassembled"
        tone="win"
        stat={`${n * n} PIECES · +${XP_AWARDS.soloWin} XP FILED`}
        primaryLabel="Scatter again"
        onPrimary={() => newPuzzle(n)}
      />
    </div>
  );
}
