import type { ComponentType } from 'react';
import type { ModuleType, StationModule } from '../types';
import type { ARChromeProps, PlayerStation } from './contract';
import { ArPanoramaEmbedded } from './ArPanoramaStage';
import { ArPanoramaPlayer } from './modules/ArPanoramaLazy';

/** Props der AR-Ansicht im Vollbild (Handy) */
export interface ArStageNativeProps {
  station: PlayerStation;
  module: StationModule<string>;
  lang: 'de' | 'en';
  arChrome: ARChromeProps;
  isGuest: boolean;
  continueLabel: string;
  onContinue: () => void;
}

/** Props der Ansicht für Vorschau und Rechner */
export interface ArStagePreviewProps {
  module: StationModule<string>;
  lang: 'de' | 'en';
  continueLabel: string;
  onContinue: () => void;
}

/** Module mit eigener AR-Bühne: `Native` übernimmt auf dem Handy den ganzen Bildschirm, `Preview` ersetzt sie sonst */
export interface ArStage {
  Native?: ComponentType<ArStageNativeProps>;
  Preview?: ComponentType<ArStagePreviewProps>;
}

export const AR_STAGES: Partial<Record<ModuleType, ArStage>> = {
  ar_panorama: {
    Native: ArPanoramaEmbedded as unknown as ComponentType<ArStageNativeProps>,
    Preview: ArPanoramaPlayer as unknown as ComponentType<ArStagePreviewProps>,
  },
};
