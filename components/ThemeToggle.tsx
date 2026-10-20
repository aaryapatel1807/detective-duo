'use client';

import { useTheme, type Theme } from './theme';

const LABELS: Record<Theme, { name: string; tag: string }> = {
  dark: { name: '🌙 Night Desk', tag: 'DARK' },
  light: { name: '📄 Case File', tag: 'LIGHT' },
  'duo-blue': { name: '💙 Duo Blue', tag: 'BLUE' },
};

/** Theme toggle for the sidebar — cycles noir → case-file paper → Duo Blue. */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const label = LABELS[theme];
  return (
    <button
      onClick={toggle}
      className="noir-btn-ghost flex w-full items-center justify-between !py-2.5 text-left"
      aria-label={`Theme: ${label.name}. Activate to switch theme.`}
      title="Switch theme (Night Desk → Case File → Duo Blue)"
    >
      <span>{label.name}</span>
      <span className="text-[0.7rem]">{label.tag}</span>
    </button>
  );
}
