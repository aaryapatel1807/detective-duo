/**
 * Offline status: a tiny hook + the banner Shell shows on every route.
 * `navigator.onLine` is the signal; the banner is plain text, never a
 * modal, and never blocks play — solo games already run from
 * localStorage, so offline only changes syncing, not playing.
 */
import { useEffect, useState } from 'react';

export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => {
      try {
        setOnline(navigator.onLine);
      } catch {
        setOnline(true);
      }
    };
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className="offline-banner">
      You are offline. Your progress is saved on this device and will sync when
      you are back online.
    </div>
  );
}
