'use client';

/**
 * Cherry-Sealed falling petals: notched sakura petals drifting down the
 * page in three depths (near, mid, far). Rendered only while the cherry
 * theme is active (see ThemeProvider), on top of the theme's photographic
 * backdrop (see the cherry body rule in globals.css). Pure CSS motion,
 * pointer-events none, and hidden under prefers-reduced-motion. No images,
 * no emoji — the petals are CSS shapes; the photo itself is the user's
 * own upload in public/blossoms/.
 */
interface Petal {
  left: string;
  size: number;
  d: string;
  dl: string;
  sway: string;
  drift: string;
  r0: string;
  far?: boolean;
}

const PETALS: Petal[] = [
  { left: '2%', size: 18, d: '12s', dl: '0s', sway: '3.1s', drift: '50px', r0: '20deg' },
  { left: '5%', size: 14, d: '10s', dl: '1s', sway: '2.6s', drift: '-40px', r0: '140deg' },
  { left: '8%', size: 20, d: '14s', dl: '3s', sway: '3.8s', drift: '60px', r0: '70deg' },
  { left: '12%', size: 15, d: '11s', dl: '2s', sway: '2.9s', drift: '-55px', r0: '200deg' },
  { left: '16%', size: 17, d: '13s', dl: '4s', sway: '3.3s', drift: '45px', r0: '110deg' },
  { left: '20%', size: 13, d: '10s', dl: '5s', sway: '2.5s', drift: '-35px', r0: '250deg' },
  { left: '26%', size: 16, d: '12s', dl: '1.5s', sway: '3.0s', drift: '55px', r0: '40deg' },
  { left: '34%', size: 14, d: '14s', dl: '6s', sway: '3.5s', drift: '-45px', r0: '300deg' },
  { left: '44%', size: 18, d: '11s', dl: '2.5s', sway: '2.8s', drift: '40px', r0: '90deg' },
  { left: '54%', size: 15, d: '13s', dl: '4.5s', sway: '3.4s', drift: '-50px', r0: '170deg' },
  { left: '63%', size: 17, d: '12s', dl: '0.5s', sway: '3.2s', drift: '50px', r0: '230deg' },
  { left: '70%', size: 13, d: '10s', dl: '3.5s', sway: '2.7s', drift: '-40px', r0: '10deg' },
  { left: '78%', size: 19, d: '15s', dl: '1s', sway: '3.6s', drift: '55px', r0: '130deg' },
  { left: '84%', size: 16, d: '12s', dl: '2s', sway: '3.1s', drift: '-50px', r0: '210deg' },
  { left: '89%', size: 18, d: '14s', dl: '4s', sway: '3.7s', drift: '45px', r0: '60deg' },
  { left: '93%', size: 14, d: '10s', dl: '5.5s', sway: '2.4s', drift: '-35px', r0: '280deg' },
  { left: '97%', size: 17, d: '13s', dl: '1.5s', sway: '3.9s', drift: '55px', r0: '160deg' },
  { left: '10%', size: 10, d: '16s', dl: '2s', sway: '4.2s', drift: '30px', r0: '50deg', far: true },
  { left: '24%', size: 9, d: '18s', dl: '6s', sway: '4.5s', drift: '-30px', r0: '190deg', far: true },
  { left: '38%', size: 11, d: '15s', dl: '0s', sway: '4.0s', drift: '35px', r0: '120deg', far: true },
  { left: '58%', size: 10, d: '17s', dl: '3s', sway: '4.3s', drift: '-35px', r0: '240deg', far: true },
  { left: '74%', size: 9, d: '16s', dl: '5s', sway: '4.1s', drift: '30px', r0: '80deg', far: true },
  { left: '88%', size: 11, d: '18s', dl: '1s', sway: '4.4s', drift: '-30px', r0: '310deg', far: true },
];

export default function CherryPetals() {
  return (
    <div className="theme-petals" aria-hidden>
      {PETALS.map((p, i) => (
        <i
          key={i}
          className={`theme-petal${p.far ? ' far' : ''}`}
          style={
            {
              left: p.left,
              width: p.size,
              height: p.size,
              '--petal-d': p.d,
              '--petal-dl': p.dl,
              '--petal-sway': p.sway,
              '--petal-drift': p.drift,
              '--petal-r0': p.r0,
              ...(p.far ? { '--petal-peak': '0.55' } : {}),
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
