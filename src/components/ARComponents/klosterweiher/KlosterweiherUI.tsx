import { createPortal } from 'react-dom';

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
        zIndex: 10000,
        pointerEvents: 'none',
        padding: '20px 28px',
        background: 'rgba(12, 105, 15, 0.95)',
        color: '#fff',
        borderRadius: '12px',
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
        top: '20%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10000,
        pointerEvents: 'auto',
        padding: '20px 28px',
        background: 'rgba(12, 105, 15, 0.95)',
        color: '#fff',
        borderRadius: '12px',
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
            borderRadius: '8px',
            border: 'none',
            background: '#fff',
            color: '#0c690f',
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
        top: '20%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10000,
        pointerEvents: 'auto',
        padding: '20px 28px',
        background: 'rgba(12, 105, 15, 0.95)',
        color: '#fff',
        borderRadius: '12px',
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
          borderRadius: '8px',
          border: 'none',
          background: '#fff',
          color: '#0c690f',
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

interface ReleaseFishButtonProps {
  overlayRoot: HTMLDivElement;
  onRelease: () => void;
}

export const ReleaseFishButton = ({ overlayRoot, onRelease }: ReleaseFishButtonProps) => {
  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: '66%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10000,
        pointerEvents: 'auto',
      }}
    >
      <button
        onClick={onRelease}
        style={{
          padding: '12px 18px',
          borderRadius: '10px',
          border: 'none',
          background: '#0c690f',
          color: '#fff',
          fontWeight: 700,
          boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
          cursor: 'pointer',
        }}
      >
        Fisch wieder freilassen
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
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
        pointerEvents: 'none',
        padding: '24px 32px',
        background: 'rgba(12, 105, 15, 0.95)',
        color: '#fff',
        borderRadius: '16px',
        boxShadow: '0 12px 28px rgba(0,0,0,0.4)',
        textAlign: 'center',
        animation: 'slideInDown 0.4s ease-out',
      }}
    >
      <p style={{ margin: '0 0 8px 0', fontWeight: 400, fontSize: '14px', letterSpacing: '0.5px' }}>
        Glückwunsch! Sie haben {article}
      </p>
      <p style={{ margin: '0', fontWeight: 700, fontSize: '28px', color: '#fff' }}>
        {fishName}
      </p>
      <p style={{ margin: '8px 0 0 0', fontWeight: 400, fontSize: '14px', letterSpacing: '0.5px' }}>
        gefangen!
      </p>
    </div>,
    overlayRoot
  );
};
