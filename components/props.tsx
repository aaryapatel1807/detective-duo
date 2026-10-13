'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import styles from './hub-chrome.module.css';

/**
 * Noir dossier (restyled manila folder). Props unchanged:
 * children / className / onClick. Game shells keep importing this.
 */
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
      className={
        className
          ? `${styles.dossier} p-4 pt-5 ${onClick ? 'cursor-pointer' : ''} ${className}`
          : `${styles.dossier} p-4 pt-5 ${onClick ? 'cursor-pointer' : ''}`
      }
    >
      {children}
    </motion.div>
  );
}

/**
 * Noir evidence photo (restyled polaroid). Props unchanged:
 * children / caption / className / onClick.
 */
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
      className={
        className
          ? `${styles.photo} ${onClick ? 'cursor-pointer' : ''} ${className}`
          : `${styles.photo} ${onClick ? 'cursor-pointer' : ''}`
      }
    >
      {children}
      {caption && <div className={styles.photoCaption}>{caption}</div>}
    </motion.div>
  );
}
