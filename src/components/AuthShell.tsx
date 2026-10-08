import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { BackLink } from './PageHeader';

interface AuthShellProps {
  title: string;
  subtitle?: ReactNode;
  onBack?: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/** Gemeinsames Layout für Login, Registrierung und Passwort-Reset. */
export function AuthShell({ title, subtitle, onBack, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Marken-Bühne */}
      <div
        className="brand-gradient relative overflow-hidden text-white"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="topo-texture absolute inset-0" aria-hidden="true" />
        <div className="relative max-w-md mx-auto px-5 pt-4 pb-14">
          {onBack && <BackLink onBack={onBack} tone="onDark" />}
          <motion.div
            className="mt-6 flex items-center gap-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg flex-shrink-0">
              <img src="/Logo.svg" alt="St.GeoARgen" className="w-10 h-10 object-contain" />
            </span>
            <div className="min-w-0">
              <h1 className="text-[28px] leading-[1.1] font-extrabold tracking-tight">{title}</h1>
              {subtitle && <p className="text-sm text-white/80 mt-1.5 leading-snug">{subtitle}</p>}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Formular-Sheet */}
      <motion.div
        className="relative -mt-7 flex-1 rounded-t-[28px] bg-background"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="max-w-md mx-auto px-5 pt-7" style={{ paddingBottom: 'max(32px, env(safe-area-inset-bottom, 0px))' }}>
          {children}
          {footer && <div className="mt-8">{footer}</div>}
        </div>
      </motion.div>
    </div>
  );
}

/** Feld-Label im Auth-Stil */
export function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-bold mb-2">
      {children}
    </label>
  );
}

/** Trennlinie mit Text (z. B. „oder“) */
export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 my-7" aria-hidden="true">
      <span className="h-px flex-1 bg-border" />
      <span className="text-xs font-semibold text-muted-foreground uppercase">{label}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
