import { useId } from 'react';
import { Check, X } from 'lucide-react';
import { ArSheet } from './ArSheet';

/**
 * Liste aller Punkte als Alternative zum Anvisieren (Barrierefreiheit, Handy ohne Lagesensor):
 * Antippen öffnet die Info des Punkts.
 */
export interface ArPointListItem {
  id: string;
  number: number;
  label: string;
  found: boolean;
}

interface ArPointListProps {
  title: string;
  closeLabel: string;
  /** Zusatz für Screenreader an gefundenen Punkten, z. B. „entdeckt“ */
  foundLabel: string;
  items: ArPointListItem[];
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function ArPointList({ title, closeLabel, foundLabel, items, onSelect, onClose }: ArPointListProps) {
  const titleId = useId();
  return (
    <ArSheet labelledBy={titleId} onClose={onClose}>
      <div className="flex flex-shrink-0 items-center gap-3 pb-3">
        <h3 id={titleId} className="flex-1 text-lg font-bold">
          {title}
        </h3>
        <button
          type="button"
          data-autofocus
          onClick={onClose}
          aria-label={closeLabel}
          className="-mr-2 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-white/80 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <ul className="min-h-0 flex-1 touch-pan-y space-y-2 overflow-y-auto overscroll-contain pb-1">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              className="flex min-h-[52px] w-full items-center gap-3 rounded-2xl border border-white/[0.14] bg-white/[0.08] px-3 py-2 text-left font-semibold hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
            >
              <span
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-extrabold tabular-nums ${item.found ? 'bg-primary text-white' : 'bg-white text-primary'}`}
                aria-hidden="true"
              >
                {item.found ? <Check className="h-4 w-4" strokeWidth={3} /> : item.number}
              </span>
              <span className="min-w-0 flex-1">{item.label}</span>
              {item.found && <span className="sr-only">{foundLabel}</span>}
            </button>
          </li>
        ))}
      </ul>
    </ArSheet>
  );
}
