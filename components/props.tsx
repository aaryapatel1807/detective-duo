'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/cn';

/** Manila case folder card. */
export function ManilaFolder({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn('manila-folder p-4 pt-5', onClick && 'cursor-pointer', className)}
    >
      {children}
    </motion.div>
  );
}

/** Polaroid photo card. */
export function Polaroid({
  children,
  caption,
  className,
  onClick,
}: {
  children?: ReactNode;
  caption?: string;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <motion.div
      whileHover={{ y: -4, rotate: 0.8 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn('polaroid', onClick && 'cursor-pointer', className)}
    >
      {children}
      {caption && <div className="caption">{caption}</div>}
    </motion.div>
  );
}
