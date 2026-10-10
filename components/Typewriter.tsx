'use client';

import { useEffect, useState } from 'react';
import { cn } from '../lib/cn';

/**
 * Typewriter heading. Renders text in the typewriter serif; with
 * `animate` it types character-by-character like a typewriter.
 */
export function Typewriter({
  text,
  as: Tag = 'h2',
  className,
  animate = false,
  speed = 34,
}: {
  text: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div';
  className?: string;
  animate?: boolean;
  speed?: number;
}) {
  const [shown, setShown] = useState(animate ? '' : text);

  useEffect(() => {
    if (!animate) {
      setShown(text);
      return;
    }
    setShown('');
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, animate, speed]);

  return (
    <Tag className={cn('type-heading', className)}>
      {shown}
      {animate && shown.length < text.length && <span className="animate-pulse">▌</span>}
    </Tag>
  );
}
