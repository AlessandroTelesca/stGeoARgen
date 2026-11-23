import { lazy, Suspense } from 'react';
import type { ModulePlayerProps } from '../ui';

// three.js, der AR-Kern und der GLB-Lader landen nur in diesem Chunk: erst laden, wenn eine Station ein 3D-Modell zeigt
const Model3dPlayerImpl = lazy(() => import('./Model3dPlayer').then((m) => ({ default: m.Model3dPlayer })));

/** 3D-Modell mit Ladeanzeige, bis der Chunk da ist */
export function Model3dPlayer(props: ModulePlayerProps<'model3d'>) {
  return (
    <Suspense
      fallback={
        <div className="flex h-full w-full items-center justify-center bg-black" role="status">
          <span className="block w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" aria-hidden="true" />
        </div>
      }
    >
      <Model3dPlayerImpl {...props} />
    </Suspense>
  );
}
