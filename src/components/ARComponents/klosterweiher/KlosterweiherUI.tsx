import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Accordion, AccordionItem, AccordionContent } from '@/components/ui/accordion';
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { Plus, X, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Fish name mapping for file loading
const FISH_NAME_MAPPING: Record<string, string> = {
  'Rotauge': 'Roach',
  'Zander': 'Zander',
  'Doebel': 'Chub',
  'Forelle': 'Trout',
  'Neunauge': 'Lamprey',
  'Schleie': 'Tench',
  'Rotfeder': 'Rudd',
  'Stichling': 'Stickleback',
  'Karpfen': 'Carp',
};

const getEnglishFishName = (germanName: string): string => {
  return FISH_NAME_MAPPING[germanName] || germanName;
};

const getArticle = (fishName: string, language: string): string => {
  return FISH_ARTICLES[fishName]?.[language] || (language === 'de' ? 'einen' : 'a');
};

// Type definition for fish information
interface FishInfo {
  name: string;
  scientificName: string;
  description: string;
  habitat: string;
  diet: string;
  size: string;
  weight: string;
  lifespan: string;
  features: string[];
  conservation: string;
  funFact: string;
}

interface WaitingForGroundProps {
  overlayRoot: HTMLDivElement;
}

export const WaitingForGroundDetection = ({ overlayRoot }: WaitingForGroundProps) => {
  const { t } = useTranslation();

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: '20%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10000,
        pointerEvents: 'none',
        padding: '20px 28px',
        background: 'var(--color-white)',
        color: 'var(--color-gray-800)',
        borderRadius: '16px',
        boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
        fontWeight: 600,
        fontSize: '16px',
        textAlign: 'center',
      }}
    >
      {t('ar.klosterweiher.pointCameraAtLake')}
    </div>,
    overlayRoot
  );
};

interface WaitingForReadyProps {
  overlayRoot: HTMLDivElement;
  onReady: () => void;
  modelsLoaded?: boolean;
}

export const WaitingForReady = ({ overlayRoot, onReady, modelsLoaded = false }: WaitingForReadyProps) => {
  const { t } = useTranslation();

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: '30%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10000,
        pointerEvents: 'auto',
        padding: '20px 28px',
        background: 'var(--color-white)',
        color: 'var(--color-gray-800)',
        borderRadius: '16px',
        boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <p style={{ margin: 0, fontWeight: 600, fontSize: '16px' }}>
        {t('ar.klosterweiher.pointCameraAtLake')}
      </p>
      {modelsLoaded ? (
        <button
          onClick={onReady}
          style={{
            padding: '10px 16px',
            borderRadius: '12px',
            border: 'none',
            background: 'var(--color-primary)',
            color: 'var(--color-white)',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
        >
          {t('ar.klosterweiher.iSeeTheLake')}
        </button>
      ) : (
        <p style={{ margin: 0, fontWeight: 400, fontSize: '14px', opacity: 0.8 }}>
          {t('ar.klosterweiher.loading')}
        </p>
      )}
    </div>,
    overlayRoot
  );
};

interface FishingInstructionsProps {
  overlayRoot: HTMLDivElement;
  onStart: () => void;
}

export const FishingInstructions = ({ overlayRoot, onStart }: FishingInstructionsProps) => {
  const { t } = useTranslation();

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10000,
        pointerEvents: 'auto',
        padding: '20px 28px',
        background: 'var(--color-white)',
        color: 'var(--color-gray-800)',
        borderRadius: '16px',
        boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <p style={{ margin: 0, fontWeight: 600, fontSize: '16px' }}>
        {t('ar.klosterweiher.tapToFish')}
      </p>
      <button
        onClick={onStart}
        style={{
          padding: '10px 16px',
          borderRadius: '12px',
          border: 'none',
          background: 'var(--color-primary)',
          color: 'var(--color-white)',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        {t('ar.klosterweiher.startFishing')}
      </button>
    </div>,
    overlayRoot
  );
};

interface ReleaseFishButtonProps {
  overlayRoot: HTMLDivElement;
  onRelease: () => void;
}

export const ReleaseFishButton = ({ overlayRoot, onRelease }: ReleaseFishButtonProps) => {
  const { t } = useTranslation();

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: '64%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10000,
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: '14px',
          fontWeight: 500,
          color: 'var(--color-white)',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)',
          opacity: 0.9,
          pointerEvents: 'none',
        }}
      >
        {t('ar.klosterweiher.moveFishWithFingers')}
      </p>
      <button
        onClick={onRelease}
        style={{
          padding: '12px 18px',
          borderRadius: '12px',
          border: 'none',
          background: 'var(--color-white)',
          color: 'var(--color-primary)',
          fontWeight: 700,
          boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
          cursor: 'pointer',
          width: '280px',
        }}
      >
        {t('ar.klosterweiher.releaseFish')}
      </button>
    </div>,
    overlayRoot
  );
};

interface FishCaughtDialogProps {
  overlayRoot: HTMLDivElement;
  fishName: string;
  onLearnMore: () => void;
}

export const FishCaughtDialog = ({ overlayRoot, fishName, onLearnMore }: FishCaughtDialogProps) => {
  const { t, i18n } = useTranslation();
  const article = getArticle(fishName, i18n.language);
  const [showTooltip, setShowTooltip] = useState(false);
  
  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: '18%',
        left: '20px',
        right: '20px',
        transform: 'translateY(-50%)',
        zIndex: 9999,
        pointerEvents: 'auto',
        padding: '24px 20px',
        background: 'var(--color-white)',
        color: 'var(--color-gray-800)',
        borderRadius: '16px',
        boxShadow: '0 12px 28px rgba(0,0,0,0.4)',
        textAlign: 'center',
        animation: 'slideInDown 0.4s ease-out',
        boxSizing: 'border-box',
      }}
    >
      {/* Info Icon in der oberen rechten Ecke */}
      <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
        <button
          onClick={onLearnMore}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          style={{
            background: 'var(--color-primary)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            transition: 'all 0.2s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <Info style={{ width: '18px', height: '18px', color: 'white' }} />
        </button>
        
        {/* Tooltip */}
        {showTooltip && (
          <div
            style={{
              position: 'absolute',
              top: '40px',
              right: '0',
              background: 'rgba(0,0,0,0.85)',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 10001,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
          >
            {t('ar.klosterweiher.learnMoreAboutFish')}
            {/* Tooltip Arrow */}
            <div
              style={{
                position: 'absolute',
                top: '-4px',
                right: '12px',
                width: '8px',
                height: '8px',
                background: 'rgba(0,0,0,0.85)',
                transform: 'rotate(45deg)',
              }}
            />
          </div>
        )}
      </div>

      <p style={{ margin: '0 0 8px 0', fontWeight: 400, fontSize: '14px', letterSpacing: '0.5px' }}>
        {t('ar.klosterweiher.congratulationsCaught', { article, fishName: fishName.split(' ')[0] })}
      </p>
    </div>,
    overlayRoot
  );
};

interface FishInfoPopupProps {
  overlayRoot: HTMLDivElement;
  fishName: string;
  onClose: () => void;
}

export const FishInfoPopup = ({ overlayRoot, fishName, onClose }: FishInfoPopupProps) => {
  const { t, i18n } = useTranslation();
  const [fishInfo, setFishInfo] = useState<FishInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const loadFishInfo = () => {
      try {
        setLoading(true);
        setError(false);
        const englishName = getEnglishFishName(fishName);
        const key = i18n.language === 'de' ? fishName : englishName;
        const data = t(`fish.${key}`, { returnObjects: true });
        if (data && typeof data === 'object' && 'name' in data) {
          setFishInfo(data as FishInfo);
        } else {
          throw new Error('Fish info not found');
        }
      } catch (err) {
        console.error(`Failed to load fish info for ${fishName}:`, err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadFishInfo();
  }, [fishName, i18n.language, t]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      onClose();
    }
  };

  return createPortal(
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[95vh] p-0 overflow-hidden border-t-0"
        style={{
          pointerEvents: 'auto',
          zIndex: 10001,
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
        }}
      >
        {/* Bottom Sheet Indicator */}
        <div className="w-full flex justify-center pt-4 pb-3">
          <div className="w-16 h-1.5 bg-gray-400 rounded-full" />
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            <p className="text-lg">Lade Informationen...</p>
          </div>
        ) : error || !fishInfo ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            <p className="text-lg">Informationen für diesen Fisch sind leider nicht verfügbar.</p>
          </div>
        ) : (
          <div className="h-full flex flex-col overflow-hidden pb-6">
            {/* Header */}
            <SheetHeader className="px-8 pb-6 pt-2">
              <SheetTitle className="text-3xl font-bold text-primary">
                {fishInfo.name}
              </SheetTitle>
              <SheetDescription className="text-base italic opacity-80 mt-1">
                {fishInfo.scientificName}
              </SheetDescription>
            </SheetHeader>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-8 py-2">
              {/* Einleitungstext */}
              <p className="mb-8 text-lg leading-relaxed text-gray-700">
                {fishInfo.description}
              </p>

              {/* Accordion für weitere Informationen */}
              <Accordion type="single" collapsible className="w-full space-y-4">
                {/* Lebensraum */}
                <AccordionItem value="habitat" className="border-b-0">
                  <AccordionPrimitive.Header className="flex">
                    <AccordionPrimitive.Trigger className="flex flex-1 items-center justify-between text-lg font-semibold text-primary hover:no-underline py-5 group">
                      <span>Lebensraum</span>
                      <div className="relative w-5 h-5">
                        <Plus className="w-5 h-5 absolute inset-0 transition-all duration-300 group-data-[state=open]:opacity-0 group-data-[state=open]:rotate-90" />
                        <X className="w-5 h-5 absolute inset-0 transition-all duration-300 opacity-0 rotate-90 group-data-[state=open]:opacity-100 group-data-[state=open]:rotate-0" />
                      </div>
                    </AccordionPrimitive.Trigger>
                  </AccordionPrimitive.Header>
                  <AccordionContent>
                    <p className="text-base leading-relaxed text-gray-600 pl-8 pb-2">
                      {fishInfo.habitat}
                    </p>
                  </AccordionContent>
                </AccordionItem>

                {/* Ernährung */}
                <AccordionItem value="diet" className="border-b-0">
                  <AccordionPrimitive.Header className="flex">
                    <AccordionPrimitive.Trigger className="flex flex-1 items-center justify-between text-lg font-semibold text-primary hover:no-underline py-5 group">
                      <span>Ernährung</span>
                      <div className="relative w-5 h-5">
                        <Plus className="w-5 h-5 absolute inset-0 transition-all duration-300 group-data-[state=open]:opacity-0 group-data-[state=open]:rotate-90" />
                        <X className="w-5 h-5 absolute inset-0 transition-all duration-300 opacity-0 rotate-90 group-data-[state=open]:opacity-100 group-data-[state=open]:rotate-0" />
                      </div>
                    </AccordionPrimitive.Trigger>
                  </AccordionPrimitive.Header>
                  <AccordionContent>
                    <p className="text-base leading-relaxed text-gray-600 pl-8 pb-2">
                      {fishInfo.diet}
                    </p>
                  </AccordionContent>
                </AccordionItem>

                {/* Größe & Gewicht */}
                <AccordionItem value="dimensions" className="border-b-0">
                  <AccordionPrimitive.Header className="flex">
                    <AccordionPrimitive.Trigger className="flex flex-1 items-center justify-between text-lg font-semibold text-primary hover:no-underline py-5 group">
                      <span>Größe & Gewicht</span>
                      <div className="relative w-5 h-5">
                        <Plus className="w-5 h-5 absolute inset-0 transition-all duration-300 group-data-[state=open]:opacity-0 group-data-[state=open]:rotate-90" />
                        <X className="w-5 h-5 absolute inset-0 transition-all duration-300 opacity-0 rotate-90 group-data-[state=open]:opacity-100 group-data-[state=open]:rotate-0" />
                      </div>
                    </AccordionPrimitive.Trigger>
                  </AccordionPrimitive.Header>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-4 pl-8 pb-2">
                      <div>
                        <h4 className="text-base font-semibold text-primary mb-2">Größe</h4>
                        <p className="text-base text-gray-600">{fishInfo.size}</p>
                      </div>
                      <div>
                        <h4 className="text-base font-semibold text-primary mb-2">Gewicht</h4>
                        <p className="text-base text-gray-600">{fishInfo.weight}</p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Merkmale */}
                <AccordionItem value="features" className="border-b-0">
                  <AccordionPrimitive.Header className="flex">
                    <AccordionPrimitive.Trigger className="flex flex-1 items-center justify-between text-lg font-semibold text-primary hover:no-underline py-5 group">
                      <span>Merkmale</span>
                      <div className="relative w-5 h-5">
                        <Plus className="w-5 h-5 absolute inset-0 transition-all duration-300 group-data-[state=open]:opacity-0 group-data-[state=open]:rotate-90" />
                        <X className="w-5 h-5 absolute inset-0 transition-all duration-300 opacity-0 rotate-90 group-data-[state=open]:opacity-100 group-data-[state=open]:rotate-0" />
                      </div>
                    </AccordionPrimitive.Trigger>
                  </AccordionPrimitive.Header>
                  <AccordionContent>
                    <ul className="list-disc pl-12 space-y-2 pb-2">
                      {fishInfo.features.map((feature, index) => (
                        <li key={index} className="text-base text-gray-600">{feature}</li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                {/* Lebenserwartung */}
                <AccordionItem value="lifespan" className="border-b-0">
                  <AccordionPrimitive.Header className="flex">
                    <AccordionPrimitive.Trigger className="flex flex-1 items-center justify-between text-lg font-semibold text-primary hover:no-underline py-5 group">
                      <span>Lebenserwartung</span>
                      <div className="relative w-5 h-5">
                        <Plus className="w-5 h-5 absolute inset-0 transition-all duration-300 group-data-[state=open]:opacity-0 group-data-[state=open]:rotate-90" />
                        <X className="w-5 h-5 absolute inset-0 transition-all duration-300 opacity-0 rotate-90 group-data-[state=open]:opacity-100 group-data-[state=open]:rotate-0" />
                      </div>
                    </AccordionPrimitive.Trigger>
                  </AccordionPrimitive.Header>
                  <AccordionContent>
                    <p className="text-base leading-relaxed text-gray-600 pl-8 pb-2">
                      {fishInfo.lifespan}
                    </p>
                  </AccordionContent>
                </AccordionItem>

                {/* Naturschutz */}
                <AccordionItem value="conservation" className="border-b-0">
                  <AccordionPrimitive.Header className="flex">
                    <AccordionPrimitive.Trigger className="flex flex-1 items-center justify-between text-lg font-semibold text-primary hover:no-underline py-5 group">
                      <span>Naturschutz</span>
                      <div className="relative w-5 h-5">
                        <Plus className="w-5 h-5 absolute inset-0 transition-all duration-300 group-data-[state=open]:opacity-0 group-data-[state=open]:rotate-90" />
                        <X className="w-5 h-5 absolute inset-0 transition-all duration-300 opacity-0 rotate-90 group-data-[state=open]:opacity-100 group-data-[state=open]:rotate-0" />
                      </div>
                    </AccordionPrimitive.Trigger>
                  </AccordionPrimitive.Header>
                  <AccordionContent>
                    <p className="text-base leading-relaxed text-gray-600 pl-8 pb-2">
                      {fishInfo.conservation}
                    </p>
                  </AccordionContent>
                </AccordionItem>

                {/* Wussten Sie schon? */}
                <AccordionItem value="funfact" className="border-b-0">
                  <AccordionPrimitive.Header className="flex">
                    <AccordionPrimitive.Trigger className="flex flex-1 items-center justify-between text-lg font-semibold text-primary hover:no-underline py-5 group">
                      <span>💡 Wussten Sie schon?</span>
                      <div className="relative w-5 h-5">
                        <Plus className="w-5 h-5 absolute inset-0 transition-all duration-300 group-data-[state=open]:opacity-0 group-data-[state=open]:rotate-90" />
                        <X className="w-5 h-5 absolute inset-0 transition-all duration-300 opacity-0 rotate-90 group-data-[state=open]:opacity-100 group-data-[state=open]:rotate-0" />
                      </div>
                    </AccordionPrimitive.Trigger>
                  </AccordionPrimitive.Header>
                  <AccordionContent>
                    <div className="bg-green-50 p-5 rounded-lg ml-8 mb-2">
                      <p className="text-base leading-relaxed text-gray-600">
                        {fishInfo.funFact}
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>,
    overlayRoot
  );
};
