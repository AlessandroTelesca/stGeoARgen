import { lazy, Suspense } from 'react';
import type { ModulePlayerProps } from '../ui';

// three.js und der AR-Kern landen nur in diesem Chunk: erst laden, wenn eine Station AR-Entdecken abspielt
const ArDiscoverPlayerImpl = lazy(() => import('./ArDiscoverPlayer').then((m) => ({ default: m.ArDiscoverPlayer })));

/** AR-Entdecken mit Ladeanzeige, bis der Chunk da ist */
export function ArDiscoverPlayer(props: ModulePlayerProps<'ar_discover'>) {
  return (
    <Suspense
      fallback={
        <div className="flex h-full w-full items-center justify-center bg-black" role="status">
          <span className="block w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" aria-hidden="true" />
        </div>
      }
    >
      <ArDiscoverPlayerImpl {...props} />
    </Suspense>
  );
}
