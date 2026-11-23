import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { motion } from 'motion/react';
import { Check, CircleAlert, Info, X } from 'lucide-react';
import type { ModuleOfType, ModuleType } from '../types';

/**
 * Gemeinsame Bausteine der Modul-Player. Die Bühne (StationModulePlayer) ist dunkel wie die
 * AR-Stationen und die Bildfolge: weißer Text, Glasflächen, weißer Primär-Button.
 * Jeder Player baut sich aus <ModuleScreen> + diesen Bausteinen, damit alle Module gleich wirken.
 */

/** Ergebnis eines Moduls mit richtig/falsch (Quiz, Schätzfrage, Rätsel, Reihenfolge) */
export interface ModuleResult {
  correct: number;
  total: number;
}

/** Bestehensgrenze erfüllt? Ohne Grenze immer; mit Grenze aber ohne Ergebnis nie */
export function isModulePassed(threshold: number | null | undefined, result: ModuleResult | undefined): boolean {
  if (threshold == null) return true;
  if (!result) return false;
  return result.correct >= threshold;
}

export interface ModulePlayerProps<T extends ModuleType> {
  /** Modul mit fertigen Medien-URLs */
  module: ModuleOfType<T, string>;
  lang: 'de' | 'en';
  /** Beschriftung des letzten Buttons dieses Moduls („Weiter“ bzw. „Station abschließen“) */
  continueLabel: string;
  /** Modul fertig → nächstes Modul bzw. Stationsabschluss */
  onContinue: () => void;
  /** Ergebnis vor onContinue melden (Quiz, Schätzfrage, Rätsel, Reihenfolge) */
  onResult?: (result: ModuleResult) => void;
  /** Vorschau in der Stationsverwaltung: nichts wird gespeichert, Kamera/Standort optional */
  preview: boolean;
  /** Name der Station in der aktuellen Sprache (z. B. Beschriftung im Fotomoment) */
  stationTitle?: string;
}

const ease = [0.16, 1, 0.3, 1] as const;

/**
 * Bildschirm eines Moduls: Inhalt scrollt, der Footer (Buttons) bleibt unten über der
 * AR-Fortschrittsleiste. `--module-footer-pad` setzt die Bühne passend zur Leiste.
 */
export function ModuleScreen({ children, footer, bleed = false }: { children: ReactNode; footer?: ReactNode; bleed?: boolean }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain ${bleed ? '' : 'px-5 pt-2 pb-6'}`}>
        <div className={bleed ? 'h-full' : 'max-w-md mx-auto'}>{children}</div>
      </div>
      {footer && (
        <div
          className="flex-shrink-0 px-5 pt-3 bg-gradient-to-t from-black via-black/95 to-black/0 transition-[padding] duration-300"
          style={{ paddingBottom: 'var(--module-footer-pad, max(24px, env(safe-area-inset-bottom, 0px)))' }}
        >
          <div className="max-w-md mx-auto flex gap-2.5">{footer}</div>
        </div>
      )}
    </div>
  );
}

/**
 * Überschrift eines Moduls – nur, wenn die Redaktion eine gesetzt hat. Ohne Überschrift führt der
 * Inhalt selbst (Frage, Text, Bild); interne Modulnamen wie „Schätzfrage“ sehen Besucher:innen nie.
 */
export function ModuleHeading({ title, subtitle }: { title: string | null; subtitle?: string | null }) {
  if (!title && !subtitle) return null;
  return (
    <div className="mb-5">
      {title && <h2 className="text-[24px] leading-[1.2] font-extrabold tracking-tight text-white">{title}</h2>}
      {subtitle && <p className={`text-[15px] leading-relaxed text-white/75 ${title ? 'mt-1.5' : ''}`}>{subtitle}</p>}
    </div>
  );
}

/** Fließtext auf der Bühne (Zeilenumbrüche bleiben erhalten) */
export function ModuleText({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-[16px] leading-relaxed text-white/90 whitespace-pre-line ${className}`}>{children}</p>;
}

/** Glasfläche für Karten, Fragen, Hinweise */
export function GlassCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[20px] bg-white/[0.08] border border-white/[0.14] p-4 ${className}`}>{children}</div>;
}

/** Bild auf der Bühne; `fit="contain"` zeigt das ganze Bild (z. B. historische Fotos) */
export function StageImage({ src, alt = '', fit = 'cover', className = '' }: { src: string; alt?: string; fit?: 'cover' | 'contain'; className?: string }) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={`w-full rounded-[20px] bg-white/5 ${fit === 'cover' ? 'object-cover' : 'object-contain'} ${className}`}
    />
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode };

/** Hauptaktion (weiß, grüne Schrift) – eine pro Bildschirm, füllt die freie Breite */
export function PrimaryButton({ children, className = '', ...props }: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={`flex-1 min-h-[52px] px-5 rounded-2xl bg-white text-primary font-extrabold flex items-center justify-center gap-2 shadow-lg pressable disabled:bg-white/15 disabled:text-white/70 disabled:shadow-none disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

/** Nebenaktion (Glas) – z. B. „Hinweis“, „Zurück“ */
export function SecondaryButton({ children, className = '', ...props }: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={`min-h-[52px] px-4 rounded-2xl bg-white/12 border border-white/20 text-white font-semibold flex items-center justify-center gap-2 hover:bg-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

export type ChoiceState = 'idle' | 'selected' | 'correct' | 'wrong' | 'dimmed';

/** Antwortoption (Quiz, Wahr/Falsch) mit Zustand */
export function ChoiceButton({ state, children, onClick, index }: { state: ChoiceState; children: ReactNode; onClick?: () => void; index?: number }) {
  const styles: Record<ChoiceState, string> = {
    idle: 'bg-white/[0.08] border-white/[0.18] hover:bg-white/[0.14] text-white',
    selected: 'bg-white text-foreground border-white',
    correct: 'bg-primary border-primary-light text-white',
    wrong: 'bg-destructive/25 border-destructive/70 text-white',
    dimmed: 'bg-white/[0.04] border-white/[0.08] text-white/45',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state === 'correct' || state === 'wrong' || state === 'dimmed'}
      aria-pressed={state === 'selected'}
      className={`w-full min-h-[52px] px-4 py-3 rounded-2xl border-2 text-left font-semibold flex items-center gap-3 transition-colors pressable disabled:cursor-default ${styles[state]}`}
    >
      {index !== undefined && (
        <span className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold tabular-nums ${state === 'selected' ? 'bg-foreground/10' : 'bg-white/15'}`}>
          {state === 'correct' ? <Check className="w-4 h-4" /> : state === 'wrong' ? <X className="w-4 h-4" /> : index + 1}
        </span>
      )}
      <span className="flex-1 min-w-0">{children}</span>
    </button>
  );
}

/** Rückmeldung nach einer Antwort; Gold nur für „Volltreffer“-Momente (tone 'reward') */
export function Feedback({ tone, title, children }: { tone: 'success' | 'error' | 'info' | 'reward'; title: string; children?: ReactNode }) {
  const tones = {
    success: { box: 'bg-primary/30 border-primary-light/60', icon: <Check className="w-5 h-5" />, iconBox: 'bg-primary text-white' },
    reward: { box: 'bg-gold/20 border-gold/50', icon: <Check className="w-5 h-5" />, iconBox: 'bg-gold text-gold-foreground' },
    error: { box: 'bg-destructive/20 border-destructive/50', icon: <CircleAlert className="w-5 h-5" />, iconBox: 'bg-destructive text-white' },
    info: { box: 'bg-white/[0.08] border-white/[0.18]', icon: <Info className="w-5 h-5" />, iconBox: 'bg-white/15 text-white' },
  }[tone];
  return (
    <motion.div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-[20px] border p-4 flex gap-3 ${tones.box}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease }}
    >
      <span className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center ${tones.iconBox}`}>{tones.icon}</span>
      <div className="min-w-0 pt-1.5">
        <p className="font-bold text-white">{title}</p>
        {children && <div className="mt-1 text-[15px] leading-relaxed text-white/85 whitespace-pre-line">{children}</div>}
      </div>
    </motion.div>
  );
}
