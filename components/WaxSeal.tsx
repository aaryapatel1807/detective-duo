'use client';

import { motion } from 'framer-motion';
import { cn } from '../lib/cn';

/** Red wax seal (love notes, case-closed stamps). */
export function WaxSeal({
  size = 64,
  className,
  children,
}: {
  size?: number;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -20 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 16 }}
      className={cn('wax-seal', className)}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      {children ?? '★'}
    </motion.div>
  );
}
