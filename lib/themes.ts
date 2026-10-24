/**
 * Theme system.
 *
 * A theme is ONE config object in this file: a set of design tokens.
 * Components only ever read CSS variables (var(--ink), var(--surface), …),
 * never theme names or raw colours. Adding a theme = adding one entry to
 * THEMES below plus its display font in app/layout.tsx. Nothing else.
 *
 * The [data-theme] CSS is generated from these objects by
 * components/ThemeStyle.tsx, so this file is the single source of truth
 * (the contrast test reads the same values).
 */

export type ThemeId = 'noir' | 'candy' | 'midnight' | 'sunny';

export interface ThemeConfig {
  id: ThemeId;
  label: string;
  blurb: string;
  tokens: Record<string, string>;
}

export const THEME_IDS: ThemeId[] = ['noir', 'candy', 'midnight', 'sunny'];

export const THEMES: Record<ThemeId, ThemeConfig> = {
  noir: {
    id: 'noir',
    label: 'Noir',
    blurb: 'Rainy window, desk lamp, amber on warm dark.',
    tokens: {
      '--bg': '#171009',
      '--bg-2': '#241a10',
      '--surface': '#2b2013',
      '--surface-2': '#3a2b17',
      '--ink': '#f4e9d4',
      '--ink-dim': '#d3b98d',
      '--accent': '#e8a33d',
      '--accent-ink': '#2a1802',
      '--accent-2': '#7fb5a8',
      '--accent-2-ink': '#0e211c',
      '--line': '#5a4630',
      '--paper': '#f1e3c0',
      '--paper-ink': '#33240d',
      '--good': '#b7d96a',
      '--bad': '#f0937f',
      '--cell': '#241a0e',
      '--cell-line': '#5a4630',
      '--radius': '14px',
      '--radius-lg': '22px',
      '--shadow': '0 10px 30px rgba(0,0,0,0.45)',
      '--btn-shadow': '0 3px 0 rgba(0,0,0,0.4)',
      '--motion': '0.15s ease',
      '--glow': '0 0 18px rgba(232,163,61,0.25)',
      '--card-border': '1px solid var(--line)',
      '--font-display': 'var(--font-fraunces), Georgia, serif',
      '--font-body': 'var(--font-nunito-sans), system-ui, sans-serif',
      '--texture':
        'radial-gradient(ellipse at 20% -10%, rgba(232,163,61,0.14), transparent 55%), radial-gradient(ellipse at 90% 0%, rgba(127,181,168,0.08), transparent 50%)',
    },
  },
  candy: {
    id: 'candy',
    label: 'Candy',
    blurb: 'Bright and sweet. Pastels on soft cream, everything round.',
    tokens: {
      '--bg': '#fff6e9',
      '--bg-2': '#ffe9f2',
      '--surface': '#ffffff',
      '--surface-2': '#ffdfec',
      '--ink': '#402e42',
      '--ink-dim': '#715a75',
      '--accent': '#d6336c',
      '--accent-ink': '#ffffff',
      '--accent-2': '#0b7285',
      '--accent-2-ink': '#ffffff',
      '--line': '#d9b8c9',
      '--paper': '#fffdf4',
      '--paper-ink': '#4a3040',
      '--good': '#2b8a3e',
      '--bad': '#d6336c',
      '--cell': '#fffdf8',
      '--cell-line': '#e3c6d4',
      '--radius': '20px',
      '--radius-lg': '30px',
      '--shadow': '0 10px 24px rgba(214,51,108,0.16)',
      '--btn-shadow': '0 4px 0 rgba(64,46,66,0.25)',
      '--motion': '0.35s cubic-bezier(0.34,1.56,0.64,1)',
      '--glow': '0 0 20px rgba(255,179,199,0.55)',
      '--card-border': '1px solid var(--line)',
      '--font-display': 'var(--font-baloo), var(--font-nunito), system-ui, sans-serif',
      '--font-body': 'var(--font-nunito), system-ui, sans-serif',
      '--texture':
        'radial-gradient(circle at 12% 8%, rgba(255,179,199,0.35), transparent 40%), radial-gradient(circle at 88% 4%, rgba(178,242,219,0.4), transparent 42%), radial-gradient(circle at 50% 100%, rgba(255,236,170,0.35), transparent 55%)',
    },
  },
  midnight: {
    id: 'midnight',
    label: 'Midnight Cozy',
    blurb: 'Deep blue night, fairy lights, a warm lantern in the window.',
    tokens: {
      '--bg': '#0e1830',
      '--bg-2': '#16233f',
      '--surface': '#1c2c4d',
      '--surface-2': '#24365e',
      '--ink': '#f3ead6',
      '--ink-dim': '#c9bdd6',
      '--accent': '#b9a5e8',
      '--accent-ink': '#1d1433',
      '--accent-2': '#f2c14e',
      '--accent-2-ink': '#2a1c02',
      '--line': '#3d4f74',
      '--paper': '#fdf3d7',
      '--paper-ink': '#2b2118',
      '--good': '#a8d98a',
      '--bad': '#f2a08a',
      '--cell': '#14213c',
      '--cell-line': '#3d4f74',
      '--radius': '18px',
      '--radius-lg': '26px',
      '--shadow': '0 14px 34px rgba(0,0,0,0.55)',
      '--btn-shadow': '0 3px 0 rgba(0,0,0,0.45)',
      '--motion': '0.6s ease',
      '--glow': '0 0 24px rgba(185,165,232,0.45)',
      '--card-border': '1px solid var(--line)',
      '--font-display': 'var(--font-fraunces), Georgia, serif',
      '--font-body': 'var(--font-nunito-sans), system-ui, sans-serif',
      '--texture':
        'radial-gradient(circle at 15% 10%, rgba(185,165,232,0.16), transparent 45%), radial-gradient(circle at 85% 15%, rgba(242,193,78,0.10), transparent 40%), radial-gradient(ellipse at 50% 110%, rgba(36,54,94,0.9), transparent 60%)',
    },
  },
  sunny: {
    id: 'sunny',
    label: 'Sunny Pastel',
    blurb: 'Paper and crayons. Peach, sky blue and butter yellow, lightly sketched.',
    tokens: {
      '--bg': '#fff8e7',
      '--bg-2': '#ffeed3',
      '--surface': '#ffffff',
      '--surface-2': '#fff3c4',
      '--ink': '#33291f',
      '--ink-dim': '#6d5b4c',
      '--accent': '#d95f3b',
      '--accent-ink': '#2b1206',
      '--accent-2': '#1577a8',
      '--accent-2-ink': '#ffffff',
      '--line': '#e0c9a8',
      '--paper': '#fffdf4',
      '--paper-ink': '#3a2a1a',
      '--good': '#2b7a3d',
      '--bad': '#bf3b2a',
      '--cell': '#fffdf4',
      '--cell-line': '#e0c9a8',
      '--radius': '16px',
      '--radius-lg': '24px',
      '--shadow': '0 8px 20px rgba(217,95,59,0.14)',
      '--btn-shadow': '0 3px 0 rgba(51,41,31,0.18)',
      '--motion': '0.25s cubic-bezier(0.34,1.3,0.64,1)',
      '--glow': '0 6px 18px rgba(217,95,59,0.18)',
      '--card-border': '2px dashed var(--line)',
      '--font-display': 'var(--font-baloo), var(--font-nunito), system-ui, sans-serif',
      '--font-body': 'var(--font-nunito), system-ui, sans-serif',
      '--texture':
        'radial-gradient(circle at 10% 5%, rgba(255,214,140,0.5), transparent 40%), radial-gradient(circle at 90% 10%, rgba(168,216,234,0.5), transparent 42%), radial-gradient(circle at 50% 100%, rgba(255,183,178,0.35), transparent 55%)',
    },
  },
};

export function isThemeId(v: unknown): v is ThemeId {
  return v === 'noir' || v === 'candy' || v === 'midnight' || v === 'sunny';
}

/**
 * The pre-paint script in app/layout.tsx mirrors this exactly: an
 * unknown or missing saved value falls back to noir, so the first paint
 * never flashes the wrong theme.
 */
export function resolveThemeId(v: unknown): ThemeId {
  return isThemeId(v) ? v : 'noir';
}

/** WCAG relative luminance. */
export function luminance(hex: string): number {
  const m = hex.replace('#', '');
  const rgb = [0, 2, 4].map((i) => parseInt(m.slice(i, i + 2), 16) / 255);
  const lin = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/** WCAG contrast ratio between two hex colours. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Token pairs that must stay readable in every theme.
 * min 4.5 = WCAG AA for normal text; 3.0 for large/incidental marks.
 */
export const CONTRAST_PAIRS: { fg: string; bg: string; min: number; why: string }[] = [
  { fg: '--ink', bg: '--bg', min: 4.5, why: 'body text on page' },
  { fg: '--ink', bg: '--bg-2', min: 4.5, why: 'body text on raised backdrop' },
  { fg: '--ink', bg: '--surface', min: 4.5, why: 'body text on cards' },
  { fg: '--ink', bg: '--surface-2', min: 4.5, why: 'body text on inner panels' },
  { fg: '--ink-dim', bg: '--bg', min: 4.5, why: 'secondary text on page' },
  { fg: '--ink-dim', bg: '--surface', min: 4.5, why: 'secondary text on cards' },
  { fg: '--accent-ink', bg: '--accent', min: 4.5, why: 'primary button label' },
  { fg: '--accent-2-ink', bg: '--accent-2', min: 4.5, why: 'secondary button label' },
  { fg: '--paper-ink', bg: '--paper', min: 4.5, why: 'case/paper text' },
  { fg: '--ink', bg: '--cell', min: 4.5, why: 'puzzle cell symbols' },
  { fg: '--good', bg: '--cell', min: 3, why: 'yes mark on a cell' },
  { fg: '--bad', bg: '--cell', min: 3, why: 'no mark on a cell' },
];
