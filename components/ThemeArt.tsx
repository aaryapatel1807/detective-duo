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
 *  blue     — gold coins and stars on blue
 *  violet   — fireflies and sparkles on violet night
 */
export default function HomeArt() {
  const { theme } = useTheme();
  const common = {
    width: 120,
    height: 64,
    viewBox: '0 0 120 64',
    'aria-hidden': true as const,
  };
  if (theme === 'violet') {
    return (
      <svg {...common}>
        <circle cx={28} cy={30} r={4} fill="var(--accent)" />
        <circle cx={28} cy={30} r={8} fill="var(--accent)" opacity={0.25} />
        <circle cx={58} cy={20} r={3} fill="var(--accent-2)" />
        <circle cx={58} cy={20} r={7} fill="var(--accent-2)" opacity={0.25} />
        <circle cx={88} cy={34} r={3.5} fill="var(--accent)" />
        <circle cx={88} cy={34} r={8} fill="var(--accent)" opacity={0.2} />
        <path d="M104 12 l1.8 4.5 4.5 0.4 -3.4 3 1.1 4.5 -4 -2.6 -4 2.6 1.1 -4.5 -3.4 -3 4.5 -0.4 Z" fill="var(--accent-2)" />
        <circle cx={16} cy={52} r={2.5} fill="var(--accent-2)" />
        <circle cx={104} cy={54} r={2} fill="var(--accent)" />
      </svg>
    );
  }
  if (theme === 'blue') {
    return (
      <svg {...common}>
        <circle cx={30} cy={26} r={15} fill="var(--accent)" />
        <circle cx={30} cy={26} r={15} fill="none" stroke="var(--accent-2)" strokeWidth="1.5" />
        <circle cx={62} cy={18} r={7} fill="var(--accent)" />
        <path d="M88 14 l2.5 6 6 0.5 -4.5 4 1.5 6 -5.5 -3.5 -5.5 3.5 1.5 -6 -4.5 -4 6 -0.5 Z" fill="var(--accent)" />
        <circle cx={104} cy={44} r={3} fill="var(--accent-2)" />
        <circle cx={14} cy={50} r={3} fill="var(--accent-2)" />
        <circle cx={58} cy={48} r={2.5} fill="var(--accent)" />
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
