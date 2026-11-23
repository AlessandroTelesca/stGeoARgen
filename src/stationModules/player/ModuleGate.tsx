import { useEffect, useRef, type ReactNode } from 'react';
import { Layers } from 'lucide-react';
import { GlassCard, ModuleHeading, ModuleScreen, ModuleText, PrimaryButton, SecondaryButton } from './ui';

/** Hinweis statt Modul (kaputt, unvollständig, unbekannt) mit Weiter-Button; Kopf und Fortschritt der Bühne bleiben */
export function ModuleNote({ text, continueLabel, onContinue }: { text: string; continueLabel: string; onContinue: () => void }) {
  return (
    <ModuleScreen footer={<PrimaryButton onClick={onContinue}>{continueLabel}</PrimaryButton>}>
      <GlassCard className="mt-4 flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-white/12 border border-white/20 flex items-center justify-center flex-shrink-0" aria-hidden="true">
          <Layers className="w-5 h-5" />
        </span>
        <p className="pt-2 text-[15px] leading-relaxed text-white/90">{text}</p>
      </GlassCard>
    </ModuleScreen>
  );
}

interface ModuleGateProps {
  icon: ReactNode;
  title: string;
  body: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel: string;
  onSecondary: () => void;
}

/**
 * Karte auf der Bühne, wenn die Bestehensgrenze eines Moduls nicht erreicht ist („Nochmal versuchen“ /
 * „Weiter ohne Punkte“) bzw. nach einer Station ohne Punkte. Bewusst weder rot noch gold.
 */
export function ModuleGate({ icon, title, body, primaryLabel, onPrimary, secondaryLabel, onSecondary }: ModuleGateProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  // Fokus beim Öffnen auf die Hauptaktion
  useEffect(() => {
    rootRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true });
  }, []);

  return (
    <div ref={rootRef} className="h-full">
      <ModuleScreen
        footer={
          <div className="flex w-full flex-col gap-2.5">
            <PrimaryButton onClick={onPrimary} data-autofocus>
              {primaryLabel}
            </PrimaryButton>
            <SecondaryButton onClick={onSecondary}>{secondaryLabel}</SecondaryButton>
          </div>
        }
      >
        <span className="w-14 h-14 mb-4 rounded-2xl bg-white/12 border border-white/20 flex items-center justify-center" aria-hidden="true">
          {icon}
        </span>
        <ModuleHeading title={title} />
        <ModuleText>{body}</ModuleText>
      </ModuleScreen>
    </div>
  );
}
