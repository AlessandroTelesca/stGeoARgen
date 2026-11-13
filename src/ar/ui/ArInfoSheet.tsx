import { useId } from 'react';
import { ArSheet } from './ArSheet';

/** Info-Karte eines entdeckten Punkts: Bild, Titel, Text und eine Aktion („Weiter entdecken“ bzw. Weiter) */
interface ArInfoSheetProps {
  title: string;
  text: string;
  /** Bild-URL (optional) */
  image?: string | null;
  actionLabel: string;
  onAction: () => void;
  onClose: () => void;
}

export function ArInfoSheet({ title, text, image, actionLabel, onAction, onClose }: ArInfoSheetProps) {
  const titleId = useId();
  return (
    <ArSheet labelledBy={titleId} onClose={onClose}>
      <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain">
        {image && <img src={image} alt="" draggable={false} className="mb-4 max-h-44 w-full rounded-2xl object-cover" />}
        <h3 id={titleId} className="text-lg font-bold leading-snug">
          {title}
        </h3>
        <p className="mt-1.5 whitespace-pre-line text-[15px] leading-relaxed text-white/90">{text}</p>
      </div>
      <button
        type="button"
        data-autofocus
        onClick={onAction}
        className="pressable mt-4 flex min-h-[52px] w-full flex-shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-5 font-extrabold text-primary shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
      >
        {actionLabel}
      </button>
    </ArSheet>
  );
}
