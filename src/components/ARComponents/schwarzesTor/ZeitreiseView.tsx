import React, { useRef } from 'react';
import { ARComponentBase } from '../ARComponentBase';

type ZeitreiseViewProps = {
    onNavigateBack?: () => void;
    onSelectRoom?: (room: { id: string; label: string; image: string }) => void;
    username?: string | null;
    onLogin?: () => void;
    onLogout?: () => void;
    onNavigateProfile?: () => void;
    onRegister?: () => void;
    completedStations?: number;
    totalStations?: number;
    totalPoints?: number;
};

const rooms = [
    { id: 'kueche', label: 'Küche', image: '/images/360/schwarzesTor/küche.jpg', top: '49%', left: '30%', thumb: '/images/schwarzesTor/image2.png' },
    { id: 'wohnraum', label: 'Wohnraum', image: '/images/360/schwarzesTor/wohnraum.jpg', top: '49%', left: '65%', thumb: '/images/schwarzesTor/image4.png' },
    { id: 'scheune', label: 'Scheune', image: '/images/360/schwarzesTor/scheune.jpg', top: '58%', left: '30%', thumb: '/images/schwarzesTor/image1.png' },
    { id: 'arbeitsstube', label: 'Arbeitsstube', image: '/images/360/schwarzesTor/arbeitsstube.jpg', top: '58%', left: '65%', thumb: '/images/schwarzesTor/image3.png' },
];

export const ZeitreiseView = ({
    onNavigateBack,
    onSelectRoom,
    username,
    onLogin,
    onLogout,
    onNavigateProfile,
    onRegister,
    completedStations,
    totalStations,
    totalPoints,
}: ZeitreiseViewProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    return (
        <>
            <style>{`
    .ar-video { display: none !important; }
    .ar-topbar { display: none !important; }
    header.sticky { display: none !important; }
    .ar-container {
        background-image: url('/images/schwarzesTor/schwarzesTor2.JPG') !important;
        background-size: contain !important;
        background-position: center !important;
        background-repeat: no-repeat !important;
        background-color: transparent !important;
    }
    
    }
            `}</style>

            <ARComponentBase
                onNavigateHome={onNavigateBack}
                closeARViewKey="closeZeitreiseView"
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
                showCompleteButton={false}
                ignoreCompleteTimer={true}
            />

            {/* Zeitreise Card */}
            <div style={{
                position: 'fixed',
                top: 70,
                left: 0,
                right: 0,
                zIndex: 100,
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                paddingTop: '88px',
                paddingBottom: '88px',
                paddingLeft: '20px',
                paddingRight: '20px',
            }}>
                <div style={{
                    pointerEvents: 'auto',
                    width: 'min(520px, 100%)',
                    borderRadius: '16px',
                    border: '1px solid rgba(0, 0, 0, 0.35)',
                    background: 'rgba(90, 90, 90, 0.24)',
                    backdropFilter: 'blur(6px) grayscale(16%)',
                    WebkitBackdropFilter: 'blur(6px) grayscale(16%)',
                    padding: '14px',
                }}>
                    <h1 style={{
                        fontSize: '1.4rem',
                        fontWeight: 800,
                        marginBottom: '30px',
                        color: 'var(--color-white)',
                        textShadow: '0 2px 8px rgba(0,0,0,0.85)',
                    }}>
                        Zeitreise
                    </h1>
                    <p style={{
                        fontSize: '0.95rem',
                        lineHeight: 1.5,
                        marginBottom: '16px',
                        color: 'var(--color-white)',
                        textShadow: '0 2px 8px rgba(0,0,0,0.75)',
                    }}>
                        Wähle einen Raum:
                    </p>
                </div>
            </div>

            {/* Raum-Buttons auf dem Bild */}
            <div style={{ position: 'fixed', inset: 0, zIndex: 10003, pointerEvents: 'none' }}>
                {rooms.map((room) => (
                    <button
                        key={room.id}
                        onClick={() => onSelectRoom?.(room)}
                        style={{
                            position: 'absolute',
                            top: room.top,
                            left: room.left,
                            transform: 'translate(-50%, -50%)',
                            pointerEvents: 'auto',
                            width: '120px',
                            height: '60px',
                            borderRadius: '5px',
                            backgroundImage: `url('${room.thumb}')`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 5px 12px rgba(255,255,255,0.4)',
                            overflow: 'hidden',
                            padding: 0,
                        }}
                    >
                        <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'rgba(0,0,0,0.5)',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            padding: '4px 6px',
                            textAlign: 'center',
                        }}>
                            {room.label}
                        </div>
                    </button>
                ))}
            </div>
        </>
    );
};

export default ZeitreiseView;