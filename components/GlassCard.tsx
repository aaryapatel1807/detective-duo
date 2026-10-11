'use client';

import { ReactNode } from 'react';
import { cn } from '../lib/cn';
import './hub-noir.css';

/** Frosted-glass noir card. */
export function GlassCard({
  children,
  className,
  strong,
}: {
  children: ReactNode;
  className?: string;
  strong?: boolean;
}) {
  return (
    <div className={cn(strong ? 'hub-glass-strong' : 'hub-glass', className)}>
      {children}
    </div>
  );
}
