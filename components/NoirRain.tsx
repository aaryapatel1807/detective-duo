'use client';

/**
 * Noir ambient art: thin rain streaks falling diagonally past warm
 * lamplight. Rendered only while the noir theme is active (see
 * ThemeProvider). Noir's colours are untouched — this only adds life.
 * Pure CSS motion, pointer-events none, and hidden under
 * prefers-reduced-motion (frozen streaks would read as scratches).
 * No images, no emoji.
 */
const DROPS: { left: string; height: number; d: string; dl: string }[] = [
  { left: '4%', height: 70, d: '7s', dl: '-1s' },
  { left: '11%', height: 95, d: '9s', dl: '-4s' },
  { left: '19%', height: 60, d: '6s', dl: '-2s' },
  { left: '27%', height: 85, d: '8s', dl: '-6s' },
  { left: '35%', height: 65, d: '7s', dl: '-3s' },
  { left: '44%', height: 100, d: '10s', dl: '-8s' },
  { left: '53%', height: 70, d: '6s', dl: '-5s' },
  { left: '61%', height: 90, d: '9s', dl: '-2s' },
  { left: '69%', height: 60, d: '7s', dl: '-7s' },
  { left: '77%', height: 85, d: '8s', dl: '-1s' },
  { left: '85%', height: 70, d: '6s', dl: '-4s' },
  { left: '93%', height: 95, d: '9s', dl: '-6s' },
];

export default function NoirRain() {
  return (
    <div className="theme-rain" aria-hidden>
      {DROPS.map((d, i) => (
        <i
          key={i}
          className="theme-drop"
          style={
            {
              left: d.left,
              height: d.height,
              '--rain-d': d.d,
              '--rain-dl': d.dl,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
