import { Fragment, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronRight, EyeOff, Trash2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { MODULE_META } from '../../stationModules/meta';
import type { ModuleType } from '../../stationModules/types';

/** Gemeinsame Bausteine der Stationsverwaltung (Navigation, Status, Dialoge). */

export const ease = [0.16, 1, 0.3, 1] as const;

export interface Crumb {
  label: string;
  /** Ziel beim Antippen; fehlt beim aktuellen (letzten) Eintrag */
  onClick?: () => void;
  icon?: ReactNode;
}

/**
 * Brotkrumen-Navigation. Auf schmalen Bildschirmen werden mittlere Einträge gekürzt,
 * der aktuelle Eintrag bleibt immer lesbar.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const { t } = useLanguage();
  return (
    <nav aria-label={t('adminBreadcrumbLabel')} className="min-w-0">
      <ol className="flex items-center gap-0.5 min-w-0 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isFirst = index === 0;
          return (
            <Fragment key={index}>
              {index > 0 && <ChevronRight className="w-4 h-4 flex-shrink-0 text-muted-foreground/60" aria-hidden="true" />}
              <li className={`min-w-0 ${isLast ? 'flex-shrink' : isFirst ? 'flex-shrink-0' : 'flex-shrink max-w-[9rem] sm:max-w-[14rem]'}`}>
                {isLast || !item.onClick ? (
                  <span aria-current={isLast ? 'page' : undefined} className="flex items-center gap-1.5 h-10 px-2 font-bold text-foreground min-w-0">
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={item.onClick}
                    className="flex items-center gap-1.5 h-10 px-2 rounded-full font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-w-0 max-w-full"
                  >
                    {item.icon}
                    <span className={`truncate ${isFirst && items.length > 2 ? 'sr-only sm:not-sr-only' : ''}`}>{item.label}</span>
                  </button>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

/** Entwurf-Markierung; veröffentlichte Inhalte bekommen bewusst keinen Chip (Normalfall) */
export function DraftChip({ onImage = false }: { onImage?: boolean }) {
  const { t } = useLanguage();
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${onImage ? 'bg-card/95 text-foreground shadow-xs' : 'bg-muted text-muted-foreground'}`}
    >
      <EyeOff className="w-3 h-3" />
      {t('adminDraft')}
    </span>
  );
}

/** Punkte erscheinen immer als Gold-Chip */
export function PointsChip({ points }: { points: number }) {
  const { t } = useLanguage();
  return (
    <span className="inline-flex items-center rounded-full bg-gold-soft px-2 py-0.5 text-xs font-bold text-gold-foreground tabular-nums">
      {points} {t('points')}
    </span>
  );
}

/**
 * Stationsspur: eine Perle pro Station, verbunden wie ein Weg. Gefüllt = veröffentlicht,
 * gestrichelt = Entwurf. Zeigt auf einen Blick, wie viele Stationen unter einem Pfad liegen.
 */
export function StationTrail({ stations, max = 10 }: { stations: { id: number; published: boolean }[]; max?: number }) {
  const { t } = useLanguage();
  const visible = stations.slice(0, max);
  const rest = stations.length - visible.length;
  if (stations.length === 0) {
    return <p className="text-xs text-muted-foreground">{t('adminNoStationsYet')}</p>;
  }
  return (
    <div className="flex items-center" aria-hidden="true">
      {visible.map((station, index) => (
        <Fragment key={station.id}>
          {index > 0 && <span className="h-0.5 w-3 bg-primary/25 flex-shrink-0" />}
          <span
            className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold tabular-nums ${station.published
              ? 'bg-primary text-white'
              : 'border-[1.5px] border-dashed border-border-strong bg-card text-muted-foreground'}`}
          >
            {index + 1}
          </span>
        </Fragment>
      ))}
      {rest > 0 && <span className="ml-1.5 text-xs font-bold text-muted-foreground tabular-nums">+{rest}</span>}
    </div>
  );
}

/** Kleine Icon-Kacheln für den Ablauf einer Station (Modultypen in Reihenfolge) */
export function ModuleIconRow({ types, size = 'sm' }: { types: ModuleType[]; size?: 'sm' | 'md' }) {
  const { t } = useLanguage();
  const box = size === 'sm' ? 'w-6 h-6 rounded-md' : 'w-8 h-8 rounded-lg';
  const icon = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  if (types.length === 0) return null;
  return (
    <ul className="flex items-center gap-1 flex-wrap" aria-label={t('adminModulesLabel')}>
      {types.map((type, index) => {
        const Icon = MODULE_META[type].icon;
        return (
          <li key={index} className={`${box} bg-primary-soft text-primary flex items-center justify-center`} title={t(MODULE_META[type].labelKey)}>
            <Icon className={icon} aria-hidden="true" />
            <span className="sr-only">{t(MODULE_META[type].labelKey)}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Abschnittskopf innerhalb einer Admin-Seite: Titel links, Aktion rechts */
export function SectionHeader({ title, count, action }: { title: string; count?: number; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-3 px-1">
      <h2 className="text-lg font-bold tracking-tight">
        {title}
        {count !== undefined && <span className="ml-2 text-muted-foreground font-semibold tabular-nums">{count}</span>}
      </h2>
      {action}
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  text: string;
  confirmLabel: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Bestätigung vor dem Löschen (Optik wie GuestWarningDialog) */
export function ConfirmDialog({ open, title, text, confirmLabel, busy = false, onCancel, onConfirm }: ConfirmDialogProps) {
  const { t } = useLanguage();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onKeyDown={(e) => e.key === 'Escape' && !busy && onCancel()}
        >
          <button type="button" aria-label={t('cancel')} className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => !busy && onCancel()} />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="admin-confirm-title"
            aria-describedby="admin-confirm-text"
            className="relative w-full max-w-md rounded-[28px] bg-card p-6 shadow-2xl"
            style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.3, ease }}
          >
            <span className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4">
              <Trash2 className="h-6 w-6" />
            </span>
            <h3 id="admin-confirm-title" className="text-xl font-bold">{title}</h3>
            <p id="admin-confirm-text" className="mt-2 mb-6 text-sm text-muted-foreground leading-relaxed">{text}</p>
            <div className="flex flex-col-reverse sm:flex-row gap-2.5">
              <button
                type="button"
                autoFocus
                onClick={onCancel}
                disabled={busy}
                className="flex-1 min-h-[52px] rounded-2xl border border-border bg-card px-6 font-semibold text-foreground hover:bg-muted transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={busy}
                className="flex-1 min-h-[52px] rounded-2xl bg-destructive px-6 font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {busy ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
