import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from './utils';

const variants = {
  initial: { opacity: 0, scale: 0.6, filter: 'blur(2px)' },
  animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, scale: 0.6, filter: 'blur(2px)' },
};

/** Tauscht ein Icon mit kurzem Blur-/Scale-Crossfade, sobald sich `swapKey` ändert. */
export function IconSwap({ swapKey, children, className }: { swapKey: string; children: ReactNode; className?: string }) {
  return (
    <span className={cn('relative inline-flex size-5 items-center justify-center', className)} aria-hidden="true">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={swapKey}
          className="absolute inset-0 flex items-center justify-center"
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ type: 'spring', duration: 0.3, bounce: 0.3 }}
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
