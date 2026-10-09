'use client';

import { motion } from 'framer-motion';
import { cn } from '../lib/cn';

/** Brass push-pin. Position it absolutely via className (top-/left-). */
export function Pin({ className }: { className?: string }) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -30 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 18 }}
      className={cn('brass-pin', className)}
      aria-hidden
    />
  );
}
