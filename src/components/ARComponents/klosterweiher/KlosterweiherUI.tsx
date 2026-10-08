import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from '@/components/ui/sheet';
import { Accordion, AccordionItem, AccordionContent } from '@/components/ui/accordion';
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { Plus, X, Info } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getKlosterweiherTexts } from '../../../i18n/stations/klosterweiher';

// Fish gender mapping for correct German articles
const FISH_GENDERS: Record<string, 'male' | 'female' | 'neuter'> = {
  'Rotauge': 'neuter',    // das Rotauge
  'Zander': 'male',       // der Zander
  'Doebel': 'male',       // der Döbel
  'Forelle': 'female',    // die Forelle
  'Neunauge': 'neuter',   // das Neunauge
  'Schleie': 'female',    // die Schleie
  'Rotfeder': 'female',   // die Rotfeder
  'Stichling': 'male',    // der Stichling
  'Karpfen': 'male',      // der Karpfen
};

// Model names are German, but English JSON files use translated filenames.
const EN_FISH_FILE_MAP: Record<string, string> = {
  Doebel: 'Chub',
  Forelle: 'Trout',
  Karpfen: 'Carp',
  Neunauge: 'Lamprey',
  Rotauge: 'Roach',
  Rotfeder: 'Rudd',
  Schleie: 'Tench',
  Stichling: 'Stickleback',
  Zander: 'Zander',
};

const getFishInfoFileName = (fishName: string, language: 'de' | 'en'): string => {
  if (language === 'en') {
    return EN_FISH_FILE_MAP[fishName] || fishName;
  }
  return fishName;
};

interface TapInstructionGIFProps {
  overlayRoot: HTMLDivElement;
}

export const TapInstructionGIF = ({ overlayRoot }: TapInstructionGIFProps) => {
  const { language } = useLanguage();
  const klosterweiherTexts = getKlosterweiherTexts(language);

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10002,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <img
        src="/TapOnScreen.gif"
        alt={klosterweiherTexts.tapInstruction}
        style={{
          width: '80px',
          height: '80px',
          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
        }}
      />
      <p
        style={{
          margin: 0,
          color: 'var(--color-white)',
          fontSize: '14px',
          fontWeight: 600,
          textShadow: '0 2px 8px rgba(0,0,0,0.8)',
        }}
      >
        {klosterweiherTexts.tapInstruction}
      </p>
    </div>,
    overlayRoot
  );
};

interface DragInstructionGIFProps {
  overlayRoot: HTMLDivElement;
}

export const DragInstructionGIF = ({ overlayRoot }: DragInstructionGIFProps) => {
  const { language } = useLanguage();
  const klosterweiherTexts = getKlosterweiherTexts(language);

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: '45%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10002,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <img
        src="/dragAnimation.gif"
        alt={klosterweiherTexts.dragInstruction}
        style={{
          width: '240px',
          height: '240px',
          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
        }}
      />
      <p
        style={{
          position: 'absolute',
          top: '75%',
          margin: 0,
          color: 'var(--color-white)',
          fontSize: '14px',
          fontWeight: 600,
          textShadow: '0 2px 8px rgba(0,0,0,0.8)',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          zIndex: 10003,
        }}
      >
        {klosterweiherTexts.dragInstruction}
      </p>
    </div>,
    overlayRoot
  );
};

const getArticle = (fishName: string, language: 'de' | 'en'): string => {
  if (language === 'en') return 'a';

  const gender = FISH_GENDERS[fishName] || 'male';
  switch (gender) {
    case 'male':
      return 'einen';
    case 'female':
      return 'eine';
    case 'neuter':
      return 'ein';
    default:
      return 'einen';
  }
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
  const { language } = useLanguage();
  const klosterweiherTexts = getKlosterweiherTexts(language);

  return createPortal(
    <div className="fixed left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10003] w-[calc(100%-32px)] max-w-[420px] ar-glass rounded-[24px] px-6 py-5 text-center shadow-2xl pointer-events-none flex items-center gap-3 text-left" style={{ top: '20%' }}>
      <span className="w-9 h-9 flex-shrink-0 rounded-full border-[3px] border-white/25 border-t-white animate-spin" aria-hidden="true" />
      <p className="m-0 font-semibold text-[15px] leading-snug">{klosterweiherTexts.waitingForGround}</p>
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
  const { language } = useLanguage();
  const klosterweiherTexts = getKlosterweiherTexts(language);

  return createPortal(
    <div className="fixed left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10003] w-[calc(100%-32px)] max-w-[420px] ar-glass rounded-[24px] px-6 py-5 text-center shadow-2xl pointer-events-auto flex flex-col gap-4" style={{ top: '30%' }}>
      <p className="m-0 font-semibold text-[15px] leading-snug">{klosterweiherTexts.waitingForReadyPrompt}</p>
      {modelsLoaded ? (
        <button
          onClick={onReady}
          className="min-h-[52px] rounded-2xl bg-primary hover:bg-primary-light text-white font-bold shadow-primary transition-colors pressable"
        >
          {klosterweiherTexts.waitingForReadyButton}
        </button>
      ) : (
        <p className="m-0 flex items-center justify-center gap-2 text-sm text-white/75">
          <span className="w-4 h-4 rounded-full border-2 border-white/25 border-t-white animate-spin" aria-hidden="true" />
          {klosterweiherTexts.waitingForReadyLoading}
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
  const { language } = useLanguage();
  const klosterweiherTexts = getKlosterweiherTexts(language);

  return createPortal(
    <div className="fixed left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10003] w-[calc(100%-32px)] max-w-[420px] ar-glass rounded-[24px] px-6 py-5 text-center shadow-2xl pointer-events-auto flex flex-col gap-4" style={{ top: '50%' }}>
      <span className="mx-auto w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-lg">
        <img src="/Logo.svg" alt="" className="w-8 h-8 object-contain" />
      </span>
      <p className="m-0 font-semibold text-[15px] leading-relaxed">{klosterweiherTexts.fishingInstruction}</p>
      <button
        onClick={onStart}
        className="min-h-[54px] rounded-2xl bg-primary hover:bg-primary-light text-white font-bold shadow-primary transition-colors pressable"
      >
        {klosterweiherTexts.fishingStartButton}
      </button>
    </div>,
    overlayRoot
  );
};

interface FishActionButtonsProps {
  overlayRoot: HTMLDivElement;
  onRelease: () => void;
  onLearnMore: () => void;
  isChest?: boolean;
  isBusy?: boolean;
}

export const FishActionButtons = ({ overlayRoot, onRelease, onLearnMore, isChest = false, isBusy = false }: FishActionButtonsProps) => {
  const { language } = useLanguage();
  const klosterweiherTexts = getKlosterweiherTexts(language);

  return createPortal(
    <div className="ar-fish-action-row" style={{ zIndex: 10003 }}>
      <button className="ar-fish-btn-tertiary" onClick={onRelease} disabled={isBusy}>
        {isChest ? klosterweiherTexts.treasureActionCollect : klosterweiherTexts.fishActionRelease}
      </button>
      <button className="ar-fish-btn-secondary" onClick={onLearnMore}>
        <Info style={{ width: '16px', height: '16px' }} />
        {klosterweiherTexts.fishActionLearnMore}
      </button>
    </div>,
    overlayRoot
  );
};

interface FishCaughtDialogProps {
  overlayRoot: HTMLDivElement;
  fishName: string;
  isChest?: boolean;
}

export const FishCaughtDialog = ({ overlayRoot, fishName, isChest = false }: FishCaughtDialogProps) => {
  const { language } = useLanguage();
  const klosterweiherTexts = getKlosterweiherTexts(language);
  const article = getArticle(fishName, language);

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: '18%',
        left: '20px',
        right: '20px',
        transform: 'translateY(-50%)',
        zIndex: 10003,
        pointerEvents: 'auto',
        padding: '24px 20px',
        background: 'var(--color-white)',
        color: 'var(--color-gray-800)',
        borderRadius: '16px',
        boxShadow: '0 12px 28px rgba(0,0,0,0.4)',
        textAlign: 'center',
        animation: 'slideInDown 0.4s ease-out',
        boxSizing: 'border-box',
        minHeight: isChest ? '150px' : undefined,
      }}
    >
      {isChest ? (
        <>
          <div className="ar-chest-sparkles" aria-hidden="true">
            {Array.from({ length: 10 }).map((_, index) => (
              <span key={index} className="ar-chest-sparkle" />
            ))}
          </div>
          <p style={{ margin: '0 0 10px 0', fontWeight: 700, fontSize: '22px', color: 'var(--color-primary)', lineHeight: 1.25 }}>
            {klosterweiherTexts.treasureFoundTitle}
          </p>
          <p style={{ margin: '0', fontWeight: 500, fontSize: '15px', letterSpacing: '0.4px' }}>
            {klosterweiherTexts.treasureFoundPoints}
          </p>
        </>
      ) : (
        <>
          <p style={{ margin: '0 0 8px 0', fontWeight: 400, fontSize: '14px', letterSpacing: '0.5px' }}>
            {klosterweiherTexts.fishCaughtPrefix.replace('{article}', article)}
          </p>
          <p style={{ margin: '0', fontWeight: 700, fontSize: '28px', color: 'var(--color-primary)' }}>
            {fishName}
          </p>
          <p style={{ margin: '8px 0 0 0', fontWeight: 400, fontSize: '14px', letterSpacing: '0.5px' }}>
            {klosterweiherTexts.fishCaughtSuffix}
          </p>
        </>
      )}
    </div>,
    overlayRoot
  );
};

interface FishInfoPopupProps {
  overlayRoot: HTMLDivElement;
  fishName: string;
  onClose: () => void;
  isChest?: boolean;
}

interface FishInfoPopupWebXRProps {
  overlayRoot: HTMLDivElement;
  fishName: string;
  onClose: () => void;
  isChest?: boolean;
}

export const FishInfoPopup = ({ overlayRoot, fishName, onClose, isChest = false }: FishInfoPopupProps) => {
  const { language } = useLanguage();
  const klosterweiherTexts = getKlosterweiherTexts(language);
  const fishInfoBasePath = language === 'en' ? '/fish_information_en' : '/fish_Information';
  const fishInfoFileName = getFishInfoFileName(fishName, language);
  const [fishInfo, setFishInfo] = useState<FishInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (isChest) {
      setLoading(false);
      setError(false);
      setFishInfo(null);
      return;
    }

    const loadFishInfo = async () => {
      try {
        setLoading(true);
        setError(false);
        const response = await fetch(`${fishInfoBasePath}/${fishInfoFileName}.json`);
        if (!response.ok) {
          throw new Error('Fish info not found');
        }
        const data = await response.json();
        setFishInfo(data);
      } catch (err) {
        console.error(`Failed to load fish info for ${fishInfoFileName}:`, err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadFishInfo();
  }, [fishInfoBasePath, fishInfoFileName, isChest]);

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
          zIndex: 10004,
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
        }}
      >
        {/* Bottom Sheet Indicator */}
        <div className="w-full flex justify-center pt-4 pb-3">
          <div className="w-16 h-1.5 bg-gray-400 rounded-full" />
        </div>

        {/* Header - Always rendered for accessibility */}
        <SheetHeader className="px-8 pb-6 pt-2 relative">
          <SheetTitle className="text-3xl font-bold text-primary">
            {isChest
              ? klosterweiherTexts.treasureInfoTitle
              : fishInfo?.name || klosterweiherTexts.fishInfoTitleFallback}
          </SheetTitle>
          <SheetDescription className="text-base italic opacity-80 mt-1">
            {isChest
              ? klosterweiherTexts.treasureFoundPoints
              : fishInfo?.scientificName || klosterweiherTexts.fishScientificNameFallback}
          </SheetDescription>
          <SheetClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
            <X className="h-5 w-5" />
            <span className="sr-only">{klosterweiherTexts.close}</span>
          </SheetClose>
        </SheetHeader>

        {isChest ? (
          <div className="h-full flex flex-col overflow-hidden pb-6">
            <div className="flex-1 overflow-y-auto px-8 py-2">
              <p className="mb-8 text-lg leading-relaxed text-gray-700">
                {klosterweiherTexts.treasureInfoStory}
              </p>
            </div>
          </div>
        ) : loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            <p className="text-lg">{klosterweiherTexts.fishInfoLoading}</p>
          </div>
        ) : error || !fishInfo ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            <p className="text-lg">{klosterweiherTexts.fishInfoUnavailable}</p>
          </div>
        ) : (
          <div className="h-full flex flex-col overflow-hidden pb-6">
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
                      <span>{klosterweiherTexts.fishInfoHabitat}</span>
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
                      <span>{klosterweiherTexts.fishInfoDiet}</span>
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
                      <span>{klosterweiherTexts.fishInfoDimensions}</span>
                      <div className="relative w-5 h-5">
                        <Plus className="w-5 h-5 absolute inset-0 transition-all duration-300 group-data-[state=open]:opacity-0 group-data-[state=open]:rotate-90" />
                        <X className="w-5 h-5 absolute inset-0 transition-all duration-300 opacity-0 rotate-90 group-data-[state=open]:opacity-100 group-data-[state=open]:rotate-0" />
                      </div>
                    </AccordionPrimitive.Trigger>
                  </AccordionPrimitive.Header>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-4 pl-8 pb-2">
                      <div>
                        <h4 className="text-base font-semibold text-primary mb-2">{klosterweiherTexts.fishInfoSize}</h4>
                        <p className="text-base text-gray-600">{fishInfo.size}</p>
                      </div>
                      <div>
                        <h4 className="text-base font-semibold text-primary mb-2">{klosterweiherTexts.fishInfoWeight}</h4>
                        <p className="text-base text-gray-600">{fishInfo.weight}</p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Merkmale */}
                <AccordionItem value="features" className="border-b-0">
                  <AccordionPrimitive.Header className="flex">
                    <AccordionPrimitive.Trigger className="flex flex-1 items-center justify-between text-lg font-semibold text-primary hover:no-underline py-5 group">
                      <span>{klosterweiherTexts.fishInfoFeatures}</span>
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
                      <span>{klosterweiherTexts.fishInfoLifespan}</span>
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
                      <span>{klosterweiherTexts.fishInfoConservation}</span>
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
                      <span>{klosterweiherTexts.fishInfoFunFact}</span>
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

export const FishInfoPopupWebXR = ({ overlayRoot, fishName, onClose, isChest = false }: FishInfoPopupWebXRProps) => {
  const { language } = useLanguage();
  const klosterweiherTexts = getKlosterweiherTexts(language);
  const fishInfoBasePath = language === 'en' ? '/fish_information_en' : '/fish_Information';
  const fishInfoFileName = getFishInfoFileName(fishName, language);
  const [fishInfo, setFishInfo] = useState<FishInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isChest) {
      setLoading(false);
      setError(false);
      setFishInfo(null);
      return;
    }

    const loadFishInfo = async () => {
      try {
        setLoading(true);
        setError(false);
        const response = await fetch(`${fishInfoBasePath}/${fishInfoFileName}.json`);
        if (!response.ok) {
          throw new Error('Fish info not found');
        }
        const data = await response.json();
        setFishInfo(data);
      } catch (err) {
        console.error(`Failed to load fish info for ${fishInfoFileName}:`, err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadFishInfo();
  }, [fishInfoBasePath, fishInfoFileName, isChest]);

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10004,
        background: 'rgba(0, 0, 0, 0.55)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '92vh',
          background: 'var(--color-white)',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          boxShadow: '0 -8px 28px rgba(0,0,0,0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px 0' }}>
          <div style={{ width: '56px', height: '6px', borderRadius: '999px', background: '#c5c7cb' }} />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px 12px 20px',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--color-primary)' }}>
              {isChest
                ? klosterweiherTexts.treasureInfoTitle
                : fishInfo?.name || klosterweiherTexts.fishInfoTitleFallback}
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: 0.75, fontStyle: 'italic' }}>
              {isChest
                ? klosterweiherTexts.treasureFoundPoints
                : fishInfo?.scientificName || klosterweiherTexts.fishScientificNameFallback}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: '28px',
              lineHeight: 1,
              padding: '4px 8px',
              cursor: 'pointer',
              color: '#555',
            }}
            aria-label={klosterweiherTexts.close}
          >
            ×
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: '18px 20px 28px 20px' }}>
          {isChest ? (
            <p style={{ margin: 0, lineHeight: 1.6, color: '#374151' }}>
              {klosterweiherTexts.treasureInfoStory}
            </p>
          ) : loading ? (
            <p style={{ margin: 0, color: '#666' }}>{klosterweiherTexts.fishInfoLoading}</p>
          ) : error || !fishInfo ? (
            <p style={{ margin: 0, color: '#666' }}>
              {klosterweiherTexts.fishInfoUnavailable}
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              <p style={{ margin: 0, lineHeight: 1.5, color: '#374151' }}>{fishInfo.description}</p>
              <p style={{ margin: 0, lineHeight: 1.5 }}><strong>{klosterweiherTexts.fishInfoHabitat}:</strong> {fishInfo.habitat}</p>
              <p style={{ margin: 0, lineHeight: 1.5 }}><strong>{klosterweiherTexts.fishInfoDiet}:</strong> {fishInfo.diet}</p>
              <p style={{ margin: 0, lineHeight: 1.5 }}><strong>{klosterweiherTexts.fishInfoSize}:</strong> {fishInfo.size}</p>
              <p style={{ margin: 0, lineHeight: 1.5 }}><strong>{klosterweiherTexts.fishInfoWeight}:</strong> {fishInfo.weight}</p>
              <p style={{ margin: 0, lineHeight: 1.5 }}><strong>{klosterweiherTexts.fishInfoLifespan}:</strong> {fishInfo.lifespan}</p>
              <p style={{ margin: 0, lineHeight: 1.5 }}><strong>{klosterweiherTexts.fishInfoConservation}:</strong> {fishInfo.conservation}</p>
              <div>
                <p style={{ margin: '0 0 8px 0', lineHeight: 1.5 }}><strong>{klosterweiherTexts.fishInfoFeatures}:</strong></p>
                <ul style={{ margin: 0, paddingLeft: '20px', display: 'grid', gap: '6px' }}>
                  {fishInfo.features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>
              <div
                style={{
                  background: '#ecfdf5',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  lineHeight: 1.5,
                }}
              >
                <strong>{klosterweiherTexts.fishInfoFunFact}</strong> {fishInfo.funFact}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    overlayRoot
  );
};
