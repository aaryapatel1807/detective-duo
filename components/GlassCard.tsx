'use client';

import { ReactNode } from 'react';
import { cn } from '../lib/cn';

/** Frosted-glass card (NutriAI "Glass Office" style). */
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
    <div className={cn(strong ? 'glass-card-strong' : 'glass-card', className)}>
      {children}
    </div>
  );
}
