import React, { useState, useRef } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getSchwarzesTorTexts } from '../../../i18n/stations/schwarzesTor';
import { MobileOnlyNotice } from '../MobileOnlyNotice';
import { ZeitreiseView } from './ZeitreiseView';
import { PanoramaView } from './PanoramaView';
import { ARComponentBase } from '../ARComponentBase';

interface SchwarzesTorViewProps {
  onNavigateHome?: () => void;
  username?: string | null;
  onLogin?: () => void;
  onLogout?: () => void;
  onNavigateProfile?: () => void;
  onRegister?: () => void;
  completedStations?: number;
  totalStations?: number;
  totalPoints?: number;
  currentStationPoints?: number;
  onCompleteStation?: (stationId: number) => void;
  isCurrentStationCompleted?: boolean;
  isGuestMode?: boolean;
}

export const SchwarzesTorView = ({
  onNavigateHome,
  username,
  onLogin,
  onLogout,
  onNavigateProfile,
  onRegister,
  completedStations,
  totalStations,
  totalPoints,
  currentStationPoints = 0,
  onCompleteStation,
  isCurrentStationCompleted = false,
  isGuestMode = false,
}: SchwarzesTorViewProps) => {
  const { language } = useLanguage();
  const texts = getSchwarzesTorTexts(language);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isNotMobile = !isIOS && !isAndroid;

  // Dummy-Refs — wie in PhonomuseumView, kein echter Kamera-Stream
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [showZeitreise, setShowZeitreise] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<{ id: string; label: string; image: string } | null>(null);

  if (isNotMobile) return <MobileOnlyNotice />;

  if (selectedRoom) {
    return (
      <PanoramaView
        imageUrl={selectedRoom.image}
        roomLabel={selectedRoom.label}
        roomId={selectedRoom.id}
        onNavigateBack={() => setSelectedRoom(null)}
      />
    );
  }

  if (showZeitreise) {
    return (
      <ZeitreiseView
        onNavigateBack={() => setShowZeitreise(false)}
        onSelectRoom={(room) => setSelectedRoom(room)}
      />
    );
  }

  return (
    <>
      <style>{`
      .ar-container {
        background-image: url('/images/schwarzesTor.JPG') !important;
        background-size: cover !important;
        background-position: center !important;
        background-repeat: no-repeat !important;
      }
    `}</style>

      <ARComponentBase
        onNavigateHome={onNavigateHome}
        closeARViewKey="closeSchwarzesTorView"
        containerRef={containerRef as React.RefObject<HTMLDivElement>}
        videoRef={videoRef as React.RefObject<HTMLVideoElement>}
        username={username}
        onLogin={onLogin}
        onLogout={onLogout}
        onNavigateProfile={onNavigateProfile}
        onRegister={onRegister}
        completedStations={completedStations}
        totalStations={totalStations}
        totalPoints={totalPoints}
        currentStationId={1}
        currentStationTitle={texts.stationName}
        currentStationPoints={currentStationPoints}
        onCompleteStation={onCompleteStation}
        isCurrentStationCompleted={isCurrentStationCompleted}
        isGuestMode={isGuestMode}
        showCompleteButton={true}
        ignoreCompleteTimer={true}
      />

      {/* Content als fixed Overlay — genau wie Quiz-Panel in PhonomuseumView */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10003,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: '88px',
          paddingBottom: '88px',
          paddingLeft: '20px',
          paddingRight: '20px',
        }}
      >
        <div
          style={{
            pointerEvents: 'auto',
            width: 'min(520px, 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.35)',
            background: 'rgba(228, 232, 236, 0.24)',
            backdropFilter: 'blur(6px) grayscale(16%)',
            WebkitBackdropFilter: 'blur(6px) grayscale(16%)',
            padding: '14px',
            color: 'white',
          }}
        >
          <h1
            style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              marginBottom: '10px',
              color: 'var(--color-white)',
              textShadow: '0 2px 8px rgba(0,0,0,0.85)',
            }}
          >
            {texts.stationName}
          </h1>
          <p
            style={{
              fontSize: '0.95rem',
              lineHeight: 1.5,
              marginBottom: '16px',
              color: 'var(--color-white)',
              textShadow: '0 2px 8px rgba(0,0,0,0.75)',
            }}
          >
            {texts.longDescription}
          </p>

          <div style={{ display: 'grid', gap: '10px' }}>
            <button
              onClick={() => setShowZeitreise(true)}
              style={{
                border: 'none',
                borderRadius: '12px',
                padding: '12px 14px',
                background: 'var(--color-primary)',
                color: 'var(--color-white)',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.95rem',
                width: '100%',
              }}
            >
              Zeitreise starten!
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SchwarzesTorView;