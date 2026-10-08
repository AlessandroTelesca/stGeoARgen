import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface GeorgiProps {
  message: string;
  show: boolean;
  onClose?: () => void;
  position?: 'bottom-right' | 'top-left' | 'center';
  autoHide?: boolean;
}

export function Georgi({ message, show, onClose, position = 'bottom-right', autoHide = false }: GeorgiProps) {
  const [dismissed, setDismissed] = useState(false);
  const { t } = useLanguage();

  const handleClose = () => {
    setDismissed(true);
    onClose?.();
  };

  const positionClasses = {
    'bottom-right': 'bottom-24 right-4',
    'top-left': 'top-4 left-4',
    'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  };

  return (
    <AnimatePresence>
      {show && !dismissed && (
        <motion.div
          className={`fixed ${positionClasses[position]} z-40 max-w-[min(24rem,calc(100vw-2rem))]`}
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        >
          <div className="bg-card rounded-[22px] shadow-lg border border-border p-4 pr-10 relative">
            {onClose && (
              <button
                onClick={handleClose}
                aria-label={t('close')}
                className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <div className="flex items-start gap-3">
              <motion.div
                className="flex-shrink-0"
                initial={{ rotate: -12 }}
                animate={{ rotate: [-12, 8, -4, 0] }}
                transition={{ duration: 0.9, delay: 0.15, ease: 'easeOut' }}
              >
                <div className="brand-gradient w-12 h-12 rounded-full flex items-center justify-center shadow-primary">
                  <img src="/Logo.svg" alt="Georgi" style={{ width: '28px', height: '28px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
                </div>
              </motion.div>

              <div className="flex-1 pt-1">
                <p className="font-bold text-sm text-primary mb-0.5">{t('georgiBubbleTitle')}</p>
                <p className="text-sm text-gray-700 leading-snug">{message}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface GeorgiAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export function GeorgiAvatar({ size = 'md', animated = true }: GeorgiAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-base',
    md: 'w-12 h-12 text-2xl',
    lg: 'w-16 h-16 text-3xl',
  };

  return (
    <motion.div
      className={`${sizeClasses[size]} brand-gradient rounded-full flex items-center justify-center shadow-md`}
      animate={animated ? {
        rotate: [0, 5, -5, 0],
      } : {}}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <img src="/Logo.svg" alt="Georgi" style={{ width: size === 'sm' ? '20px' : size === 'md' ? '28px' : '38px', height: size === 'sm' ? '20px' : size === 'md' ? '28px' : '38px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
    </motion.div>
  );
}
