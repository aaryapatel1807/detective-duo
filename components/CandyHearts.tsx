'use client';

/**
 * Candy ambient art: little pastel hearts drifting up the page, with
 * sprinkle dashes twinkling. Rendered only while the candy theme is
 * active (see ThemeProvider). Candy's colours are untouched — this
 * only adds life. Pure CSS motion, pointer-events none, and still
 * under prefers-reduced-motion (hearts rest at scattered heights).
 * No images, no emoji.
 */
const HEART_PATH =
  'M16 29C4 20 0 14 0 8 0 3 4 0 8 0c4 0 7 2 8 5 1-3 4-5 8-5 4 0 8 3 8 8 0 6-4 12-16 21z';

const HEARTS: { left: string; size: number; fill: string; d: string; dl: string }[] = [
  { left: '6%', size: 34, fill: '#ff9ebb', d: '26s', dl: '-2s' },
  { left: '18%', size: 28, fill: '#8fe8c8', d: '32s', dl: '-8s' },
  { left: '38%', size: 38, fill: '#c4a8ff', d: '29s', dl: '-14s' },
  { left: '62%', size: 30, fill: '#ffd76a', d: '35s', dl: '-20s' },
  { left: '82%', size: 36, fill: '#ff9ebb', d: '27s', dl: '-6s' },
  { left: '92%', size: 26, fill: '#8fe8c8', d: '31s', dl: '-12s' },
];

const SPRINKLES: { left: string; top: string; fill: string; rot: string; dl: string }[] = [
  { left: '14%', top: '20%', fill: '#ff9ebb', rot: '24deg', dl: '.4s' },
  { left: '30%', top: '62%', fill: '#8fe8c8', rot: '-18deg', dl: '1.3s' },
  { left: '52%', top: '14%', fill: '#c4a8ff', rot: '40deg', dl: '2.1s' },
  { left: '70%', top: '44%', fill: '#ffd76a', rot: '-30deg', dl: '.9s' },
  { left: '86%', top: '68%', fill: '#ff9ebb', rot: '12deg', dl: '1.8s' },
  { left: '44%', top: '80%', fill: '#8fe8c8', rot: '55deg', dl: '2.6s' },
];

export default function CandyHearts() {
  return (
    <div className="candy-sky" aria-hidden>
      {HEARTS.map((h, i) => (
        <svg
          key={i}
          className="candy-heart"
          viewBox="0 0 32 29"
          style={
            {
              left: h.left,
              width: h.size,
              height: h.size * 0.9,
              fill: h.fill,
              '--heart-d': h.d,
              '--heart-dl': h.dl,
            } as React.CSSProperties
          }
        >
          <path d={HEART_PATH} />
        </svg>
      ))}
      {SPRINKLES.map((s, i) => (
        <i
          key={i}
          className="candy-sprinkle"
          style={
            {
              left: s.left,
              top: s.top,
              background: s.fill,
              '--sprinkle-rot': s.rot,
              '--sprinkle-dl': s.dl,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
