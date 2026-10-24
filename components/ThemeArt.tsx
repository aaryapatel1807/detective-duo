'use client';

import { useTheme } from './ThemeProvider';

/**
 * Home hero art, drawn per theme. Every shape is one small SVG whose
 * fills/strokes are theme tokens only (var(--accent), var(--accent-2),
 * var(--ink-dim)) — so the art itself changes with the theme, not just
 * the colours around it. No images, no emoji.
 *
 *  noir     — a desk lamp over a rainy window
 *  candy    — balloons and dots
 *  midnight — a crescent moon under a string of fairy lights
 *  sunny    — a crayon sun, a cloud, a hand-drawn squiggle
 */
export default function HomeArt() {
  const { theme } = useTheme();
  const common = {
    width: 120,
    height: 64,
    viewBox: '0 0 120 64',
    'aria-hidden': true as const,
  };
  if (theme === 'midnight') {
    return (
      <svg {...common}>
        <path d="M8 10 Q 60 26 112 10" fill="none" stroke="var(--line)" strokeWidth="1.5" />
        {[20, 45, 70, 95].map((x, i) => (
          <g key={x}>
            <line x1={x} y1={10 + Math.sin(i) * 2} x2={x} y2={18} stroke="var(--line)" strokeWidth="1" />
            <circle cx={x} cy={22} r={3.5} fill="var(--accent-2)" />
          </g>
        ))}
        <path d="M88 26 a14 14 0 1 0 10 24 a11 11 0 1 1 -10 -24" fill="var(--accent-2)" />
        <circle cx={28} cy={44} r={2} fill="var(--ink-dim)" />
        <circle cx={44} cy={52} r={1.6} fill="var(--ink-dim)" />
        <circle cx={58} cy={42} r={2} fill="var(--ink-dim)" />
      </svg>
    );
  }
  if (theme === 'sunny') {
    return (
      <svg {...common}>
        <circle cx={88} cy={22} r={12} fill="var(--accent)" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          return (
            <line
              key={deg}
              x1={88 + Math.cos(rad) * 17}
              y1={22 + Math.sin(rad) * 17}
              x2={88 + Math.cos(rad) * 23}
              y2={22 + Math.sin(rad) * 23}
              stroke="var(--accent)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          );
        })}
        <path d="M8 48 q 8 -10 18 0 t 18 0 t 18 0" fill="none" stroke="var(--accent-2)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M14 56 q 12 -8 24 0" fill="none" stroke="var(--ink-dim)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (theme === 'candy') {
    return (
      <svg {...common}>
        <circle cx={30} cy={24} r={14} fill="var(--accent)" />
        <circle cx={58} cy={18} r={11} fill="var(--accent-2)" />
        <circle cx={84} cy={28} r={13} fill="var(--ink-dim)" />
        <path d="M30 38 L 24 56 M58 29 L 56 56 M84 41 L 88 56" stroke="var(--line)" strokeWidth="1.5" fill="none" />
        <circle cx={104} cy={14} r={3} fill="var(--accent)" />
        <circle cx={12} cy={50} r={3} fill="var(--accent-2)" />
        <circle cx={104} cy={50} r={2.5} fill="var(--accent-2)" />
      </svg>
    );
  }
  // noir: desk lamp over a window
  return (
    <svg {...common}>
      <rect x={8} y={8} width={44} height={40} fill="none" stroke="var(--line)" strokeWidth="2" />
      <line x1={30} y1={8} x2={30} y2={48} stroke="var(--line)" strokeWidth="1.5" />
      <line x1={8} y1={28} x2={52} y2={28} stroke="var(--line)" strokeWidth="1.5" />
      <path d="M72 8 L 96 8 L 104 26 L 64 26 Z" fill="var(--accent)" />
      <line x1={84} y1={8} x2={84} y2={2} stroke="var(--ink-dim)" strokeWidth="2" />
      <path d="M70 30 q 14 10 28 0" fill="none" stroke="var(--accent-2)" strokeWidth="2" />
      <circle cx={108} cy={48} r={3} fill="var(--accent-2)" />
    </svg>
  );
}
