'use client';

import { ReactNode } from 'react';
import styles from './hub-chrome.module.css';

/**
 * Noir evidence-wall surface. Children are absolutely-positioned
 * pins/dossiers/photos. Props unchanged from the corkboard era.
 */
export function Corkboard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className ? `${styles.board} ${className}` : styles.board}>
      {children}
    </div>
  );
}
