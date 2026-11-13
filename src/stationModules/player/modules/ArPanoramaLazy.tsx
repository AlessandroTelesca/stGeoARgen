import { lazy, Suspense } from 'react';
import type { ArPanoramaPlayerProps } from './ArPanoramaPlayer';

// three.js und der AR-Kern landen nur in diesem Chunk: erst laden, wenn eine Vorschau bzw. der Rechner einen AR-Rundumblick abspielt
const ArPanoramaPlayerImpl = lazy(() => import('./ArPanoramaPlayer').then((m) => ({ default: m.ArPanoramaPlayer })));

/** AR-Rundumblick mit Ladeanzeige, bis der Chunk da ist */
export function ArPanoramaPlayer(props: ArPanoramaPlayerProps) {
  return (
    <Suspense
      fallback={
        <div className="flex h-full w-full items-center justify-center bg-black" role="status">
          <span className="block w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" aria-hidden="true" />
        </div>
      }
    >
      <ArPanoramaPlayerImpl {...props} />
    </Suspense>
  );
}
