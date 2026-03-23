import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Accordion, AccordionItem, AccordionContent } from '@/components/ui/accordion';
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { Plus, X, Info } from 'lucide-react';

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

interface TapInstructionGIFProps {
  overlayRoot: HTMLDivElement;
}

export const TapInstructionGIF = ({ overlayRoot }: TapInstructionGIFProps) => {
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
        alt="Tap on screen"
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
        Tippen Sie auf den Bildschirm
      </p>
    </div>,
    overlayRoot
  );
};

interface DragInstructionGIFProps {
  overlayRoot: HTMLDivElement;
}

export const DragInstructionGIF = ({ overlayRoot }: DragInstructionGIFProps) => {
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
        alt="Drag to rotate fish"
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
        Wische um den Fisch zu drehen
      </p>
    </div>,
    overlayRoot
  );
};

const getArticle = (fishName: string): string => {
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
  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: '20%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10003,
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
      Richten sie ihre kamera auf den See um mit dem Angeln zu beginnen
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
  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: '30%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10003,
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
        Richten sie ihre Kamera auf den See, um mit dem Angeln zu beginnen.
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
          Ich sehe den See
        </button>
      ) : (
        <p style={{ margin: 0, fontWeight: 400, fontSize: '14px', opacity: 0.8 }}>
          Laden...
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
  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10003,
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
        Tippen sie mehrmals auf ihren bildschirm um zu Angeln
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
        Mit dem Angeln beginnen
      </button>
    </div>,
    overlayRoot
  );
};

interface FishActionButtonsProps {
  overlayRoot: HTMLDivElement;
  onRelease: () => void;
  onLearnMore: () => void;
}

export const FishActionButtons = ({ overlayRoot, onRelease, onLearnMore }: FishActionButtonsProps) => {
  return createPortal(
    <div className="ar-fish-action-row" style={{ zIndex: 10003 }}>
      <button className="ar-fish-btn-tertiary" onClick={onRelease}>
        Freilassen
      </button>
      <button className="ar-fish-btn-secondary" onClick={onLearnMore}>
        <Info style={{ width: '16px', height: '16px' }} />
        Mehr Infos
      </button>
    </div>,
    overlayRoot
  );
};

interface FishCaughtDialogProps {
  overlayRoot: HTMLDivElement;
  fishName: string;
}

export const FishCaughtDialog = ({ overlayRoot, fishName }: FishCaughtDialogProps) => {
  const article = getArticle(fishName);

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
      }}
    >
      <p style={{ margin: '0 0 8px 0', fontWeight: 400, fontSize: '14px', letterSpacing: '0.5px' }}>
        Glückwunsch! Du hast {article}
      </p>
      <p style={{ margin: '0', fontWeight: 700, fontSize: '28px', color: 'var(--color-primary)' }}>
        {fishName}
      </p>
      <p style={{ margin: '8px 0 0 0', fontWeight: 400, fontSize: '14px', letterSpacing: '0.5px' }}>
        gefangen!
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
  const [fishInfo, setFishInfo] = useState<FishInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const loadFishInfo = async () => {
      try {
        setLoading(true);
        setError(false);
        const response = await fetch(`/fish_Information/${fishName}.json`);
        if (!response.ok) {
          throw new Error('Fish info not found');
        }
        const data = await response.json();
        setFishInfo(data);
      } catch (err) {
        console.error(`Failed to load fish info for ${fishName}:`, err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadFishInfo();
  }, [fishName]);

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
        <SheetHeader className="px-8 pb-6 pt-2">
          <SheetTitle className="text-3xl font-bold text-primary">
            {fishInfo?.name || 'Fisch Information'}
          </SheetTitle>
          <SheetDescription className="text-base italic opacity-80 mt-1">
            {fishInfo?.scientificName || 'Wissenschaftlicher Name'}
          </SheetDescription>
        </SheetHeader>

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
                      <span>Wussten Sie schon?</span>
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
