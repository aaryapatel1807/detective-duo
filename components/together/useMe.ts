'use client';

/**
 * The current together player: a per-tab local id (there are no
 * accounts). Display name comes from localStorage (set on the
 * together landing).
 */
import { useEffect, useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { getDisplayName } from '@/lib/together/session';
import type { Me } from './useRoom';

function localTabUid(): string {
  try {
    let tab = sessionStorage.getItem('dd-v2-tab-uid');
    if (!tab) {
      tab = `local-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem('dd-v2-tab-uid', tab);
    }
    return tab;
  } catch {
    return `local-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function useMe(): Me | null {
  const { userId } = useTheme();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    setMe({ uid: userId ?? localTabUid(), name: getDisplayName() });
  }, [userId]);

  return me;
}
