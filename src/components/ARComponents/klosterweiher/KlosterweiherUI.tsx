import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';

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

interface ReleaseFishButtonProps {
  overlayRoot: HTMLDivElement;
  onRelease: () => void;
}

export const ReleaseFishButton = ({ overlayRoot, onRelease }: ReleaseFishButtonProps) => {
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
        Bewege den fisch mit deinen Fingern!
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
        background: 'var(--color-white)',
        color: 'var(--color-gray-800)',
        borderRadius: '16px',
        boxShadow: '0 12px 28px rgba(0,0,0,0.4)',
        textAlign: 'center',
        animation: 'slideInDown 0.4s ease-out',
      }}
    >
      <p style={{ margin: '0 0 8px 0', fontWeight: 400, fontSize: '14px', letterSpacing: '0.5px' }}>
        Glückwunsch! Sie haben {article}
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

interface LearnMoreButtonProps {
  overlayRoot: HTMLDivElement;
  onLearnMore: () => void;
}

export const LearnMoreButton = ({ overlayRoot, onLearnMore }: LearnMoreButtonProps) => {
  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: '73%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10000,
        pointerEvents: 'auto',
      }}
    >
      <button
        onClick={onLearnMore}
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
        Ich will mehr über diesen Fisch erfahren!
      </button>
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

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 10001,
        pointerEvents: 'auto',
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            <p>Lade Informationen...</p>
          </div>
        ) : error || !fishInfo ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            <p>Informationen für diesen Fisch sind leider nicht verfügbar.</p>
            <button
              onClick={onClose}
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                borderRadius: '12px',
                border: 'none',
                background: 'var(--color-primary)',
                color: 'var(--color-white)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Schließen
            </button>
          </div>
        ) : (
          <>
            <div
              style={{
                background: 'var(--color-primary)',
                color: 'var(--color-white)',
                padding: '20px 24px',
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px',
              }}
            >
              <h2 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: 700 }}>
                {fishInfo.name}
              </h2>
              <p style={{ margin: 0, fontSize: '14px', fontStyle: 'italic', opacity: 0.9 }}>
                {fishInfo.scientificName}
              </p>
            </div>

            <div style={{ padding: '24px' }}>
              <p style={{ margin: '0 0 20px 0', fontSize: '15px', lineHeight: '1.6', color: '#333' }}>
                {fishInfo.description}
              </p>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 700, color: 'var(--color-primary)' }}>
                  Lebensraum
                </h3>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5', color: '#555' }}>
                  {fishInfo.habitat}
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 700, color: 'var(--color-primary)' }}>
                  Ernährung
                </h3>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5', color: '#555' }}>
                  {fishInfo.diet}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)' }}>
                    Größe
                  </h4>
                  <p style={{ margin: 0, fontSize: '14px', color: '#555' }}>{fishInfo.size}</p>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)' }}>
                    Gewicht
                  </h4>
                  <p style={{ margin: 0, fontSize: '14px', color: '#555' }}>{fishInfo.weight}</p>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 700, color: 'var(--color-primary)' }}>
                  Merkmale
                </h3>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', lineHeight: '1.6', color: '#555' }}>
                  {fishInfo.features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 700, color: 'var(--color-primary)' }}>
                  Lebenserwartung
                </h3>
                <p style={{ margin: 0, fontSize: '14px', color: '#555' }}>{fishInfo.lifespan}</p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 700, color: 'var(--color-primary)' }}>
                  Naturschutz
                </h3>
                <p style={{ margin: 0, fontSize: '14px', color: '#555' }}>{fishInfo.conservation}</p>
              </div>

              <div
                style={{
                  background: 'var(--color-green-50)',
                  padding: '16px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                }}
              >
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 700, color: 'var(--color-primary)' }}>
                  💡 Wussten Sie schon?
                </h3>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5', color: '#555' }}>
                  {fishInfo.funFact}
                </p>
              </div>

              <button
                onClick={onClose}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'var(--color-primary)',
                  color: 'var(--color-white)',
                  fontWeight: 700,
                  fontSize: '16px',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-primary-light)',
                }}
              >
                Schließen
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    overlayRoot
  );
};
