/**
 * Code-drawn strip pattern painters (moved out of PhotoBooth.tsx so
 * unit tests can import them without the component's JSX).
 *
 * Background painters run full-canvas behind the photos, so only the
 * margins show them. Foreground painters run after the photos and
 * must stay in the margins: they skip photo slots (see insideSlot)
 * so decorations never cover faces. Seeded decorations render
 * identically on every composite.
 */
import { seededPoints, type BoothStyle } from '../../lib/booth';

export function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x, y, x - s * 0.5, y - s * 0.1, x - s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x - s * 0.5, y + s * 0.7, x, y + s * 0.9, x, y + s * 1.1);
  ctx.bezierCurveTo(x, y + s * 0.9, x + s * 0.5, y + s * 0.7, x + s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x + s * 0.5, y - s * 0.1, x, y, x, y + s * 0.3);
  ctx.fill();
}

export function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const px = x + Math.cos(a) * rad;
    const py = y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

/** True when a point sits inside (or near) any photo slot. Foreground
 * decorations skip these points so stars, glitter and doodles never
 * cover faces — they live on the paper around the photos. */
function insideSlot(
  x: number,
  y: number,
  slots: { x: number; y: number; w: number; h: number }[],
  pad: number,
): boolean {
  return slots.some(
    (s) => x >= s.x - pad && x <= s.x + s.w + pad && y >= s.y - pad && y <= s.y + s.h + pad,
  );
}

/** Background patterns: painted full-canvas behind the photos, so
 * only the margins show them. Exported for unit tests (the painters
 * take a canvas context, so tests pass a stub). */
export function drawPatternBackground(
  ctx: CanvasRenderingContext2D,
  style: BoothStyle,
  w: number,
  h: number,
) {
  const p = style.pattern;
  if (!p) return;
  ctx.save();
  if (p.kind === 'dots') {
    ctx.fillStyle = p.color;
    for (let y = p.gap / 2; y < h; y += p.gap) {
      for (let x = p.gap / 2; x < w; x += p.gap) {
        ctx.beginPath();
        ctx.arc(x, y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (p.kind === 'stripes') {
    for (let x = 0, i = 0; x < w; x += p.width, i++) {
      ctx.fillStyle = p.colors[i % p.colors.length]!;
      ctx.fillRect(x, 0, p.width, h);
    }
  } else if (p.kind === 'checker') {
    ctx.fillStyle = p.color;
    const s = p.size;
    for (let y = 0, row = 0; y < h; y += s, row++) {
      for (let x = row % 2 === 0 ? 0 : s; x < w; x += s * 2) ctx.fillRect(x, y, s, s);
    }
  } else if (p.kind === 'gingham') {
    // Classic gingham: translucent bands both ways over the base —
    // crossings go darker, exactly like woven cloth.
    ctx.fillStyle = p.base;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = p.color;
    for (let x = 0; x < w; x += 48) ctx.fillRect(x, 0, 24, h);
    for (let y = 0; y < h; y += 48) ctx.fillRect(0, y, w, 24);
    ctx.globalAlpha = 1;
  } else if (p.kind === 'header') {
    ctx.fillStyle = p.color;
    ctx.fillRect(0, 0, w, p.height);
  } else if (p.kind === 'airmail') {
    // Diagonal red/blue stripes down both long edges, with white
    // gaps — clipped to the edge bands so they never touch a photo.
    const seq = [p.colors[0]!, '#ffffff', p.colors[1]!, '#ffffff'];
    const band = 64;
    const stripe = (x0: number) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, 0, band, h);
      ctx.clip();
      ctx.lineWidth = 10;
      for (let d = -h, i = 0; d < h + band; d += 30, i++) {
        ctx.strokeStyle = seq[i % seq.length]!;
        ctx.beginPath();
        ctx.moveTo(x0 + d, -10);
        ctx.lineTo(x0 + d + h + 20, h + 10);
        ctx.stroke();
      }
      ctx.restore();
    };
    stripe(0);
    stripe(w - band);
  } else if (p.kind === 'colourroom') {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, p.colors[0]!);
    g.addColorStop(1, p.colors[1]!);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else if (p.kind === 'starframe') {
    // Faint olive speckle behind the photos; the star ring itself is
    // foreground (it must hug the slots).
    ctx.fillStyle = p.texture;
    ctx.globalAlpha = 0.14;
    seededPoints(style.id, 260, w, h, 0).forEach((pt) => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawCherry(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.strokeStyle = '#3d5a3a';
  ctx.lineWidth = Math.max(2, s * 0.08);
  ctx.beginPath();
  ctx.moveTo(x - s * 0.3, y);
  ctx.quadraticCurveTo(x, y - s * 0.9, x + s * 0.4, y - s * 0.7);
  ctx.stroke();
  ctx.fillStyle = '#e5484d';
  ctx.beginPath();
  ctx.arc(x - s * 0.35, y + s * 0.15, s * 0.32, 0, Math.PI * 2);
  ctx.arc(x + s * 0.3, y + s * 0.25, s * 0.28, 0, Math.PI * 2);
  ctx.fill();
}

function drawMiniFlower(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  petal: string,
) {
  ctx.fillStyle = petal;
  for (let i = 0; i < 5; i++) {
    const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * s * 0.5, y + Math.sin(a) * s * 0.5, s * 0.32, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffd98a';
  ctx.beginPath();
  ctx.arc(x, y, s * 0.25, 0, Math.PI * 2);
  ctx.fill();
}

function drawSmiley(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.fillStyle = '#ffd98a';
  ctx.beginPath();
  ctx.arc(x, y, s * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2b2118';
  ctx.beginPath();
  ctx.arc(x - s * 0.18, y - s * 0.1, s * 0.06, 0, Math.PI * 2);
  ctx.arc(x + s * 0.18, y - s * 0.1, s * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2b2118';
  ctx.lineWidth = Math.max(2, s * 0.05);
  ctx.beginPath();
  ctx.arc(x, y + s * 0.05, s * 0.25, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
}

function zigzagRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  step: number,
  tooth: number,
) {
  ctx.beginPath();
  for (let px = x, i = 0; px <= x + w; px += step, i++) {
    const py = y + (i % 2 === 0 ? -tooth : 0);
    if (px === x) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  for (let py = y, i = 0; py <= y + h; py += step, i++) {
    ctx.lineTo(x + w + (i % 2 === 0 ? tooth : 0), py);
  }
  for (let px = x + w, i = 0; px >= x; px -= step, i++) {
    ctx.lineTo(px, y + h + (i % 2 === 0 ? tooth : 0));
  }
  for (let py = y + h, i = 0; py >= y; py -= step, i++) {
    ctx.lineTo(x + (i % 2 === 0 ? -tooth : 0), py);
  }
  ctx.closePath();
  ctx.stroke();
}

function drawPumpkin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, s * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c2410c';
  ctx.lineWidth = Math.max(2, s * 0.05);
  ctx.beginPath();
  ctx.ellipse(x, y, s * 0.22, s * 0.46, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#3d5a3a';
  ctx.fillRect(x - s * 0.04, y - s * 0.62, s * 0.08, s * 0.16);
}

function drawLeaf(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - s * 0.5);
  ctx.quadraticCurveTo(x + s * 0.55, y - s * 0.1, x, y + s * 0.5);
  ctx.quadraticCurveTo(x - s * 0.55, y - s * 0.1, x, y - s * 0.5);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - s * 0.5);
  ctx.lineTo(x, y + s * 0.5);
  ctx.stroke();
}

/** Two-triangle bow doodle; uses the caller's fillStyle. */
function drawBow(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - s * 0.5, y - s * 0.32);
  ctx.lineTo(x - s * 0.5, y + s * 0.32);
  ctx.closePath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + s * 0.5, y - s * 0.32);
  ctx.lineTo(x + s * 0.5, y + s * 0.32);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, s * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

function drawButterfly(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  color: string,
) {
  ctx.fillStyle = color;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(x + side * s * 0.32, y - s * 0.12, s * 0.3, s * 0.2, side * 0.5, 0, Math.PI * 2);
    ctx.ellipse(x + side * s * 0.28, y + s * 0.18, s * 0.22, s * 0.14, -side * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#2b2118';
  ctx.beginPath();
  ctx.ellipse(x, y, s * 0.06, s * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Hand-drawn squiggle: a two-cycle sine wave. */
function drawSquiggleLoop(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  len: number,
  dir: 1 | -1,
) {
  ctx.beginPath();
  for (let t = 0; t <= len; t += 6) {
    const px = x + t;
    const py = y + Math.sin((t / len) * Math.PI * 4) * 8 * dir;
    if (t === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
}

function drawSmileyFace(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  face: string,
  ink: string,
) {
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.arc(x - r * 0.36, y - r * 0.2, r * 0.12, 0, Math.PI * 2);
  ctx.arc(x + r * 0.36, y - r * 0.2, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(2, r * 0.08);
  ctx.beginPath();
  ctx.arc(x, y + r * 0.1, r * 0.5, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
}

/** Foreground decorations: margins only, never over the photos.
 * Exported for unit tests (see drawPatternBackground). */
export function drawPatternForeground(
  ctx: CanvasRenderingContext2D,
  style: BoothStyle,
  slots: { x: number; y: number; w: number; h: number }[],
  w: number,
  h: number,
) {
  const p = style.pattern;
  if (!p) return;
  ctx.save();
  // Top of the caption band: the last photo's bottom edge in every
  // layout, so footer motifs can sit just below the photos without
  // ever touching the centred caption or date.
  const bandTop = slots.length > 0 ? Math.max(...slots.map((s) => s.y + s.h)) : h - 208;
  if (p.kind === 'stars') {
    const pts = seededPoints(style.id, p.count, w, h, 48).filter(
      (pt) => !insideSlot(pt.x, pt.y, slots, 16),
    );
    pts.forEach((pt, i) => {
      ctx.fillStyle = p.colors[i % p.colors.length]!;
      drawStar(ctx, pt.x, pt.y, 14 + (i % 3) * 6);
    });
  } else if (p.kind === 'glitter') {
    const pts = seededPoints(style.id, p.count, w, h, 48).filter(
      (pt) => !insideSlot(pt.x, pt.y, slots, 16),
    );
    pts.forEach((pt, i) => {
      ctx.fillStyle = p.colors[i % p.colors.length]!;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3 + (i % 4), 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (p.kind === 'lace') {
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 3;
    ctx.strokeRect(18, 18, w - 36, h - 36);
    ctx.fillStyle = p.color;
    const r = 15;
    const step = r * 2;
    for (let x = 18; x <= w - 18; x += step) {
      ctx.beginPath();
      ctx.arc(x, 18, r, 0, Math.PI * 2);
      ctx.arc(x, h - 18, r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let y = 18; y <= h - 18; y += step) {
      ctx.beginPath();
      ctx.arc(18, y, r, 0, Math.PI * 2);
      ctx.arc(w - 18, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (p.kind === 'lights') {
    // The strip reserves a taller top margin for this template (see
    // composite), so the wire hangs in the header band, never over a
    // photo. Wire sags gently; bulbs hang just below it.
    const topY = slots.length > 0 ? Math.min(...slots.map((s) => s.y)) : 200;
    const wireY = topY * 0.45;
    const sag = topY * 0.3;
    ctx.strokeStyle = '#3a2c1c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, wireY);
    ctx.quadraticCurveTo(w / 2, wireY + sag, w, wireY);
    ctx.stroke();
    const bulbs = ['#ffd98a', '#ff8fb3', '#8fd0ff', '#b6ff8f'];
    for (let i = 0; i < 12; i++) {
      const t = (i + 1) / 13;
      const x = t * w;
      const y = (1 - t) * (1 - t) * wireY + 2 * (1 - t) * t * (wireY + sag) + t * t * wireY;
      ctx.fillStyle = bulbs[i % bulbs.length]!;
      ctx.beginPath();
      ctx.arc(x, y + 12, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (p.kind === 'floral') {
    const corners: [number, number][] = [
      [70, 70],
      [w - 70, 70],
      [70, h - 70],
      [w - 70, h - 70],
    ];
    corners.forEach(([cx, cy], ci) => {
      drawMiniFlower(ctx, cx, cy, 56, p.colors[ci % p.colors.length]!);
      drawMiniFlower(ctx, cx + (cx < w / 2 ? 44 : -44), cy + 30, 34, p.colors[(ci + 1) % p.colors.length]!);
    });
  } else if (p.kind === 'stamp') {
    ctx.strokeStyle = style.caption;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 3;
    for (const slot of slots) zigzagRect(ctx, slot.x, slot.y, slot.w, slot.h, 26, 9);
    ctx.globalAlpha = 1;
    // Bows where the gaps between photos are.
    for (let i = 0; i < slots.length - 1; i++) {
      const gapY = (slots[i]!.y + slots[i]!.h + slots[i + 1]!.y) / 2;
      const cx = w / 2;
      ctx.fillStyle = style.caption;
      ctx.beginPath();
      ctx.moveTo(cx, gapY);
      ctx.lineTo(cx - 34, gapY - 20);
      ctx.lineTo(cx - 34, gapY + 20);
      ctx.closePath();
      ctx.moveTo(cx, gapY);
      ctx.lineTo(cx + 34, gapY - 20);
      ctx.lineTo(cx + 34, gapY + 20);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, gapY, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (p.kind === 'doodles') {
    const pts = seededPoints(style.id, 24, w, h, 48).filter(
      (pt) => !insideSlot(pt.x, pt.y, slots, 20),
    );
    pts.forEach((pt, i) => {
      if (i % 3 === 0) drawCherry(ctx, pt.x, pt.y, 44);
      else if (i % 3 === 1) drawMiniFlower(ctx, pt.x, pt.y, 48, i % 2 === 0 ? '#ff8fb3' : '#7fb6e8');
      else drawSmiley(ctx, pt.x, pt.y, 48);
    });
  } else if (p.kind === 'airmail') {
    // Stamp (dashed rect, bottom right) + postmark circle (bottom
    // left) in the caption band's corners — the centred caption and
    // date stay clear of both.
    ctx.strokeStyle = p.colors[1]!;
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(w - 124, h - 88, 68, 44);
    ctx.setLineDash([]);
    ctx.fillStyle = p.colors[0]!;
    ctx.beginPath();
    ctx.arc(w - 90, h - 66, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = p.colors[0]!;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(90, h - 66, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = p.colors[0]!;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(74, h - 66);
    ctx.lineTo(106, h - 66);
    ctx.stroke();
  } else if (p.kind === 'ticket') {
    // Cream stub in the bottom margin, below the caption band, with
    // a perforated top edge and notches — so the caption and the
    // date stamp never sit on it. ADMIT TWO is a generic frame word.
    const y = h - 46;
    ctx.fillStyle = p.stub;
    ctx.fillRect(48, y, w - 96, 42);
    ctx.strokeStyle = style.caption;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(48, y);
    ctx.lineTo(w - 48, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = style.frame;
    ctx.beginPath();
    ctx.arc(48, y + 21, 10, 0, Math.PI * 2);
    ctx.arc(w - 48, y + 21, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.ink;
    ctx.font = '28px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ADMIT TWO', w / 2, y + 21, w - 200);
  } else if (p.kind === 'wanted') {
    // Distressed parchment: darker blotches at the edges + a rough
    // double border, then the WANTED header in the top margin and
    // small stars in the margins (never over photos).
    ctx.fillStyle = '#8a6a4d';
    ctx.globalAlpha = 0.08;
    seededPoints(`${style.id}-age`, 26, w, h, 0).forEach((pt, i) => {
      ctx.beginPath();
      ctx.ellipse(pt.x, pt.y, 60 + (i % 4) * 40, 40 + (i % 3) * 30, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#8a6a4d';
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.globalAlpha = 0.25;
    ctx.strokeRect(24, 24, w - 48, h - 48);
    ctx.globalAlpha = 1;
    ctx.fillStyle = style.caption;
    ctx.font = '700 36px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('WANTED', w / 2, 30, w - 96);
    seededPoints(style.id, 18, w, h, 48)
      .filter((pt) => !insideSlot(pt.x, pt.y, slots, 20))
      .forEach((pt) => drawStar(ctx, pt.x, pt.y, 12));
  } else if (p.kind === 'halloween') {
    // Thin dark border, a full moon in the caption band's top-right
    // corner, and little pumpkins flanking the footer — the centre
    // stays clear for the caption and date.
    ctx.strokeStyle = '#0d0a14';
    ctx.lineWidth = 3;
    ctx.strokeRect(12, 12, w - 24, h - 24);
    ctx.fillStyle = p.moon;
    ctx.beginPath();
    ctx.arc(w - 110, bandTop + 36, 26, 0, Math.PI * 2);
    ctx.fill();
    for (let x = 96; x < w - 48; x += 120) {
      if (Math.abs(x - w / 2) < 220) continue;
      drawPumpkin(ctx, x, h - 62, 30, p.pumpkin);
    }
  } else if (p.kind === 'thanksgiving') {
    ctx.strokeStyle = p.border;
    ctx.lineWidth = 3;
    ctx.strokeRect(14, 14, w - 28, h - 28);
    drawPumpkin(ctx, 110, h - 70, 34, p.pumpkin);
    drawPumpkin(ctx, w - 110, h - 70, 34, p.pumpkin);
    drawLeaf(ctx, 172, h - 64, 26, p.leaf);
    drawLeaf(ctx, w - 172, h - 64, 26, p.leaf);
  } else if (p.kind === 'stitch') {
    // Dashed stitch lines down both long edges, plus a
    // star-heart-star divider at the top of the caption band.
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.moveTo(24, 24);
    ctx.lineTo(24, h - 24);
    ctx.moveTo(w - 24, 24);
    ctx.lineTo(w - 24, h - 24);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = p.color;
    drawStar(ctx, w / 2 - 40, bandTop + 24, 14);
    drawHeart(ctx, w / 2 - 8, bandTop + 14, 20);
    drawStar(ctx, w / 2 + 40, bandTop + 24, 14);
  } else if (p.kind === 'starframe') {
    // Small black stars ring every slot from OUTSIDE it: left/right
    // edges only on the outer columns (so grid neighbours never
    // double up in the shared gutter), top edge on every slot, and
    // the bottom edge only on the last row.
    const maxBottom = slots.length > 0 ? Math.max(...slots.map((s) => s.y + s.h)) : 0;
    ctx.fillStyle = p.color;
    for (const s of slots) {
      const leftOuter = s.x <= 49;
      const rightOuter = s.x + s.w >= w - 49;
      if (leftOuter) {
        for (let y = s.y + 24; y < s.y + s.h - 12; y += 56) drawStar(ctx, s.x - 12, y, 10);
      }
      if (rightOuter) {
        for (let y = s.y + 24; y < s.y + s.h - 12; y += 56) drawStar(ctx, s.x + s.w + 12, y, 10);
      }
      for (let x = s.x + 24; x < s.x + s.w - 12; x += 56) drawStar(ctx, x, s.y - 12, 10);
      if (s.y + s.h >= maxBottom - 1) {
        for (let x = s.x + 24; x < s.x + s.w - 12; x += 56) drawStar(ctx, x, s.y + s.h + 12, 10);
      }
    }
  } else if (p.kind === 'scrapstars') {
    // Sage frame around each photo, then margin-only doodles: pink
    // stars, pink hearts, sage plus-sparkles.
    ctx.strokeStyle = p.frame;
    ctx.lineWidth = 6;
    for (const s of slots) ctx.strokeRect(s.x - 8, s.y - 8, s.w + 16, s.h + 16);
    seededPoints(style.id, 26, w, h, 48)
      .filter((pt) => !insideSlot(pt.x, pt.y, slots, 22))
      .forEach((pt, i) => {
        if (i % 3 === 0) {
          ctx.fillStyle = p.star;
          drawStar(ctx, pt.x, pt.y, 14);
        } else if (i % 3 === 1) {
          ctx.fillStyle = p.heart;
          drawHeart(ctx, pt.x - 8, pt.y - 8, 18);
        } else {
          ctx.strokeStyle = p.frame;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(pt.x - 12, pt.y);
          ctx.lineTo(pt.x + 12, pt.y);
          ctx.moveTo(pt.x, pt.y - 12);
          ctx.lineTo(pt.x, pt.y + 12);
          ctx.stroke();
        }
      });
  } else if (p.kind === 'birthdayscrap') {
    // Bow doodles: top centre + left middle edge; a butterfly in the
    // caption band's top centre, above the caption text.
    ctx.fillStyle = p.color;
    drawBow(ctx, w / 2, 26, 40);
    drawBow(ctx, 26, h / 2, 34);
    drawButterfly(ctx, w / 2, bandTop + 26, 30, p.color);
  } else if (p.kind === 'blend') {
    // Gradient-melt seams: where two slots share an edge, the gutter
    // between them gets a soft pastel gradient instead of flat card.
    const grad = (x0: number, y0: number, x1: number, y1: number) => {
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, p.colors[0]!);
      g.addColorStop(0.5, p.colors[1]!);
      g.addColorStop(1, p.colors[2]!);
      return g;
    };
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const a = slots[i]!;
        const b = slots[j]!;
        const xOverlap = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const yOverlap = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        if (xOverlap > 0 && b.y >= a.y + a.h && b.y - (a.y + a.h) < 120) {
          // b directly below a: vertical seam
          ctx.fillStyle = grad(0, a.y + a.h, 0, b.y);
          ctx.fillRect(Math.max(a.x, b.x), a.y + a.h, xOverlap, b.y - (a.y + a.h));
        } else if (yOverlap > 0 && b.x >= a.x + a.w && b.x - (a.x + a.w) < 120) {
          // b directly right of a: horizontal seam
          ctx.fillStyle = grad(a.x + a.w, 0, b.x, 0);
          ctx.fillRect(a.x + a.w, Math.max(a.y, b.y), b.x - (a.x + a.w), yOverlap);
        }
      }
    }
    ctx.strokeStyle = p.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = style.caption;
    drawStar(ctx, w / 2, h - 24, 12);
  } else if (p.kind === 'colourroom') {
    // The only motifs: one soft pink smiley in the wide top margin
    // and a matching pink semicircle in the wide bottom margin.
    const topY = slots.length > 0 ? Math.min(...slots.map((s) => s.y)) : 200;
    drawSmileyFace(ctx, w / 2, topY / 2, 56, p.motif, p.ink);
    ctx.fillStyle = p.motif;
    ctx.beginPath();
    ctx.arc(w / 2, h, 110, Math.PI, 0);
    ctx.fill();
  } else if (p.kind === 'squiggle') {
    // Red hand-drawn squiggle loops along the top and bottom edges
    // (the frame, never over photos), plus a small heart.
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    const w1 = 60;
    [24, h - 24].forEach((y) => {
      [0.25, 0.5, 0.75].forEach((f) => {
        drawSquiggleLoop(ctx, w * f - w1 / 2, y - 8, w1, 1);
      });
    });
    ctx.fillStyle = p.color;
    drawHeart(ctx, w - 60, 18, 18);
  }
  ctx.restore();
}
