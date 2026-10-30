import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Plus, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { MODULE_CATEGORIES, MODULE_META, MODULE_ORDER, type DraftModule } from '../../stationModules/meta';
import type { ModuleType } from '../../stationModules/types';
import { ModuleIllustration } from './ModuleIllustration';
import { ease } from './adminUi';

interface ModuleLibraryProps {
  open: boolean;
  /** Typen, die schon vorkommen und nur einmal erlaubt sind */
  disabledTypes: ModuleType[];
  onClose: () => void;
  onAdd: (module: DraftModule) => void;
}

/**
 * Modulbibliothek: alle Modultypen nach Gruppen, jeweils mit Skizze. Typen mit mehreren
 * Varianten zeigen ihre Varianten als eigene Karten, damit man direkt das Passende wählt.
 */
export function ModuleLibrary({ open, disabledTypes, onClose, onAdd }: ModuleLibraryProps) {
  const { t } = useLanguage();
  const [category, setCategory] = useState(MODULE_CATEGORIES[0].id);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Fokus in den Dialog und beim Schließen zurück zum auslösenden Knopf
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => closeRef.current?.focus(), 50);
    return () => {
      window.clearTimeout(timer);
      previous?.focus?.();
    };
  }, [open]);

  /** Escape schließt, Tab bleibt im Dialog */
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input, select, textarea')];
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const types = MODULE_ORDER.filter((type) => MODULE_META[type].category === category);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button type="button" aria-label={t('close')} className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            ref={dialogRef}
            onKeyDown={handleKeyDown}
            role="dialog"
            aria-modal="true"
            aria-labelledby="module-library-title"
            className="relative w-full sm:max-w-3xl max-h-[92dvh] flex flex-col rounded-t-[32px] sm:rounded-[28px] bg-card shadow-2xl"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 32 }}
            transition={{ duration: 0.35, ease }}
          >
            <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 pb-4">
              <div>
                <h2 id="module-library-title" className="text-xl font-bold">{t('adminModuleLibraryTitle')}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t('adminModuleLibraryIntro')}</p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label={t('close')}
                className="w-11 h-11 -mr-2 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 sm:px-6">
              <div className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1" role="group" aria-label={t('adminModuleCategories')}>
                {MODULE_CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={category === c.id}
                    onClick={() => setCategory(c.id)}
                    className={`h-11 rounded-xl text-sm font-bold transition-colors ${category === c.id ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {t(c.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-6 pt-5 space-y-6" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom, 0px))' }}>
              {types.map((type) => {
                const meta = MODULE_META[type];
                const Icon = meta.icon;
                const disabled = disabledTypes.includes(type);
                return (
                  <section key={type} aria-labelledby={`lib-${type}`}>
                    <div className="flex items-start gap-3 mb-3">
                      <span className="w-10 h-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5" />
                      </span>
                      <div className="min-w-0">
                        <h3 id={`lib-${type}`} className="font-bold">{t(meta.labelKey)}</h3>
                        <p className="text-sm text-muted-foreground leading-snug">
                          {disabled ? t('adminModuleOnlyOnce') : t(meta.descriptionKey)}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {meta.presets.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => onAdd(preset.create() as DraftModule)}
                          className="group text-left rounded-2xl border border-border bg-card p-2 hover:border-primary hover:shadow-md transition-[border-color,box-shadow] pressable disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:shadow-none focus-visible:ring-4 focus-visible:ring-primary/15"
                        >
                          <ModuleIllustration type={type} variant={preset.id} className="h-[88px]" />
                          <span className="mt-2 px-1 flex items-center justify-between gap-2">
                            <span className="text-sm font-bold leading-tight">
                              {meta.presets.length > 1 ? t(preset.labelKey) : t(meta.labelKey)}
                            </span>
                            <Plus className="w-4 h-4 flex-shrink-0 text-primary opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity" />
                          </span>
                          {meta.presets.length > 1 && (
                            <span className="block px-1 pb-0.5 mt-0.5 text-xs text-muted-foreground leading-snug">{t(preset.descriptionKey)}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
