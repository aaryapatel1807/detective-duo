/** Hand-written Tailwind v3 config for Detective Duo.
 *  Theme tokens are CSS variables (see app/globals.css) so dark/light
 *  themes switch via [data-theme] without rebuilding. */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './games/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Typewriter serif for headings
        type: ['var(--font-type)', 'Courier New', 'monospace'],
        // Clean sans for body
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      colors: {
        glass: 'var(--glass-bg)',
        'glass-border': 'var(--glass-border)',
        ink: 'var(--ink)',
        'ink-dim': 'var(--ink-dim)',
        amber: {
          glow: 'var(--amber-glow)',
          deep: 'var(--amber-deep)',
        },
        blood: 'var(--blood)',
        brass: 'var(--brass)',
        manila: 'var(--manila)',
        cork: 'var(--cork)',
      },
      borderRadius: {
        glass: '26px',
      },
    },
  },
  plugins: [],
};
