'use client';

import { ReactNode } from 'react';
import { cn } from '../lib/cn';

/** Corkboard surface. Children are absolutely-positioned pins/folders/photos. */
export function Corkboard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('corkboard', className)}>{children}</div>;
}
