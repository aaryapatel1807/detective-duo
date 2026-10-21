import type { Metadata } from 'next';
import { Courier_Prime, Cinzel, Inter, JetBrains_Mono, Caveat, Nunito, Baloo_2 } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '../components/theme';
import { Sidebar } from '../components/Sidebar';
import { BottomNav } from '../components/BottomNav';
import { AudioUnlocker } from '../components/AudioUnlocker';

const courierPrime = Courier_Prime({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-type',
  fallback: ['Courier New', 'monospace'],
});

// Hub redesign fonts: display / body / mono / handwritten, exposed as CSS vars.
const hubDisplay = Cinzel({
  weight: ['600', '700'],
  subsets: ['latin'],
  variable: '--hub-display',
  fallback: ['Georgia', 'serif'],
  display: 'swap',
});

const hubBody = Inter({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--hub-body',
  fallback: ['system-ui', 'sans-serif'],
  display: 'swap',
});

const hubMono = JetBrains_Mono({
  weight: ['400', '600'],
  subsets: ['latin'],
  variable: '--hub-mono',
  fallback: ['ui-monospace', 'monospace'],
  display: 'swap',
});

const hubHand = Caveat({
  weight: ['500', '600'],
  subsets: ['latin'],
  variable: '--hub-hand',
  fallback: ['cursive'],
  display: 'swap',
});

// Duo Candy theme display font: Baloo 2 — chunky rounded display type,
// used only under [data-theme='duo-candy'] (body stays Nunito there).
const candyFont = Baloo_2({
  weight: ['600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-candy',
  fallback: ['system-ui', 'sans-serif'],
  display: 'swap',
});

// Rounded friendly sans (Nunito): Duo Candy's body font — candy display
// type is Baloo 2 (--font-candy); its body text uses this via --font-duo.
const duoFont = Nunito({
  weight: ['400', '600', '700', '800', '900'],
  subsets: ['latin'],
  variable: '--font-duo',
  fallback: ['system-ui', 'sans-serif'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Detective Duo — Case Hub',
  description: 'A two-player noir-detective games hub.',
};

// Runs before paint: applies the saved theme, no flash.
const themeInit = `
(function(){try{var t=localStorage.getItem('dd-theme');document.documentElement.dataset.theme=(t==='light'||t==='dark'||t==='duo-candy')?t:'dark';}catch(e){document.documentElement.dataset.theme='dark';}})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body
        className={`${courierPrime.variable} ${hubDisplay.variable} ${hubBody.variable} ${hubMono.variable} ${hubHand.variable} ${duoFont.variable} ${candyFont.variable} min-h-screen`}
      >
        <ThemeProvider>
          <AudioUnlocker />
          <Sidebar />
          <BottomNav />
          <main className="hub-main">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
