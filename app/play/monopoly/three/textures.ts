/** Procedural canvas textures — no downloaded images, no fonts to fetch.
 * Everything is drawn with the 2D canvas API at small sizes so the
 * 3D bundle stays light and works offline. */
import * as THREE from 'three';

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

function toTexture(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Tile top: warm cream face, country colour bar, short name, price. */
export function tileTexture(shortName: string, colour: string, price: string): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(128, 128);
  ctx.fillStyle = '#fdf6e9';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, 128, 26);
  ctx.fillStyle = '#3a2a1a';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const words = shortName.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > 116 && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  lines.slice(0, 3).forEach((l, i) => ctx.fillText(l, 64, 56 + i * 20));
  if (price) {
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillStyle = '#7c2d12';
    ctx.fillText(price, 64, 116);
  }
  ctx.strokeStyle = 'rgba(58,42,26,0.35)';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 124, 124);
  return toTexture(c);
}

/** One die face: white rounded face with dark pips on a 3x3 grid. */
export function dieFaceTexture(value: number): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(128, 128);
  ctx.fillStyle = '#f8f8ff';
  ctx.beginPath();
  ctx.roundRect(2, 2, 124, 124, 22);
  ctx.fill();
  const pips: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  const on = new Set(pips[value] ?? [4]);
  for (let i = 0; i < 9; i += 1) {
    if (!on.has(i)) continue;
    const cx = 28 + (i % 3) * 36;
    const cy = 28 + Math.floor(i / 3) * 36;
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(cx, cy, 13, 0, Math.PI * 2);
    ctx.fill();
  }
  return toTexture(c);
}

/** Warm wood grain for the table and floor (procedural streaks). */
export function woodTexture(base: string, streak: string): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = streak;
  for (let i = 0; i < 26; i += 1) {
    ctx.lineWidth = 1 + Math.random() * 2.5;
    ctx.globalAlpha = 0.12 + Math.random() * 0.2;
    ctx.beginPath();
    const y = Math.random() * 256;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(64, y + (Math.random() - 0.5) * 22, 192, y + (Math.random() - 0.5) * 22, 256, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const t = toTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Card-deck back: patterned back for Chance (pink) or Chest (brown). */
export function deckTexture(deck: 'chance' | 'chest'): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(128, 160);
  ctx.fillStyle = deck === 'chance' ? '#c2185b' : '#5d3a1a';
  ctx.fillRect(0, 0, 128, 160);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, 108, 140);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 52px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(deck === 'chance' ? '?' : '✦', 64, 96);
  return toTexture(c);
}
