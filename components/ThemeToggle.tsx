'use client';

import { useTheme } from './theme';

/** Dark/light theme toggle for the sidebar. */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="noir-btn-ghost flex w-full items-center justify-between !py-2.5 text-left"
      aria-pressed={theme === 'light'}
      title="Toggle case-file paper (light) theme"
    >
      <span>{theme === 'dark' ? '🌙 Night Desk' : '📄 Case File'}</span>
      <span className="text-[0.7rem]">{theme === 'dark' ? 'DARK' : 'LIGHT'}</span>
    </button>
  );
}
