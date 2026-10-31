'use client';

/**
 * PhotoBooth: the camera strip booth, solo or in a room — rebuilt in
 * six phases (see lib/booth.ts for the pure parts):
 *
 * 1. Real capture: a pose card, then a 3-2-1 countdown, before EVERY
 *    shot — never a rapid-fire burst. Flash + tick sounds, cancel
 *    mid-run, retake a single shot, review before the strip builds.
 * 2. Quality: mirrored selfie preview, front/back flip, full-res
 *    shots, upload into slots, 3 or 4 shots, retry on camera errors,
 *    and a strip never composites with a blank gap.
 * 3. Looks: 10 filters (live + changeable after capture), 9 frame
 *    styles, strip / 2×2 grid / polaroid layouts, date stamp.
 * 4. Meme Booth: pose packs — classic ideas or meme poses to copy.
 * 5. Studio: stickers, text, doodle, shuffle, scrapbook export.
 * 6. Together: room strips shared over broadcast, duo turns on one
 *    phone. Strips are composited on canvas and handed back as an
 *    image; nothing is uploaded anywhere except the room broadcast
 *    of compressed shots between the two phones in a room.
 *
 * UI notes (Oct 2026): filters are a grid of LIVE tiles — each plays
 * the real camera feed with its own filter, so every look is visible
 * at once (2 columns beside the preview on desktop, 5 across under
 * it on phones); without a camera they fall back to a filtered
 * gradient. Strip design is a Template picker — Classic (the original
 * 9), From the reel (papers and finishes: satin, blue/pink paper, ink
 * dots, stripes, corduroy, denim, star mix, bedazzle, lace),
 * Templates (chalk lights, glitz, rustic lace, polka stars, stamp
 * memories, limited edition, checker, cherry doodle, floral corners),
 * and Rollbooth-inspired (16 strip formats: velvet, gingham, kraft,
 * airmail, ticket, wanted, seasonal, scrapbook, gradient-melt, doodle)
 * — every template is code-drawn on the export canvas (dots, stripes,
 * checker, stars, glitter, lace, string lights, stamp edges, bows,
 * doodles), seeded so re-composites look identical, and decorations
 * never cover faces. Layout: the camera column holds the filter rail,
 * a bigger preview (up to 78vh on desktop) kept blank — no stickers
 * or emojis on the camera screen, on his word, and it sits above the
 * drifting theme layer (z-41 over the ambience's z-40) so hearts,
 * rain, clouds and fireflies pass behind it, never over it; the
 * full-screen countdown (z-50) and flash (z-60) still sit above the
 * preview — and the Template picker below it; the right column keeps
 * Layout, Shots, Pose pack, Caption and Options. "Try this template"
 * renders the current look onto sample photos through the same strip
 * painter, so a template can be previewed before shooting or with no
 * camera at all. Layout is tap cards, shots and pose pack are
 * chips, and every option is a toggle chip — no dropdowns, no
 * checkboxes. The shutter is a big gold round button
 * under the preview; the countdown is full-screen with a pulsing
 * number and a full-screen flash per shot. The camera is a real
 * (unmirrored) image by default; Mirror preview is an opt-in chip,
 * saved on the device.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera, Download, FlipHorizontal2, RefreshCw, Share2, Shuffle, Volume2, VolumeX,
} from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';
import {
  BOOTH_FILTERS,
  BOOTH_LAYOUTS,
  BOOTH_STYLES,
  COUNTDOWN_SECONDS,
  SHOT_COUNT_OPTIONS,
  STICKER_PACKS,
  STORY_HEIGHT,
  STORY_WIDTH,
  TEXT_STYLES,
  boothFilterById,
  boothStyleById,
  canComposite,
  canShareFiles,
  duoTurnNames,
  layoutSlots,
  pickPoses,
  posePackById,
  scrapbookPageSize,
  seededPoints,
  shotTimeline,
  stripDateLine,
  stripMarginFor,
  textStyleById,
  type BoothFilter,
  type BoothLayout,
  type BoothStyle,
  type PoseIdea,
  type StripOverlay,
} from '@/lib/booth';
import {
  drawHeart,
  drawPatternBackground,
  drawPatternForeground,
  drawStar,
} from './patternPainters';

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const iw = 'videoWidth' in img ? img.videoWidth || img.width : img.width;
  const ih = 'videoHeight' in img ? img.videoHeight || img.height : img.height;
  if (!iw || !ih) return;
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

/** Export-only texture/wash pass for a filter: painted over the photos
 * (and the template's margins) and under the caption, so the caption
 * stays crisp. Live tiles show the colour grade only. Seeded, so
 * re-composites render identically. */
function drawFilterOverlay(
  ctx: CanvasRenderingContext2D,
  filter: BoothFilter,
  w: number,
  h: number,
) {
  const overlays = filter.overlays;
  if (!overlays || overlays.length === 0) return;
  ctx.save();
  for (const o of overlays) {
    if (o.kind === 'tint') {
      ctx.globalCompositeOperation = o.blend;
      ctx.globalAlpha = o.alpha;
      ctx.fillStyle = o.color;
      ctx.fillRect(0, 0, w, h);
    } else if (o.kind === 'gradient') {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, o.colors[0]!);
      g.addColorStop(1, o.colors[1] ?? o.colors[0]!);
      ctx.globalCompositeOperation = o.blend;
      ctx.globalAlpha = o.alpha;
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    } else if (o.kind === 'vignette') {
      const r = Math.hypot(w, h) / 2;
      const g = ctx.createRadialGradient(w / 2, h / 2, r * 0.35, w / 2, h / 2, r);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, o.color);
      ctx.globalCompositeOperation = o.blend;
      ctx.globalAlpha = o.alpha;
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    } else if (o.kind === 'glow') {
      const r = Math.hypot(w, h) / 2;
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, r * 0.75);
      g.addColorStop(0, o.color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = o.blend;
      ctx.globalAlpha = o.alpha;
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    } else if (o.kind === 'stars') {
      const pts = seededPoints(`filter-${filter.id}`, o.count, w, h, 48);
      ctx.globalCompositeOperation = 'screen';
      pts.forEach((pt, i) => {
        ctx.globalAlpha = o.alpha * (0.6 + (i % 4) * 0.1);
        ctx.fillStyle = o.colors[i % o.colors.length]!;
        drawStar(ctx, pt.x, pt.y, 10 + (i % 3) * 6);
      });
    } else if (o.kind === 'scanlines') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = o.alpha;
      ctx.fillStyle = '#000000';
      for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
    } else if (o.kind === 'grain') {
      const pts = seededPoints(`grain-${filter.id}`, Math.round((w * h) / 2600), w, h, 0);
      ctx.globalCompositeOperation = 'source-over';
      pts.forEach((pt, i) => {
        ctx.globalAlpha = o.alpha * (0.5 + (i % 3) * 0.25);
        ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#000000';
        ctx.fillRect(pt.x, pt.y, 2, 2);
      });
    } else if (o.kind === 'orton') {
      // Bloom: a blurred copy of the strip screened back over itself.
      const tmp = document.createElement('canvas');
      tmp.width = w;
      tmp.height = h;
      const tctx = tmp.getContext('2d');
      if (!tctx) continue;
      tctx.filter = `blur(${o.blur}px)`;
      tctx.drawImage(ctx.canvas, 0, 0, w, h);
      tctx.filter = 'none';
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = o.alpha;
      ctx.drawImage(tmp, 0, 0, w, h);
    }
  }
  ctx.restore();
}

/** The strip painting itself: frame, pattern, photos, caption. Used by
 * the real composite AND by the try-a-template sample preview, so the
 * preview shows exactly what the export will look like — same code,
 * only the photos differ (sample gradients instead of camera shots).
 * Filter overlays ARE painted here (texture/wash, under the caption);
 * studio overlays and doodles are added by the real composite after. */
function paintStripBase(
  ctx: CanvasRenderingContext2D,
  opts: {
    style: BoothStyle;
    filter: BoothFilter;
    layoutId: BoothLayout;
    shotCount: number;
    caption: string;
    dateStamp: boolean;
    shots: (HTMLCanvasElement | HTMLImageElement)[];
  },
) {
  const { style, layoutId, shotCount, caption, dateStamp, shots } = opts;
  const grade = opts.filter.exportCss ?? opts.filter.css;
  ctx.fillStyle = style.frame;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);
  drawPatternBackground(ctx, style, STORY_WIDTH, STORY_HEIGHT);
  // String lights need a header band, and some templates widen all
  // their margins — one shared helper decides (see lib/booth.ts).
  const margin = stripMarginFor(style);
  const { slots, caption: cap } = layoutSlots(layoutId, STORY_WIDTH, STORY_HEIGHT, shotCount, margin);
  shots.slice(0, slots.length).forEach((shotCanvas, i) => {
    const slot = slots[i];
    if (!slot) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(slot.x, slot.y, slot.w, slot.h);
    ctx.clip();
    ctx.filter = grade || 'none';
    drawCover(ctx, shotCanvas, slot.x, slot.y, slot.w, slot.h);
    ctx.filter = 'none';
    ctx.restore();
    ctx.strokeStyle = style.caption;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 3;
    ctx.strokeRect(slot.x, slot.y, slot.w, slot.h);
    ctx.globalAlpha = 1;
    if (style.dividerText && i < slots.length - 1) {
      const next = slots[i + 1]!;
      const gapY = (slot.y + slot.h + next.y) / 2;
      ctx.fillStyle = style.caption;
      ctx.globalAlpha = 0.8;
      ctx.font = '700 22px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(style.dividerText, STORY_WIDTH / 2, gapY, STORY_WIDTH - 96);
      ctx.globalAlpha = 1;
    }
  });
  if (style.motif) {
    ctx.fillStyle = style.caption;
    ctx.globalAlpha = 0.85;
    for (let x = 96; x < STORY_WIDTH - 48; x += 160) {
      if (style.motif === 'hearts') {
        drawHeart(ctx, x, 14, 28);
        drawHeart(ctx, x + 80, STORY_HEIGHT - 42, 28);
      } else {
        drawStar(ctx, x, 28, 18);
        drawStar(ctx, x + 80, STORY_HEIGHT - 28, 18);
      }
    }
    ctx.globalAlpha = 1;
  }
  if (style.id === '35mm') {
    ctx.fillStyle = style.caption;
    for (let y = 48; y < STORY_HEIGHT - 48; y += 96) {
      ctx.fillRect(12, y, 24, 48);
      ctx.fillRect(STORY_WIDTH - 36, y, 24, 48);
    }
  }
  drawPatternForeground(ctx, style, slots, STORY_WIDTH, STORY_HEIGHT);
  drawFilterOverlay(ctx, opts.filter, STORY_WIDTH, STORY_HEIGHT);
  const text = (caption.trim() || 'Sachi').slice(0, 40);
  ctx.fillStyle = style.caption;
  const captionFonts: Record<string, string> = {
    serif: '600 64px Georgia, serif',
    typewriter: '64px "Courier New", monospace',
    script: 'italic 64px Georgia, serif',
    bubble: '800 64px Arial, sans-serif',
  };
  ctx.font = captionFonts[style.captionFont ?? 'serif']!;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cap.x + cap.w / 2, cap.y + cap.h / 2 - (dateStamp ? 30 : 0), cap.w);
  if (dateStamp) {
    ctx.globalAlpha = 0.8;
    ctx.font = '400 32px Georgia, serif';
    ctx.fillText(stripDateLine(), cap.x + cap.w / 2, cap.y + cap.h / 2 + 48, cap.w);
    ctx.globalAlpha = 1;
  }
}

/** One gradient stand-in photo for the try-a-template preview. */
function samplePhotoCanvas(i: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 480;
  c.height = 640;
  const g = c.getContext('2d');
  if (g) {
    const grads: [string, string][] = [
      ['#ff4da6', '#ffd98a'],
      ['#ffd98a', '#46a758'],
      ['#46a758', '#ff4da6'],
      ['#8fd0ff', '#ff8fb3'],
    ];
    const [a, b] = grads[i % grads.length]!;
    const grad = g.createLinearGradient(0, 0, 480, 640);
    grad.addColorStop(0, a);
    grad.addColorStop(1, b);
    g.fillStyle = grad;
    g.fillRect(0, 0, 480, 640);
    const glow = g.createRadialGradient(240, 220, 40, 240, 220, 320);
    glow.addColorStop(0, 'rgba(255,255,255,0.55)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = glow;
    g.fillRect(0, 0, 480, 640);
  }
  return c;
}

/** CSS hint of a template's pattern for its picker card. */
function patternCardStyle(s: BoothStyle): React.CSSProperties {
  const base: React.CSSProperties = { background: s.frame };
  const p = s.pattern;
  if (!p) return base;
  if (p.kind === 'dots') {
    return {
      ...base,
      backgroundImage: `radial-gradient(${p.color} 3px, transparent 4px)`,
      backgroundSize: '20px 20px',
    };
  }
  if (p.kind === 'stripes') {
    const [c0, c1] = [p.colors[0]!, p.colors[1] ?? p.colors[0]!];
    return { ...base, backgroundImage: `repeating-linear-gradient(90deg, ${c0} 0 10px, ${c1} 10px 20px)` };
  }
  if (p.kind === 'checker') {
    return {
      ...base,
      backgroundImage: `conic-gradient(${p.color} 25%, transparent 0 50%, ${p.color} 0 75%, transparent 0)`,
      backgroundSize: '16px 16px',
    };
  }
  if (p.kind === 'glitter') {
    return {
      ...base,
      backgroundImage: [
        'radial-gradient(circle at 20% 25%, #ffd98a 2px, transparent 3px)',
        'radial-gradient(circle at 70% 60%, #ffffff 2px, transparent 3px)',
        'radial-gradient(circle at 40% 80%, #ffd98a 2px, transparent 3px)',
      ].join(', '),
    };
  }
  if (p.kind === 'lace') return { ...base, outline: '2px dashed #ffffff', outlineOffset: '-4px' };
  if (p.kind === 'lights') return { ...base, borderTop: '4px dotted #ffd98a' };
  if (p.kind === 'gingham') {
    return {
      ...base,
      backgroundImage: [
        `repeating-linear-gradient(90deg, ${p.color}55 0 8px, transparent 8px 16px)`,
        `repeating-linear-gradient(0deg, ${p.color}55 0 8px, transparent 8px 16px)`,
      ].join(', '),
    };
  }
  if (p.kind === 'header') return { ...base, backgroundImage: `linear-gradient(${p.color} 0 10px, transparent 10px)` };
  if (p.kind === 'airmail') {
    const band = `repeating-linear-gradient(45deg, ${p.colors[0]} 0 3px, #ffffff 3px 6px, ${p.colors[1]} 6px 9px, #ffffff 9px 12px)`;
    return {
      ...base,
      backgroundImage: `${band}, ${band}`,
      backgroundSize: '12px 100%',
      backgroundPosition: 'left top, right top',
      backgroundRepeat: 'no-repeat',
    };
  }
  if (p.kind === 'ticket') return { ...base, borderBottom: `2px dashed ${p.stub}` };
  if (p.kind === 'starframe') {
    return {
      ...base,
      backgroundImage: `radial-gradient(${p.texture} 2px, transparent 3px)`,
      backgroundSize: '14px 14px',
    };
  }
  if (p.kind === 'stitch') return { ...base, borderLeft: `2px dashed ${p.color}`, borderRight: `2px dashed ${p.color}` };
  if (p.kind === 'blend') {
    return { ...base, backgroundImage: `linear-gradient(180deg, ${p.colors[0]}, ${p.colors[1]} 50%, ${p.colors[2]})` };
  }
  if (p.kind === 'colourroom') {
    return { ...base, backgroundImage: `linear-gradient(180deg, ${p.colors[0]}, ${p.colors[1]})` };
  }
  return base;
}

/** One template card: mini strip in the template's own frame + pattern. */
function TemplateCard({
  s,
  active,
  onSelect,
  caption,
  small,
}: {
  s: BoothStyle;
  active: boolean;
  onSelect: () => void;
  caption: string;
  small?: boolean;
}) {
  const glyph =
    s.pattern?.kind === 'stars' || s.pattern?.kind === 'wanted' || s.pattern?.kind === 'starframe' || s.pattern?.kind === 'scrapstars'
      ? '★'
      : s.pattern?.kind === 'floral'
        ? '✿'
        : s.pattern?.kind === 'doodles'
          ? '🍒'
          : s.pattern?.kind === 'halloween'
            ? '🎃'
            : s.pattern?.kind === 'thanksgiving'
              ? '🍂'
              : s.pattern?.kind === 'birthdayscrap'
                ? '🎀'
                : null;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      title={`${s.name} — ${s.note}`}
      className={`rounded-xl border-[3px] p-1.5 text-left transition hover:-translate-y-0.5 ${
        small ? 'w-28 shrink-0' : ''
      } ${active ? 'booth-tile-active border-[#ffc83d]' : 'border-transparent'}`}
    >
      <span className="relative block rounded-lg p-1.5" style={patternCardStyle(s)}>
        <span className="flex flex-col gap-1">
          <span className="block h-4 rounded-sm" style={{ background: 'linear-gradient(135deg,#ff4da6,#ffd98a 50%,#46a758)' }} />
          <span className="block h-4 rounded-sm" style={{ background: 'linear-gradient(135deg,#ffd98a,#46a758 50%,#ff4da6)' }} />
          <span className="block h-4 rounded-sm" style={{ background: 'linear-gradient(135deg,#46a758,#ff4da6 50%,#ffd98a)' }} />
        </span>
        {glyph && (
          <span className="pointer-events-none absolute right-1 top-1 text-[10px] leading-none" aria-hidden>
            {glyph}
          </span>
        )}
        <span className="mt-1.5 block text-center text-[10px] font-bold leading-none" style={{ color: s.caption }}>
          {caption || 'Sachi'}
        </span>
      </span>
      <span className="mt-1 block text-xs font-semibold leading-tight">{s.name}</span>
    </button>
  );
}

type Phase = 'idle' | 'countdown' | 'review' | 'done';

/**
 * Live filter grid: every tile plays the real camera feed with its
 * own filter applied, so you see all the looks side by side instead
 * of guessing from a swatch. All tiles share the one camera stream
 * (no extra getUserMedia calls); without a camera they fall back to
 * a gradient swatch wearing the same filter.
 */
function FilterGrid({
  selected,
  onSelect,
  stream,
  mirror,
  columns,
}: {
  selected: string;
  onSelect: (id: string) => void;
  stream: MediaStream | null;
  mirror: boolean;
  columns: string;
}) {
  return (
    <div role="group" aria-label="Photo filters" className={`grid gap-2.5 ${columns}`}>
      {BOOTH_FILTERS.map((f) => {
        const active = f.id === selected;
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onSelect(f.id)}
            aria-pressed={active}
            title={f.note ? `${f.name} — ${f.note}` : f.name}
            className={`relative aspect-square overflow-hidden rounded-2xl border-[3px] transition duration-150 hover:-translate-y-1 hover:scale-[1.04] hover:shadow-xl ${
              active ? 'booth-tile-active border-[#ffc83d]' : 'border-transparent'
            }`}
          >
            {stream ? (
              <video
                ref={(v) => {
                  if (v && v.srcObject !== stream) {
                    v.srcObject = stream;
                    void v.play().catch(() => {});
                  }
                }}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
                style={{ transform: mirror ? 'scaleX(-1)' : undefined, filter: f.css || undefined }}
                aria-hidden
              />
            ) : (
              <span
                aria-hidden
                className="block h-full w-full"
                style={{
                  background: 'linear-gradient(135deg,#ff4da6,#ffd98a 50%,#46a758)',
                  filter: f.css || undefined,
                }}
              />
            )}
            <span className="absolute bottom-1.5 left-2 text-xs font-bold text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.8)]">
              {f.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Toggle chip: a boolean option as a tappable pill, not a checkbox. */
function Chip({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={`btn inline-flex items-center gap-1 !rounded-full !px-3 !py-1.5 text-xs ${active ? 'btn-primary' : ''}`}
    >
      {children}
    </button>
  );
}

/** Pose card: a real pose photo when the pose has one, else its emoji. */
function PoseCard({
  pose,
  shot,
  total,
  shooter,
  heading,
}: {
  pose: PoseIdea;
  shot: number;
  total: number;
  shooter: string | null;
  heading: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      {pose.image ? (
        <div className="w-44 overflow-hidden rounded-xl border-2 border-white/80 shadow-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pose.image} alt={`${pose.title} pose`} className="aspect-[4/3] w-full object-cover" />
          <p className="bg-black/70 px-2 py-1 text-center text-xs font-bold">
            Pose {shot + 1} of {total}: copy this!
          </p>
        </div>
      ) : (
        <span className="text-6xl" aria-hidden>
          {pose.emoji}
        </span>
      )}
      <p className="text-xl font-bold">{heading}</p>
      <p className="text-lg font-semibold">{pose.title}</p>
      <p className="text-sm opacity-90">{pose.hint}</p>
      {shooter && <p className="text-sm font-semibold">{shooter}&rsquo;s turn</p>}
      <p className="text-xs opacity-80">
        Shot {shot + 1} of {total}
      </p>
    </div>
  );
}

export default function PhotoBooth({ roomCode }: { roomCode?: string }) {
  const [styleId, setStyleId] = useState(BOOTH_STYLES[0]!.id);
  const [filterId, setFilterId] = useState('original');
  const [layoutId, setLayoutId] = useState<BoothLayout>('strip');
  const [shotCount, setShotCount] = useState(3);
  const [caption, setCaption] = useState('');
  const [dateStamp, setDateStamp] = useState(false);
  const [posePackId, setPosePackId] = useState('classic');
  const [showPoses, setShowPoses] = useState(true);
  const [manual, setManual] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [mirror, setMirror] = useState(false);
  // The one camera stream, shared with the live filter tiles.
  const [tileStream, setTileStream] = useState<MediaStream | null>(null);
  const [duoTurns, setDuoTurns] = useState(false);
  const [playerA, setPlayerA] = useState('You');
  const [playerB, setPlayerB] = useState('Partner');
  const [phase, setPhase] = useState<Phase>('idle');
  const [count, setCount] = useState(0);
  const [shot, setShot] = useState(0);
  const [currentPose, setCurrentPose] = useState<PoseIdea | null>(null);
  const [shooter, setShooter] = useState<string | null>(null);
  const [awaitingReady, setAwaitingReady] = useState(false);
  const [retakeSlot, setRetakeSlot] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [stripUrl, setStripUrl] = useState<string | null>(null);
  const [togetherUrl, setTogetherUrl] = useState<string | null>(null);
  const [shotUrls, setShotUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceIdx, setDeviceIdx] = useState(0);
  const [overlays, setOverlays] = useState<StripOverlay[]>([]);
  const [selectedOverlay, setSelectedOverlay] = useState<string | null>(null);
  const [pendingSticker, setPendingSticker] = useState<string | null>(null);
  const [pendingText, setPendingText] = useState<{ text: string; styleId: string; color: string } | null>(null);
  const [textInput, setTextInput] = useState('');
  const [textStyleId, setTextStyleId] = useState('marker');
  const [textColor, setTextColor] = useState('#ffffff');
  const [doodleMode, setDoodleMode] = useState(false);
  const [doodleColor, setDoodleColor] = useState('#ff4da6');
  const [partnerShots, setPartnerShots] = useState<string[]>([]);
  const [poses, setPoses] = useState<PoseIdea[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Generation guard for startCamera: a superseded getUserMedia result
  // must never adopt (or leak) a stream — e.g. a double-tapped retry
  // resolving after a newer attempt would otherwise leave the older
  // stream running and holding the camera.
  const cameraGenRef = useRef(0);
  const shotsRef = useRef<HTMLCanvasElement[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const boothChannelRef = useRef<ReturnType<
    NonNullable<ReturnType<typeof getSupabase>>['channel']
  > | null>(null);
  const runScheduleRef = useRef<(at: number) => void>(() => {});
  const audioRef = useRef<AudioContext | null>(null);
  const studioCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const doodleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const drawingRef = useRef(false);
  const manualShotRef = useRef(0);

  const filterCss = boothFilterById(filterId).css;

  useEffect(() => {
    try {
      if (localStorage.getItem('sachi-booth-mirror') === '1') setMirror(true);
    } catch {
      /* private mode: mirror just defaults off */
    }
  }, []);

  const toggleMirror = useCallback((v: boolean) => {
    setMirror(v);
    try {
      localStorage.setItem('sachi-booth-mirror', v ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const beep = useCallback(
    (high: boolean) => {
      if (!soundOn) return;
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        audioRef.current ??= new AC();
        const ctx = audioRef.current;
        if (ctx.state === 'suspended') void ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = high ? 1320 : 880;
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (high ? 0.18 : 0.09));
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + (high ? 0.18 : 0.09));
      } catch {
        /* audio is a nice-to-have */
      }
    },
    [soundOn],
  );

  // ------------------------------------------------------------ camera ----
  const startCamera = useCallback(async (deviceId?: string) => {
    const gen = ++cameraGenRef.current;
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      if (gen !== cameraGenRef.current) {
        // Superseded while awaiting (retry/flip raced ahead, or the
        // booth unmounted): stop this stream instead of adopting it,
        // or it would keep holding the camera with no owner.
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
      setTileStream(stream);
      setError(null);
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all.filter((d) => d.kind === 'videoinput'));
    } catch (e) {
      if (gen !== cameraGenRef.current) return;
      setCameraOn(false);
      setTileStream(null);
      // A busy camera is not a denied permission: on one phone the
      // call and the booth cannot hold the camera at once, and the
      // second getUserMedia fails with NotReadableError. Say so
      // plainly instead of sending the user to re-allow access.
      // (The existing "Try camera again" button below re-runs this.)
      const name = (e as { name?: unknown } | null)?.name;
      if (name === 'NotReadableError') {
        setError('camera is busy — close the call video or try again.');
      } else if (name === 'NotAllowedError' || name === 'SecurityError') {
        setError('No camera here — allow camera access to use the booth.');
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setError('No camera found on this device — the booth needs a camera to shoot.');
      } else {
        setError('No camera here — allow camera access to use the booth.');
      }
    }
  }, []);

  useEffect(() => {
    let alive = true;
    void startCamera().then(() => {
      if (!alive) {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    });
    return () => {
      alive = false;
      // Invalidate any pending getUserMedia so its result is stopped,
      // not adopted, by the generation guard in startCamera.
      cameraGenRef.current++;
      clearTimers();
      if (videoRef.current) videoRef.current.srcObject = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [clearTimers, startCamera]);

  const flipCamera = useCallback(() => {
    if (devices.length < 2) return;
    const next = (deviceIdx + 1) % devices.length;
    setDeviceIdx(next);
    void startCamera(devices[next]!.deviceId);
  }, [devices, deviceIdx, startCamera]);

  // Room countdown sync + shared shots.
  useEffect(() => {
    if (!roomCode) return;
    const sb = getSupabase();
    if (!sb) return;
    const ch = sb.channel(`dd-booth-${roomCode.toUpperCase()}`, {
      config: { broadcast: { self: false } },
    });
    boothChannelRef.current = ch;
    ch.on('broadcast', { event: 'booth-start' }, ({ payload }) => {
      const at = (payload as { at?: number } | undefined)?.at;
      if (typeof at === 'number') runScheduleRef.current(at);
    });
    ch.on('broadcast', { event: 'booth-shots' }, ({ payload }) => {
      const shots = (payload as { shots?: unknown } | undefined)?.shots;
      if (Array.isArray(shots) && shots.every((s) => typeof s === 'string' && s.startsWith('data:image'))) {
        setPartnerShots(shots.slice(0, 8));
      }
    });
    ch.subscribe();
    return () => {
      void sb.removeChannel(ch);
      boothChannelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);

  // ------------------------------------------------------------ capture ----
  const refreshShotUrls = useCallback(() => {
    setShotUrls(shotsRef.current.map((c) => c.toDataURL('image/jpeg', 0.8)));
  }, []);

  const captureShot = useCallback(
    (slot?: number): boolean => {
      const video = videoRef.current;
      if (!video || !video.videoWidth) return false;
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const scale = vw > 1920 ? 1920 / vw : 1;
      const w = Math.round(vw * scale);
      const h = Math.round(vh * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      // Mirror only when asked: by default the capture is the real
      // image, as others see you — and it always matches the preview.
      if (mirror) {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }
      drawCover(ctx, video, 0, 0, w, h);
      if (slot !== undefined) shotsRef.current[slot] = canvas;
      else shotsRef.current.push(canvas);
      refreshShotUrls();
      return true;
    },
    [mirror, refreshShotUrls],
  );

  const abortRun = useCallback(
    (message: string) => {
      clearTimers();
      setPhase('idle');
      setCount(0);
      setCurrentPose(null);
      setAwaitingReady(false);
      setRetakeSlot(null);
      setError(message);
    },
    [clearTimers],
  );

  const runTicksForShot = useCallback(
    (shotIdx: number, after: () => void, replaceSlot?: number) => {
      // Straight 3-2-1 then capture (manual shots and retakes).
      for (let s = COUNTDOWN_SECONDS; s >= 1; s--) {
        timersRef.current.push(
          setTimeout(
            () => {
              setCount(s);
              beep(false);
            },
            (COUNTDOWN_SECONDS - s) * 1000,
          ),
        );
      }
      timersRef.current.push(
        setTimeout(
          () => {
            const ok = captureShot(replaceSlot);
            setFlash(true);
            beep(true);
            timersRef.current.push(setTimeout(() => setFlash(false), 150));
            if (!ok) {
              abortRun("That shot didn't capture — check the camera and try again.");
              return;
            }
            setShot(shotIdx + 1);
            after();
          },
          COUNTDOWN_SECONDS * 1000,
        ),
      );
    },
    [abortRun, beep, captureShot],
  );

  const runSchedule = useCallback(
    (startAt: number) => {
      clearTimers();
      shotsRef.current = [];
      setShotUrls([]);
      setStripUrl(null);
      setTogetherUrl(null);
      setOverlays([]);
      setError(null);
      setPhase('countdown');
      const pack = posePackById(posePackId);
      const runPoses = showPoses ? pickPoses(pack.poses, shotCount) : [];
      setPoses(runPoses);
      const shooters = duoTurns && !roomCode ? duoTurnNames(shotCount, playerA || 'You', playerB || 'Partner') : [];
      const events = shotTimeline(shotCount);
      for (const ev of events) {
        const delay = Math.max(0, startAt + ev.at - Date.now());
        if (ev.type === 'pose') {
          timersRef.current.push(
            setTimeout(() => {
              setCurrentPose(runPoses[ev.shot] ?? null);
              setShooter(shooters[ev.shot] ?? null);
              setCount(0);
              setShot(ev.shot);
            }, delay),
          );
        } else if (ev.type === 'tick') {
          timersRef.current.push(
            setTimeout(() => {
              setCount(ev.count);
              beep(false);
            }, delay),
          );
        } else if (ev.type === 'capture') {
          timersRef.current.push(
            setTimeout(() => {
              const ok = captureShot();
              setFlash(true);
              beep(true);
              timersRef.current.push(setTimeout(() => setFlash(false), 150));
              if (!ok) {
                abortRun("That shot didn't capture — check the camera and try again.");
                return;
              }
              setShot(ev.shot + 1);
            }, delay),
          );
        } else {
          timersRef.current.push(
            setTimeout(() => {
              setPhase('review');
              setCount(0);
              setCurrentPose(null);
            }, delay),
          );
        }
      }
    },
    [abortRun, beep, captureShot, clearTimers, duoTurns, playerA, playerB, posePackId, roomCode, shotCount, showPoses],
  );

  useEffect(() => {
    runScheduleRef.current = runSchedule;
  }, [runSchedule]);

  const startTogether = useCallback(() => {
    const at = Date.now() + 500;
    boothChannelRef.current?.send({
      type: 'broadcast',
      event: 'booth-start',
      payload: { at },
    });
    runSchedule(at);
  }, [runSchedule]);

  const startSolo = useCallback(() => {
    if (manual) {
      clearTimers();
      shotsRef.current = [];
      setShotUrls([]);
      setStripUrl(null);
      setTogetherUrl(null);
      setOverlays([]);
      setError(null);
      const pack = posePackById(posePackId);
      const runPoses = showPoses ? pickPoses(pack.poses, shotCount) : [];
      setPoses(runPoses);
      manualShotRef.current = 0;
      setShot(0);
      setPhase('countdown');
      setAwaitingReady(true);
      setCurrentPose(runPoses[0] ?? null);
      const shooters = duoTurns ? duoTurnNames(shotCount, playerA || 'You', playerB || 'Partner') : [];
      setShooter(shooters[0] ?? null);
    } else {
      runSchedule(Date.now() + 500);
    }
  }, [clearTimers, duoTurns, manual, playerA, playerB, posePackId, runSchedule, shotCount, showPoses]);

  const manualReady = useCallback(() => {
    const idx = manualShotRef.current;
    setAwaitingReady(false);
    runTicksForShot(idx, () => {
      if (idx + 1 >= shotCount) {
        setPhase('review');
        setCount(0);
        setCurrentPose(null);
      } else {
        manualShotRef.current = idx + 1;
        setShot(idx + 1);
        setCurrentPose(poses[idx + 1] ?? null);
        const shooters = duoTurns ? duoTurnNames(shotCount, playerA || 'You', playerB || 'Partner') : [];
        setShooter(shooters[idx + 1] ?? null);
        setAwaitingReady(true);
        setCount(0);
      }
    });
  }, [duoTurns, playerA, playerB, poses, runTicksForShot, shotCount]);

  const cancelRun = useCallback(() => {
    clearTimers();
    setPhase('idle');
    setCount(0);
    setCurrentPose(null);
    setAwaitingReady(false);
    setRetakeSlot(null);
  }, [clearTimers]);

  const retake = useCallback(
    (slot: number) => {
      setRetakeSlot(slot);
      setPhase('countdown');
      setCount(0);
      setCurrentPose(null);
      runTicksForShot(slot, () => {
        setRetakeSlot(null);
        setPhase('review');
        setCount(0);
      }, slot);
    },
    [runTicksForShot],
  );

  const uploadIntoSlot = useCallback(
    (slot: number, file: File) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.max(img.width, img.height) > 1600 ? 1600 / Math.max(img.width, img.height) : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        shotsRef.current[slot] = canvas;
        refreshShotUrls();
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        setError('Could not read that photo — try another file.');
        URL.revokeObjectURL(url);
      };
      img.src = url;
    },
    [refreshShotUrls],
  );

  // ------------------------------------------------------------ composite ----
  const drawOverlaysOnto = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      for (const o of overlays) {
        const x = o.x * STORY_WIDTH;
        const y = o.y * STORY_HEIGHT;
        if (o.kind === 'sticker') {
          ctx.font = `${o.size}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(o.text, x, y);
        } else {
          const style = textStyleById(o.font ?? 'marker');
          ctx.font = style.font(o.size);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          if (style.box) {
            const w = ctx.measureText(o.text).width + 48;
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.fillRect(x - w / 2, y - o.size * 0.7, w, o.size * 1.4);
            ctx.fillStyle = '#2b2118';
          } else {
            if (style.glow) {
              ctx.shadowColor = o.color ?? '#ffffff';
              ctx.shadowBlur = 28;
            }
            ctx.fillStyle = o.color ?? '#ffffff';
          }
          ctx.fillText(o.text, x, y);
          ctx.shadowBlur = 0;
        }
      }
    },
    [overlays],
  );

  const composite = useCallback(
    (broadcastShots: boolean) => {
      if (!canComposite(shotsRef.current.length, shotCount)) {
        setError('Not every shot is in yet — take or upload the missing ones first.');
        return;
      }
      const style = boothStyleById(styleId);
      const filter = boothFilterById(filterId);
      const canvas = document.createElement('canvas');
      canvas.width = STORY_WIDTH;
      canvas.height = STORY_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      paintStripBase(ctx, {
        style,
        filter,
        layoutId,
        shotCount,
        caption,
        dateStamp,
        shots: shotsRef.current,
      });
      drawOverlaysOnto(ctx);
      const doodle = doodleCanvasRef.current;
      if (doodle) {
        // Bake the doodle in, then clear the layer so it can't double up
        // in the preview once the new strip loads.
        ctx.drawImage(doodle, 0, 0, STORY_WIDTH, STORY_HEIGHT);
        const dctx = doodle.getContext('2d');
        if (dctx) dctx.clearRect(0, 0, STORY_WIDTH, STORY_HEIGHT);
      }
      setStripUrl(canvas.toDataURL('image/png'));
      setPhase('done');
      if (broadcastShots && roomCode && boothChannelRef.current) {
        const compressed = shotsRef.current.map((c) => {
          const tmp = document.createElement('canvas');
          const scale = c.width > 720 ? 720 / c.width : 1;
          tmp.width = Math.round(c.width * scale);
          tmp.height = Math.round(c.height * scale);
          const tctx = tmp.getContext('2d');
          if (tctx) tctx.drawImage(c, 0, 0, tmp.width, tmp.height);
          return tmp.toDataURL('image/jpeg', 0.75);
        });
        boothChannelRef.current.send({
          type: 'broadcast',
          event: 'booth-shots',
          payload: { shots: compressed },
        });
      }
    },
    [caption, dateStamp, drawOverlaysOnto, filterId, layoutId, roomCode, shotCount, styleId],
  );

  // Live re-composite when look settings change after the strip exists.
  // Overlays and doodles apply via "Update strip" instead, so dragging
  // doesn't rebuild the big canvas on every move.
  useEffect(() => {
    if (phase === 'done' && canComposite(shotsRef.current.length, shotCount)) {
      composite(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleId, filterId, layoutId, dateStamp, caption]);

  // Try-a-template: render the current look onto sample photos through
  // the same strip painter, so a template can be previewed before
  // shooting — or with no camera at all. Rebuilds live as the look
  // changes while the preview is open.
  const [showSample, setShowSample] = useState(false);
  const [sampleUrl, setSampleUrl] = useState<string | null>(null);
  const buildSampleStrip = useCallback(() => {
    const style = boothStyleById(styleId);
    const filter = boothFilterById(filterId);
    const margin = stripMarginFor(style);
    const { slots } = layoutSlots(layoutId, STORY_WIDTH, STORY_HEIGHT, shotCount, margin);
    const canvas = document.createElement('canvas');
    canvas.width = STORY_WIDTH;
    canvas.height = STORY_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    paintStripBase(ctx, {
      style,
      filter,
      layoutId,
      shotCount,
      caption,
      dateStamp,
      shots: slots.map((_, i) => samplePhotoCanvas(i)),
    });
    setSampleUrl(canvas.toDataURL('image/png'));
  }, [styleId, filterId, layoutId, shotCount, caption, dateStamp]);
  useEffect(() => {
    if (showSample && phase === 'idle') buildSampleStrip();
  }, [showSample, phase, buildSampleStrip]);

  const makeTogetherStrip = useCallback(async () => {
    if (partnerShots.length === 0) return;
    const mine = shotsRef.current;
    const theirs: HTMLCanvasElement[] = [];
    for (const url of partnerShots) {
      const img = new Image();
      img.src = url;
      try {
        await img.decode();
      } catch {
        continue;
      }
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(img, 0, 0);
      theirs.push(canvas);
    }
    const order: HTMLCanvasElement[] = [];
    const n = Math.max(mine.length, theirs.length);
    for (let i = 0; i < n; i++) {
      if (i < mine.length) order.push(mine[i]!);
      if (i < theirs.length) order.push(theirs[i]!);
    }
    if (order.length === 0) return;
    const style = boothStyleById(styleId);
    const filter = boothFilterById(filterId);
    const canvas = document.createElement('canvas');
    canvas.width = STORY_WIDTH;
    canvas.height = STORY_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = style.frame;
    ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);
    const { slots, caption: cap } = layoutSlots('strip', STORY_WIDTH, STORY_HEIGHT, order.length);
    order.slice(0, slots.length).forEach((shotCanvas, i) => {
      const slot = slots[i];
      if (!slot) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(slot.x, slot.y, slot.w, slot.h);
      ctx.clip();
      ctx.filter = filter.css || 'none';
      drawCover(ctx, shotCanvas, slot.x, slot.y, slot.w, slot.h);
      ctx.filter = 'none';
      ctx.restore();
    });
    const text = (caption.trim() || 'Sachi').slice(0, 40);
    ctx.fillStyle = style.caption;
    ctx.font = '600 64px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cap.x + cap.w / 2, cap.y + cap.h / 2, cap.w);
    setTogetherUrl(canvas.toDataURL('image/png'));
  }, [caption, filterId, partnerShots, styleId]);

  // ------------------------------------------------------------ studio ----
  // Redraw the studio preview (strip + overlays) whenever they change.
  useEffect(() => {
    if (phase !== 'done' || !stripUrl) return;
    const canvas = studioCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      for (const o of overlays) {
        const x = o.x * canvas.width;
        const y = o.y * canvas.height;
        const size = (o.size * canvas.width) / STORY_WIDTH;
        if (o.kind === 'sticker') {
          ctx.font = `${size}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(o.text, x, y);
        } else {
          const style = textStyleById(o.font ?? 'marker');
          ctx.font = style.font(size);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          if (style.box) {
            const w = ctx.measureText(o.text).width + 24;
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.fillRect(x - w / 2, y - size * 0.7, w, size * 1.4);
            ctx.fillStyle = '#2b2118';
          } else {
            if (style.glow) {
              ctx.shadowColor = o.color ?? '#ffffff';
              ctx.shadowBlur = 12;
            }
            ctx.fillStyle = o.color ?? '#ffffff';
          }
          ctx.fillText(o.text, x, y);
          ctx.shadowBlur = 0;
        }
        if (o.id === selectedOverlay) {
          ctx.strokeStyle = '#ff4da6';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, size * 0.8, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    };
    img.src = stripUrl;
  }, [phase, stripUrl, overlays, selectedOverlay]);

  const studioPoint = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = studioCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
  }, []);

  const onStudioPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (doodleMode) return; // doodle canvas sits on top and takes the event
      const p = studioPoint(e);
      if (!p) return;
      // Hit-test overlays (nearest within a thumb-sized radius wins).
      let best: StripOverlay | null = null;
      let bestD = 0.09;
      for (const o of overlays) {
        const d = Math.hypot(o.x - p.x, (o.y - p.y) * (640 / 360));
        if (d < bestD) {
          bestD = d;
          best = o;
        }
      }
      if (best) {
        setSelectedOverlay(best.id);
        dragRef.current = { id: best.id, dx: best.x - p.x, dy: best.y - p.y };
        (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
        return;
      }
      if (pendingSticker) {
        const id = `ov-${Date.now()}`;
        setOverlays((prev) => [...prev, { id, kind: 'sticker', text: pendingSticker, x: p.x, y: p.y, size: 140 }]);
        setSelectedOverlay(id);
        setPendingSticker(null);
        return;
      }
      if (pendingText) {
        const id = `ov-${Date.now()}`;
        setOverlays((prev) => [
          ...prev,
          { id, kind: 'text', text: pendingText.text, x: p.x, y: p.y, size: 90, color: pendingText.color, font: pendingText.styleId },
        ]);
        setSelectedOverlay(id);
        setPendingText(null);
        return;
      }
      setSelectedOverlay(null);
    },
    [doodleMode, overlays, pendingSticker, pendingText, studioPoint],
  );

  const onStudioPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const drag = dragRef.current;
      const p = studioPoint(e);
      if (!drag || !p) return;
      const x = Math.min(1, Math.max(0, p.x + drag.dx));
      const y = Math.min(1, Math.max(0, p.y + drag.dy));
      setOverlays((prev) => prev.map((o) => (o.id === drag.id ? { ...o, x, y } : o)));
    },
    [studioPoint],
  );

  const onStudioPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const doodlePoint = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = doodleCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * STORY_WIDTH,
      y: ((e.clientY - rect.top) / rect.height) * STORY_HEIGHT,
    };
  }, []);

  const onDoodleDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = doodleCanvasRef.current;
      const p = doodlePoint(e);
      if (!canvas || !p) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      drawingRef.current = true;
      ctx.strokeStyle = doodleColor;
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    },
    [doodleColor, doodlePoint],
  );

  const onDoodleMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return;
      const canvas = doodleCanvasRef.current;
      const p = doodlePoint(e);
      if (!canvas || !p) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    },
    [doodlePoint],
  );

  const onDoodleUp = useCallback(() => {
    drawingRef.current = false;
  }, []);

  const clearDoodle = useCallback(() => {
    const canvas = doodleCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const share = useCallback(async () => {
    if (!stripUrl) return;
    try {
      const res = await fetch(stripUrl);
      const blob = await res.blob();
      const file = new File([blob], 'sachi-strip.png', { type: 'image/png' });
      if (canShareFiles() && navigator.share) {
        await navigator.share({ files: [file], title: 'Sachi strip' });
        return;
      }
    } catch {
      // Sharing failed or was dismissed — download still works.
    }
    const a = document.createElement('a');
    a.href = stripUrl;
    a.download = 'sachi-strip.png';
    a.click();
  }, [stripUrl]);

  const shuffleLook = useCallback(() => {
    const styles = BOOTH_STYLES;
    const filters = BOOTH_FILTERS;
    setStyleId(styles[Math.floor(Math.random() * styles.length)]!.id);
    setFilterId(filters[Math.floor(Math.random() * filters.length)]!.id);
  }, []);

  const scrapbook = useCallback(
    (shape: '4:5' | '9:16') => {
      if (!stripUrl) return;
      const { w, h } = scrapbookPageSize(shape);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = boothStyleById(styleId).frame;
      ctx.fillRect(0, 0, w, h);
      const img = new Image();
      img.onload = () => {
        const margin = 72;
        const maxH = h - margin * 2;
        const maxW = w - margin * 2;
        const scale = Math.min(maxW / img.width, maxH / img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;
        ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `sachi-scrapbook-${shape.replace(':', 'x')}.png`;
        a.click();
      };
      img.src = stripUrl;
    },
    [stripUrl, styleId],
  );

  const resetAll = useCallback(() => {
    cancelRun();
    shotsRef.current = [];
    setShotUrls([]);
    setStripUrl(null);
    setTogetherUrl(null);
    setOverlays([]);
    setPartnerShots([]);
    clearDoodle();
  }, [cancelRun, clearDoodle]);

  const showCamera = phase === 'idle' || phase === 'countdown';
  const poseCardPose = currentPose;
  const totalShots = shotCount;

  return (
    <section className="panel p-4 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-x-5">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold lg:col-span-2">
        <Camera size={18} aria-hidden /> Photo booth
      </h2>
      <p className="mt-1 text-sm text-[var(--ink-dim)] lg:col-span-2">
        Pose, count down, shoot — a timer before every shot, so you always get
        time to change pose. Nothing leaves this device, except the shared strip
        between two phones in a room.
      </p>
      {error && <p className="mt-2 text-sm lg:col-span-2">{error}</p>}
      {!cameraOn && (
        <button type="button" className="btn mt-3 lg:col-span-2" onClick={() => void startCamera()}>
          <RefreshCw size={16} aria-hidden /> Try camera again
        </button>
      )}

      {showCamera && (
        <div className="mt-3 flex flex-col gap-3 lg:col-start-1 lg:mt-0 lg:flex-row lg:items-start">
          <div className="order-2 lg:order-1 lg:w-[220px] lg:shrink-0">
            <FilterGrid
              selected={filterId}
              onSelect={setFilterId}
              stream={tileStream}
              mirror={mirror}
              columns="grid-cols-5 lg:grid-cols-2"
            />
          </div>
          <div className="order-1 flex min-w-0 flex-1 flex-col items-center lg:order-2">
            <div className="relative z-[41] w-full overflow-hidden rounded-xl bg-black lg:h-[min(78vh,920px)] lg:aspect-[3/4] lg:w-auto lg:max-w-full lg:flex-none">
              <video
                ref={(node) => {
                  videoRef.current = node;
                  // Re-attach on remount: the stream outlives the
                  // preview element (review/done unmount it, "Start
                  // over"/"Take another" remount it, and a retry can
                  // succeed while it is unmounted), so a fresh
                  // <video> would otherwise stay blank even though
                  // the camera is still running. Same pattern the
                  // live filter tiles already use.
                  if (node && streamRef.current && node.srcObject !== streamRef.current) {
                    node.srcObject = streamRef.current;
                    void node.play().catch(() => {});
                  }
                }}
                autoPlay
                playsInline
                muted
                className="aspect-[3/4] w-full object-cover lg:aspect-auto lg:h-full"
                style={{ transform: mirror ? 'scaleX(-1)' : undefined, filter: filterCss || undefined }}
                aria-label="Booth camera preview"
              />
            </div>
            {phase === 'idle' && (
              <>
                <button
                  type="button"
                  disabled={!cameraOn}
                  onClick={roomCode ? startTogether : startSolo}
                  aria-label={roomCode ? 'Start together' : manual ? 'Start (manual)' : `Take ${shotCount} shots`}
                  className="mt-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#ffc83d] text-black shadow-xl transition hover:scale-105 disabled:opacity-50"
                >
                  <Camera size={32} aria-hidden />
                </button>
                <p className="mt-2 text-sm font-semibold">
                  {roomCode ? 'Start together' : manual ? 'Start (manual)' : `Take ${shotCount} shots`}
                </p>
              </>
            )}
          </div>
          {flash && <div className="pointer-events-none fixed inset-0 z-[60] bg-white" aria-hidden />}
          {phase === 'countdown' && (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-2 bg-black/70 p-4 text-center text-white">
              {awaitingReady && poseCardPose ? (
                <>
                  <PoseCard pose={poseCardPose} shot={shot} total={totalShots} shooter={shooter} heading="Copy this!" />
                  <button type="button" className="btn btn-primary mt-2" onClick={manualReady}>
                    Ready — take it
                  </button>
                  <button type="button" className="btn mt-1" onClick={cancelRun}>
                    Cancel
                  </button>
                </>
              ) : poseCardPose && count === 0 ? (
                <>
                  <PoseCard pose={poseCardPose} shot={shot} total={totalShots} shooter={shooter} heading="Get ready…" />
                  <button type="button" className="btn mt-2" onClick={cancelRun}>
                    Cancel
                  </button>
                </>
              ) : count > 0 ? (
                <>
                  <span className="booth-count-pulse text-[26vw] font-bold leading-none drop-shadow lg:text-[14rem]">{count}</span>
                  <p className="text-sm font-semibold">
                    {retakeSlot !== null ? `Retaking shot ${retakeSlot + 1}` : `Shot ${shot + 1} of ${totalShots}`}
                  </p>
                  <button type="button" className="btn mt-2" onClick={cancelRun}>
                    Cancel
                  </button>
                </>
              ) : (
                <p className="text-sm font-semibold">Shot {shot} of {totalShots} taken</p>
              )}
            </div>
          )}
        </div>
      )}

      {phase === 'idle' && (
        <div className="mt-4 lg:col-start-1">
          <p className="text-sm font-semibold">Template 🎀</p>
          {(['classic', 'reel', 'template', 'rollbooth'] as const).map((g) => (
            <div key={g}>
              <p className="mt-3 text-xs font-semibold text-[var(--ink-dim)]">
                {g === 'classic' ? 'Classic' : g === 'reel' ? 'From the reel' : g === 'template' ? 'Templates' : 'Rollbooth-inspired'}
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2 lg:grid-cols-4">
                {BOOTH_STYLES.filter((s) => s.group === g).map((s) => (
                  <TemplateCard
                    key={s.id}
                    s={s}
                    active={s.id === styleId}
                    onSelect={() => setStyleId(s.id)}
                    caption={caption}
                  />
                ))}
              </div>
            </div>
          ))}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowSample((v) => !v)}
              aria-expanded={showSample}
            >
              ✨ {showSample ? 'Hide sample strip' : 'Try this template'}
            </button>
            {showSample && (
              <span className="text-xs text-[var(--ink-dim)]">Sample photos — your shots will replace these.</span>
            )}
          </div>
          {showSample && sampleUrl && (
            <div className="mt-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sampleUrl}
                alt={`Sample strip in the ${boothStyleById(styleId).name} template`}
                className="mx-auto w-full max-w-[240px] rounded-xl"
              />
            </div>
          )}
        </div>
      )}

      {phase === 'review' && (
        <div className="mt-3 lg:col-span-2">
          <h3 className="font-display text-lg font-bold">Review your shots</h3>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            Retake or upload any shot, then make the strip. The strip only builds
            when every shot is in — no blank gaps.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {Array.from({ length: shotCount }, (_, i) => (
              <div key={i} className="card overflow-hidden p-2">
                {shotUrls[i] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={shotUrls[i]} alt={`Shot ${i + 1}`} className="aspect-[3/4] w-full rounded-lg object-cover" />
                ) : (
                  <div className="flex aspect-[3/4] w-full items-center justify-center rounded-lg bg-black/10 text-sm">
                    Shot {i + 1} missing
                  </div>
                )}
                <div className="mt-2 flex gap-2">
                  <button type="button" className="btn !px-2 !py-1 text-xs" onClick={() => retake(i)}>
                    Retake
                  </button>
                  <label className="btn !px-2 !py-1 text-xs">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadIntoSlot(i, f);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canComposite(shotsRef.current.length, shotCount)}
              onClick={() => composite(true)}
            >
              Make the strip
            </button>
            <button type="button" className="btn" onClick={resetAll}>
              Start over
            </button>
          </div>
        </div>
      )}

      {phase === 'done' && stripUrl && (
        <div className="mt-3 lg:col-span-2">
          <p className="text-sm font-semibold">Filter</p>
          <div className="mt-2">
            <FilterGrid
              selected={filterId}
              onSelect={setFilterId}
              stream={tileStream}
              mirror={mirror}
              columns="grid-cols-5"
            />
          </div>
          <p className="mt-3 text-sm font-semibold">Template</p>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {BOOTH_STYLES.map((s) => (
              <TemplateCard
                key={s.id}
                s={s}
                active={s.id === styleId}
                onSelect={() => setStyleId(s.id)}
                caption={caption}
                small
              />
            ))}
          </div>
          <div className="relative mx-auto mt-3 w-full max-w-xs">
            <canvas
              ref={studioCanvasRef}
              width={360}
              height={640}
              className="w-full rounded-xl"
              style={{ touchAction: 'none' }}
              onPointerDown={onStudioPointerDown}
              onPointerMove={onStudioPointerMove}
              onPointerUp={onStudioPointerUp}
              aria-label="Strip studio preview — tap to place, drag to move"
            />
            <canvas
              ref={doodleCanvasRef}
              width={STORY_WIDTH}
              height={STORY_HEIGHT}
              className="absolute inset-0 h-full w-full rounded-xl"
              style={{ touchAction: 'none', visibility: doodleMode ? 'visible' : 'hidden', pointerEvents: doodleMode ? 'auto' : 'none' }}
              onPointerDown={onDoodleDown}
              onPointerMove={onDoodleMove}
              onPointerUp={onDoodleUp}
              aria-label="Doodle layer — draw on the strip"
            />
          </div>
          {!doodleMode && (
            <p className="mt-2 text-center text-xs text-[var(--ink-dim)]">
              {pendingSticker || pendingText
                ? 'Tap the strip to place it, then drag to move.'
                : 'Tap a sticker or text style below, then tap the strip to place it. Drag placed items to move them.'}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={() => composite(false)}>
              Update strip
            </button>
            <button type="button" className="btn" onClick={shuffleLook}>
              <Shuffle size={16} aria-hidden /> Shuffle look
            </button>
            <a className="btn" href={stripUrl} download="sachi-strip.png">
              <Download size={18} aria-hidden /> Download
            </a>
            <button type="button" className="btn" onClick={() => void share()}>
              <Share2 size={18} aria-hidden /> Share
            </button>
            <button type="button" className="btn" onClick={resetAll}>
              Take another
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn" onClick={() => scrapbook('4:5')}>
              Scrapbook 4:5
            </button>
            <button type="button" className="btn" onClick={() => scrapbook('9:16')}>
              Scrapbook 9:16
            </button>
            {selectedOverlay && (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setOverlays((prev) => prev.filter((o) => o.id !== selectedOverlay));
                  setSelectedOverlay(null);
                }}
              >
                Remove selected
              </button>
            )}
          </div>
          <div className="mt-4">
            <p className="text-sm font-semibold">Stickers</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {STICKER_PACKS.map((pack) => (
                <span key={pack.id} className="flex gap-1">
                  {pack.items.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={`btn !px-2 !py-1 text-lg${pendingSticker === emoji ? ' btn-primary' : ''}`}
                      aria-label={`Place ${pack.name} sticker ${emoji}`}
                      onClick={() => setPendingSticker(pendingSticker === emoji ? null : emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Words on the strip
              <input
                className="input"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Write something…"
                maxLength={40}
                aria-label="Words on the strip"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Style
              <select className="input" value={textStyleId} onChange={(e) => setTextStyleId(e.target.value)} aria-label="Text style">
                {TEXT_STYLES.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Colour
              <input
                className="input !w-20"
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                aria-label="Text colour"
              />
            </label>
            <button
              type="button"
              className="btn"
              disabled={!textInput.trim()}
              onClick={() => setPendingText({ text: textInput.trim(), styleId: textStyleId, color: textColor })}
            >
              Place text
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={doodleMode} onChange={(e) => setDoodleMode(e.target.checked)} />
              Doodle
            </label>
            {doodleMode && (
              <>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  Colour
                  <input
                    className="input !w-20"
                    type="color"
                    value={doodleColor}
                    onChange={(e) => setDoodleColor(e.target.value)}
                    aria-label="Doodle colour"
                  />
                </label>
                <button type="button" className="btn" onClick={clearDoodle}>
                  Clear doodle
                </button>
              </>
            )}
          </div>
          {roomCode && partnerShots.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-semibold">Your partner&rsquo;s shots are in!</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className="btn btn-primary" onClick={() => void makeTogetherStrip()}>
                  Make our together strip
                </button>
              </div>
              {togetherUrl && (
                <div className="mt-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={togetherUrl} alt="Your together strip" className="mx-auto w-full max-w-xs rounded-xl" />
                  <div className="mt-2 flex justify-center gap-2">
                    <a className="btn" href={togetherUrl} download="sachi-together-strip.png">
                      <Download size={18} aria-hidden /> Download together strip
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {phase === 'idle' && (
        <div className="lg:col-start-2">
          <div className="mt-3 lg:mt-0">
            <p className="text-sm font-semibold">Layout</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {BOOTH_LAYOUTS.map((l) => {
                const active = l.id === layoutId;
                const pickLayout = () => {
                  setLayoutId(l.id);
                  if (l.id === 'grid') setShotCount(4);
                  if (l.id === 'polaroid') setShotCount(1);
                };
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={pickLayout}
                    aria-pressed={active}
                    title={`${l.name} — ${l.note}`}
                    className={`rounded-xl border-[3px] p-1.5 text-left transition hover:-translate-y-0.5 ${
                      active ? 'booth-tile-active border-[#ffc83d]' : 'border-transparent'
                    }`}
                  >
                    <span className="block rounded-lg bg-black/10 p-1.5">
                      {l.id === 'strip' && (
                        <span className="flex flex-col gap-1">
                          <span className="block h-4 rounded-sm" style={{ background: 'linear-gradient(135deg,#ff4da6,#ffd98a 50%,#46a758)' }} />
                          <span className="block h-4 rounded-sm" style={{ background: 'linear-gradient(135deg,#ffd98a,#46a758 50%,#ff4da6)' }} />
                          <span className="block h-4 rounded-sm" style={{ background: 'linear-gradient(135deg,#46a758,#ff4da6 50%,#ffd98a)' }} />
                        </span>
                      )}
                      {l.id === 'grid' && (
                        <span className="grid grid-cols-2 gap-1">
                          <span className="block h-4 rounded-sm" style={{ background: 'linear-gradient(135deg,#ff4da6,#ffd98a 50%,#46a758)' }} />
                          <span className="block h-4 rounded-sm" style={{ background: 'linear-gradient(135deg,#ffd98a,#46a758 50%,#ff4da6)' }} />
                          <span className="block h-4 rounded-sm" style={{ background: 'linear-gradient(135deg,#46a758,#ff4da6 50%,#ffd98a)' }} />
                          <span className="block h-4 rounded-sm" style={{ background: 'linear-gradient(135deg,#ff4da6,#46a758 50%,#ffd98a)' }} />
                        </span>
                      )}
                      {l.id === 'polaroid' && (
                        <span className="flex flex-col">
                          <span className="block h-8 rounded-t-sm" style={{ background: 'linear-gradient(135deg,#ff4da6,#ffd98a 50%,#46a758)' }} />
                          <span className="block h-3 rounded-b-sm bg-[#fdf8ec]" />
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block truncate text-xs font-semibold">{l.name}</span>
                  </button>
                );
              })}
            </div>
            {layoutId === 'strip' && (
              <>
                <p className="mt-4 text-sm font-semibold">Shots</p>
                <div className="mt-2 flex gap-2">
                  {SHOT_COUNT_OPTIONS.map((n) => (
                    <Chip key={n} active={shotCount === n} onClick={() => setShotCount(n)} label={`${n} shots`}>
                      {n} shots
                    </Chip>
                  ))}
                </div>
              </>
            )}
            <p className="mt-4 text-sm font-semibold">Pose pack</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Chip active={posePackId === 'classic'} onClick={() => setPosePackId('classic')} label="Pose ideas">
                Pose ideas
              </Chip>
              <Chip active={posePackId === 'meme'} onClick={() => setPosePackId('meme')} label="Meme poses">
                Meme poses
              </Chip>
            </div>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Caption on the strip
              <input
                className="input"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Sachi"
                maxLength={40}
                aria-label="Caption on the strip"
              />
            </label>
          </div>
          <p className="mt-4 text-sm font-semibold">Options</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Chip active={showPoses} onClick={() => setShowPoses(!showPoses)} label="Pose ideas">
              Pose ideas
            </Chip>
            <Chip active={dateStamp} onClick={() => setDateStamp(!dateStamp)} label="Date on the strip">
              Date on the strip
            </Chip>
            <Chip active={mirror} onClick={() => toggleMirror(!mirror)} label="Mirror preview">
              Mirror preview
            </Chip>
            {!roomCode && (
              <Chip active={manual} onClick={() => setManual(!manual)} label="Manual shutter">
                Manual shutter
              </Chip>
            )}
            {!roomCode && (
              <Chip active={duoTurns} onClick={() => setDuoTurns(!duoTurns)} label="Duo turns">
                Duo turns
              </Chip>
            )}
            <Chip active={soundOn} onClick={() => setSoundOn(!soundOn)} label="Booth sounds">
              {soundOn ? <Volume2 size={16} aria-hidden /> : <VolumeX size={16} aria-hidden />}
              {soundOn ? 'Sound on' : 'Muted'}
            </Chip>
            {devices.length >= 2 && (
              <button type="button" className="btn !rounded-full !px-3 !py-1.5 text-xs" onClick={flipCamera}>
                <FlipHorizontal2 size={16} aria-hidden /> Flip camera
              </button>
            )}
          </div>
          {duoTurns && !roomCode && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm font-semibold">
                Player 1
                <input className="input" value={playerA} onChange={(e) => setPlayerA(e.target.value)} maxLength={20} aria-label="Player 1 name" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold">
                Player 2
                <input className="input" value={playerB} onChange={(e) => setPlayerB(e.target.value)} maxLength={20} aria-label="Player 2 name" />
              </label>
            </div>
          )}
          <p className="mt-2 text-xs text-[var(--ink-dim)]">
            How it runs: pick a filter from the live tiles, tap the big gold
            button, and pose — a pose card, then a full-screen 3-2-1, then the
            shot, for every shot. Mirror off shows the real image, as others
            see you; turn Mirror on for the selfie view.
            {manual && !roomCode ? ' In manual mode you press Ready for each shot.' : ''}
            {roomCode ? ' In a room, both phones count down together.' : ''}
          </p>
        </div>
      )}
    </section>
  );
}
