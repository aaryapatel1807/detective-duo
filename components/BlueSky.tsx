'use client';

/**
 * Blue ambient art: soft clouds drifting across the sky and gold stars
 * twinkling. Rendered only while the blue theme is active (see
 * ThemeProvider). Blue's colours are untouched — this only adds life.
 * Pure CSS motion, pointer-events none, and still under
 * prefers-reduced-motion. No images, no emoji.
 */
const CLOUDS: { top: string; width: number; height: number; d: string; dl: string; o: number }[] = [
  { top: '6%', width: 210, height: 52, d: '85s', dl: '-12s', o: 0.75 },
  { top: '20%', width: 160, height: 42, d: '65s', dl: '-40s', o: 0.6 },
  { top: '38%', width: 250, height: 60, d: '100s', dl: '-70s', o: 0.8 },
  { top: '58%', width: 180, height: 46, d: '75s', dl: '-25s', o: 0.55 },
  { top: '76%', width: 220, height: 54, d: '95s', dl: '-55s', o: 0.7 },
];

const STARS: { left: string; top: string; size: number; bl: string }[] = [
  { left: '12%', top: '14%', size: 6, bl: '.3s' },
  { left: '24%', top: '52%', size: 5, bl: '1.4s' },
  { left: '47%', top: '10%', size: 5, bl: '2.2s' },
  { left: '66%', top: '30%', size: 6, bl: '.8s' },
  { left: '80%', top: '16%', size: 5, bl: '1.9s' },
  { left: '88%', top: '56%', size: 6, bl: '2.7s' },
  { left: '36%', top: '70%', size: 5, bl: '1.1s' },
  { left: '58%', top: '82%', size: 5, bl: '3.1s' },
];

export default function BlueSky() {
  return (
    <div className="theme-sky" aria-hidden>
      {CLOUDS.map((c, i) => (
        <i
          key={`c${i}`}
          className="theme-cloud"
          style={
            {
              top: c.top,
              width: c.width,
              height: c.height,
              '--cloud-d': c.d,
              '--cloud-dl': c.dl,
              opacity: c.o,
            } as React.CSSProperties
          }
        />
      ))}
      {STARS.map((s, i) => (
        <i
          key={`s${i}`}
          className="theme-bstar"
          style={
            {
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              '--star-bl': s.bl,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
