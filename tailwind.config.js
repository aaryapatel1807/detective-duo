/** Tailwind v3 config for Detective Duo v2.
 *  All colours/fonts come from theme tokens (CSS variables), so this
 *  config only declares content paths. */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
