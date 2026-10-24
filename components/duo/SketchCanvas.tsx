'use client';

/**
 * Freehand drawing canvas for Sketch the Clue (solo + together).
 * Strokes are plain point arrays, so they sync through session state
 * (together) or localStorage (solo resume) as JSON. Ink colour follows
 * the active theme token.
 */
import { useEffect, useRef } from 'react';
import type { Stroke } from '@/lib/generators/sketchWords';

export default function SketchCanvas({
  strokes,
  onStrokeEnd,
  disabled,
}: {
  strokes: Stroke[];
  onStrokeEnd: (s: Stroke) => void;
  disabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<Stroke | null>(null);

  // Redraw everything whenever the stroke list changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const ink = getComputedStyle(canvas).getPropertyValue('--ink').trim() || '#000';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const s of strokes) {
      if (s.points.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(s.points[0][0], s.points[0][1]);
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i][0], s.points[i][1]);
      }
      ctx.stroke();
    }
  }, [strokes]);

  const toLocal = (e: React.PointerEvent): [number, number] => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    return [Math.round(x), Math.round(y)];
  };

  const onDown = (e: React.PointerEvent) => {
    if (disabled) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    drawing.current = { points: [toLocal(e)] };
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const pt = toLocal(e);
    const pts = drawing.current.points;
    const last = pts[pts.length - 1];
    if (Math.hypot(pt[0] - last[0], pt[1] - last[1]) < 3) return;
    pts.push(pt);
    // Live preview: draw just the new segment.
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      const ink = getComputedStyle(canvas).getPropertyValue('--ink').trim() || '#000';
      ctx.strokeStyle = ink;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(last[0], last[1]);
      ctx.lineTo(pt[0], pt[1]);
      ctx.stroke();
    }
  };

  const onUp = () => {
    if (!drawing.current) return;
    const s = drawing.current;
    drawing.current = null;
    if (s.points.length >= 2) onStrokeEnd(s);
  };

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={400}
      className="w-full touch-none rounded-[var(--radius)]"
      style={{
        background: 'var(--cell)',
        border: '2px solid var(--cell-line)',
        cursor: disabled ? 'default' : 'crosshair',
      }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      aria-label="Drawing canvas"
    />
  );
}
