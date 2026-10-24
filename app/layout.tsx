import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { Fraunces, Nunito_Sans, Nunito, Baloo_2, Caveat, Sacramento } from 'next/font/google';
import './globals.css';
import { ThemeProvider, ThemeStyle } from '@/components/ThemeProvider';
import Shell from '@/components/Shell';

const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', display: 'swap' });
const nunitoSans = Nunito_Sans({ subsets: ['latin'], variable: '--font-nunito-sans', display: 'swap' });
const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito', display: 'swap' });
const baloo = Baloo_2({ subsets: ['latin'], variable: '--font-baloo', display: 'swap' });
const caveat = Caveat({ subsets: ['latin'], variable: '--font-caveat', display: 'swap' });
const sacramento = Sacramento({ subsets: ['latin'], weight: '400', variable: '--font-sacramento', display: 'swap' });

export const metadata: Metadata = {
  title: 'Detective Duo',
  description: 'Cozy puzzles and short mysteries, one level at a time.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

// Set the saved theme before first paint so there is no flash of the
// default for users of another theme.
const themeInit = `(function(){try{var t=localStorage.getItem('dd-v2-theme');if(t!=='noir'&&t!=='candy'&&t!=='midnight')t='candy';document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='candy';}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  const fontVars = [fraunces, nunitoSans, nunito, baloo, caveat, sacramento]
    .map((f) => f.variable)
    .join(' ');
  return (
    <html lang="en" data-theme="candy" className={fontVars} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <ThemeStyle />
      </head>
      <body>
        <ThemeProvider>
          <Shell />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
