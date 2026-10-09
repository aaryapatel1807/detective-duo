import type { Metadata } from 'next';
import { Courier_Prime } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '../components/theme';
import { Sidebar } from '../components/Sidebar';
import { AudioUnlocker } from '../components/AudioUnlocker';

const courierPrime = Courier_Prime({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-type',
  fallback: ['Courier New', 'monospace'],
});

export const metadata: Metadata = {
  title: 'Detective Duo — Case Hub',
  description: 'A two-player noir-detective games hub.',
};

// Runs before paint: applies the saved theme, no flash.
const themeInit = `
(function(){try{var t=localStorage.getItem('dd-theme');document.documentElement.dataset.theme=(t==='light'||t==='dark')?t:'dark';}catch(e){document.documentElement.dataset.theme='dark';}})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className={`${courierPrime.variable} min-h-screen`}>
        <ThemeProvider>
          <AudioUnlocker />
          <Sidebar />
          <main className="min-h-screen px-4 py-6 transition-[margin] duration-300 md:pl-[300px] md:pr-8">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
