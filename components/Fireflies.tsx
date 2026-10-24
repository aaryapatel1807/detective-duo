'use client';

/**
 * Violet Night ambient art: fireflies drifting and blinking across the
 * whole page. Rendered only while the violet theme is active (see
 * ThemeProvider). Pure CSS motion, pointer-events none, and still dots
 * under prefers-reduced-motion. No images, no emoji.
 */
const FLIES: { left: string; top: string; size: number; d: string; dx: string; dy: string; dl: string; bl: string }[] = [
  { left: '6%', top: '18%', size: 7, d: '9s', dx: '46px', dy: '-30px', dl: '0s', bl: '.2s' },
  { left: '16%', top: '62%', size: 5, d: '13s', dx: '-38px', dy: '26px', dl: '1s', bl: '1.1s' },
  { left: '28%', top: '30%', size: 6, d: '11s', dx: '52px', dy: '20px', dl: '.5s', bl: '.6s' },
  { left: '44%', top: '12%', size: 5, d: '14s', dx: '-44px', dy: '34px', dl: '2s', bl: '0s' },
  { left: '58%', top: '48%', size: 8, d: '10s', dx: '36px', dy: '-42px', dl: '.3s', bl: '1.6s' },
  { left: '70%', top: '22%', size: 6, d: '12s', dx: '-50px', dy: '28px', dl: '1.4s', bl: '.9s' },
  { left: '82%', top: '58%', size: 5, d: '15s', dx: '40px', dy: '-26px', dl: '.8s', bl: '2.1s' },
  { left: '90%', top: '34%', size: 7, d: '9s', dx: '-36px', dy: '40px', dl: '2.4s', bl: '.4s' },
  { left: '36%', top: '76%', size: 6, d: '12s', dx: '44px', dy: '-24px', dl: '1.8s', bl: '1.3s' },
  { left: '64%', top: '82%', size: 5, d: '16s', dx: '-42px', dy: '-30px', dl: '.1s', bl: '2.6s' },
  { left: '22%', top: '44%', size: 5, d: '10s', dx: '30px', dy: '36px', dl: '2.9s', bl: '.7s' },
  { left: '76%', top: '72%', size: 6, d: '13s', dx: '-34px', dy: '-38px', dl: '1.1s', bl: '1.9s' },
];

export default function Fireflies() {
  return (
    <div className="theme-flies" aria-hidden>
      {FLIES.map((f, i) => (
        <i
          key={i}
          className="theme-fly"
          style={
            {
              left: f.left,
              top: f.top,
              width: f.size,
              height: f.size,
              '--fly-d': f.d,
              '--fly-dx': f.dx,
              '--fly-dy': f.dy,
              '--fly-dl': f.dl,
              '--fly-bl': f.bl,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
