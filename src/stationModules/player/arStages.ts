import type { ComponentType } from 'react';
import type { ModuleType, StationModule } from '../types';
import type { ARChromeProps, PlayerStation } from './contract';
import { ArPanoramaEmbedded, ArPanoramaPlaceholder } from './ArPanoramaStage';

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

/** Props des Platzhalters für Vorschau und Rechner */
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
    Preview: ArPanoramaPlaceholder as unknown as ComponentType<ArStagePreviewProps>,
  },
};
