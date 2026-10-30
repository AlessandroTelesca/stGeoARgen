import type { ModuleType } from '../../stationModules/types';

/**
 * Schematische Mini-Ansicht eines Modultyps (Modulbibliothek, Stationsvorlagen):
 * zeigt auf einen Blick, wie das Modul für Besucher:innen aussieht. Reines CSS im
 * dunklen Bühnenstil des Players, damit die Skizzen zum echten Ergebnis passen.
 */

const bar = 'rounded-full bg-white/35';
const photo = 'bg-gradient-to-br from-primary-light/70 via-primary/60 to-primary-darker';
const oldPhoto = 'bg-gradient-to-br from-gold-soft/80 via-gold/45 to-gold-foreground/70 sepia';

function Lines({ count = 3, className = '' }: { count?: number; className?: string }) {
  const widths = ['w-full', 'w-11/12', 'w-4/5', 'w-2/3', 'w-3/4'];
  return (
    <div className={`space-y-1 ${className}`}>
      {Array.from({ length: count }, (_, i) => <div key={i} className={`h-1 ${bar} ${widths[i % widths.length]}`} />)}
    </div>
  );
}

function Sketch({ type, variant }: { type: ModuleType; variant?: string }) {
  switch (type) {
    case 'story':
      if (variant === 'georgi') {
        return (
          <div className="flex items-start gap-1.5 w-full">
            <span className="w-5 h-5 rounded-full bg-primary-light flex-shrink-0" />
            <div className="flex-1 rounded-lg rounded-tl-sm bg-white/15 p-1.5"><Lines count={3} /></div>
          </div>
        );
      }
      if (variant === 'quote') {
        return (
          <div className="w-full">
            <span className="block text-primary-lighter text-xl leading-none font-extrabold">“</span>
            <Lines count={2} className="mt-0.5" />
            <div className={`mt-1.5 h-1 w-1/3 ${bar} opacity-60`} />
          </div>
        );
      }
      return (
        <div className="w-full">
          <div className={`h-6 rounded-md ${photo}`} />
          <Lines count={3} className="mt-1.5" />
        </div>
      );
    case 'slideshow':
      return (
        <div className="w-full">
          <div className="flex gap-0.5 mb-1">{[0, 1, 2, 3].map((i) => <span key={i} className={`h-0.5 flex-1 rounded-full ${i < 2 ? 'bg-white' : 'bg-white/30'}`} />)}</div>
          <div className="relative h-8">
            <div className={`absolute inset-x-2 inset-y-0 rounded-md ${photo} opacity-50 translate-x-2`} />
            <div className={`absolute inset-0 right-3 rounded-md ${photo}`} />
          </div>
          <Lines count={1} className="mt-1.5" />
        </div>
      );
    case 'audio':
      return (
        <div className="w-full flex flex-col items-center">
          <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
            <span className="ml-0.5 w-0 h-0 border-y-[5px] border-y-transparent border-l-[8px] border-l-primary" />
          </span>
          <div className="mt-2 flex items-end gap-[2px] h-4">
            {[3, 6, 10, 7, 12, 5, 9, 14, 8, 4, 10, 6, 3].map((h, i) => (
              <span key={i} className={`w-[3px] rounded-full ${i < 6 ? 'bg-white' : 'bg-white/35'}`} style={{ height: `${h}px` }} />
            ))}
          </div>
        </div>
      );
    case 'timeline':
      return (
        <div className="relative w-full pl-3">
          <span className="absolute left-[3px] top-1 bottom-1 w-0.5 bg-white/25" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="relative flex items-center gap-1.5 py-1">
              <span className="absolute -left-3 w-2 h-2 rounded-full bg-primary-lighter" />
              <span className="text-[8px] font-extrabold text-white tabular-nums">{['1084', '1633', '1950'][i]}</span>
              <div className={`h-1 flex-1 ${bar}`} />
            </div>
          ))}
        </div>
      );
    case 'before_after':
      if (variant === 'camera') {
        return (
          <div className="relative w-full h-12 rounded-md overflow-hidden bg-white/10">
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">{Array.from({ length: 9 }, (_, i) => <span key={i} className="border border-white/10" />)}</div>
            <div className={`absolute inset-2 rounded ${oldPhoto} opacity-60`} />
          </div>
        );
      }
      if (variant === 'fade') {
        return (
          <div className="w-full">
            <div className="relative h-9 rounded-md overflow-hidden">
              <div className={`absolute inset-0 ${photo}`} />
              <div className={`absolute inset-0 ${oldPhoto} opacity-55`} />
            </div>
            <div className="mt-1.5 relative h-1 rounded-full bg-white/30"><span className="absolute -top-1 left-[45%] w-3 h-3 rounded-full bg-white" /></div>
          </div>
        );
      }
      return (
        <div className="relative w-full h-12 rounded-md overflow-hidden">
          <div className={`absolute inset-0 ${photo}`} />
          <div className={`absolute inset-y-0 left-0 w-1/2 ${oldPhoto}`} />
          <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white" />
          <span className="absolute top-1/2 left-1/2 w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow" />
        </div>
      );
    case 'ar_panorama':
      return (
        <div className="relative w-12 h-12 mx-auto">
          <span className="absolute inset-1 rounded-full border border-dashed border-white/35" />
          <span className="absolute top-1/2 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
          {[0, 60, 120, 180, 240, 300].map((deg, i) => (
            <span
              key={deg}
              className={`absolute top-1/2 left-1/2 w-3 h-2 rounded-[2px] ${i === 5 ? 'bg-gold' : photo}`}
              style={{ transform: `translate(-50%, -50%) rotate(${deg}deg) translateY(-20px)` }}
            />
          ))}
        </div>
      );
    case 'hotspots':
      return (
        <div className={`relative w-full h-12 rounded-md ${photo}`}>
          {[[18, 30], [55, 62], [78, 25]].map(([x, y], i) => (
            <span
              key={i}
              className={`absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-white text-[7px] font-extrabold flex items-center justify-center ${i === 1 ? 'bg-primary text-white' : 'bg-white text-primary'}`}
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              {i + 1}
            </span>
          ))}
        </div>
      );
    case 'quiz':
      if (variant === 'true_false') {
        return (
          <div className="w-full">
            <Lines count={1} />
            <div className="mt-1.5 grid grid-cols-2 gap-1">
              <span className="h-5 rounded-md bg-primary border border-primary-lighter" />
              <span className="h-5 rounded-md bg-white/12 border border-white/20" />
            </div>
          </div>
        );
      }
      return (
        <div className="w-full space-y-1">
          {variant === 'round' && (
            <div className="flex gap-0.5 mb-1">{[0, 1, 2].map((i) => <span key={i} className={`h-0.5 flex-1 rounded-full ${i === 0 ? 'bg-white' : 'bg-white/30'}`} />)}</div>
          )}
          <Lines count={1} className="mb-1.5" />
          {[0, 1, 2].map((i) => <span key={i} className={`block h-2.5 rounded ${i === 1 ? 'bg-primary border border-primary-lighter' : 'bg-white/12 border border-white/20'}`} />)}
        </div>
      );
    case 'estimate':
      return (
        <div className="w-full text-center">
          <span className="block text-[15px] leading-none font-extrabold text-white tabular-nums">{variant === 'number' ? '42 m' : '1650'}</span>
          <div className="mt-2 relative h-1 rounded-full bg-white/25">
            <span className="absolute inset-y-0 left-[48%] w-[14%] bg-gold/60 rounded-full" />
            <span className="absolute -top-1 left-[30%] w-3 h-3 rounded-full bg-white" />
          </div>
        </div>
      );
    case 'sequence':
      return (
        <div className="w-full space-y-1">
          {[['1', 'w-4/5'], ['2', 'w-3/5'], ['', 'w-2/3']].map(([n, w], i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className={`w-3.5 h-3.5 rounded-full flex-shrink-0 text-[8px] font-extrabold flex items-center justify-center ${n ? 'bg-primary text-white' : 'border border-dashed border-white/50'}`}>{n}</span>
              <span className={`h-2.5 rounded ${w} ${n ? 'bg-white/30' : 'bg-white/12'}`} />
            </div>
          ))}
        </div>
      );
    case 'photo':
      return variant === 'selfie' ? (
        <div className="w-14 mx-auto rounded-sm bg-white p-1 pb-3 rotate-[-4deg] shadow">
          <div className={`h-10 ${photo}`} />
        </div>
      ) : (
        <div className={`relative w-full h-12 rounded-md ${photo}`}>
          <span className="absolute left-1.5 bottom-1.5 w-4 h-4 rounded-full bg-primary ring-2 ring-white" />
          <span className="absolute left-7 bottom-2 h-1.5 w-1/2 rounded-full bg-white/80" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-white/80" />
        </div>
      );
    case 'onsite_code':
      return (
        <div className="w-full">
          <Lines count={2} />
          <div className="mt-2 flex gap-1">
            {(variant === 'text' ? ['A', 'B', 'C', ''] : ['1', '8', '9', '']).map((c, i) => (
              <span key={i} className={`flex-1 h-5 rounded border text-[9px] font-extrabold text-white flex items-center justify-center ${c ? 'border-white/40 bg-white/10' : 'border-white border-dashed'}`}>{c}</span>
            ))}
          </div>
        </div>
      );
  }
}

/** Mini-Handy-Bildschirm mit der Skizze des Moduls */
export function ModuleIllustration({ type, variant, className = '' }: { type: ModuleType; variant?: string; className?: string }) {
  return (
    <div className={`rounded-xl bg-gray-900 p-2.5 flex items-center justify-center overflow-hidden ${className}`} aria-hidden="true">
      <Sketch type={type} variant={variant} />
    </div>
  );
}
