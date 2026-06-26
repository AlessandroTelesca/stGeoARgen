import React, { useRef, useEffect, useState } from 'react';
import { ARComponentBase } from '../ARComponentBase';
import { GyroARVisualizer } from '../../../ARbackend/GyroARVisualizer';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getSchwarzesTorTexts } from '../../../i18n/stations/schwarzesTor';
import * as THREE from 'three';

class PanoramaPlaneVisualizer extends GyroARVisualizer {
    private xMin = 0;
    private xMax = 0;
    private readonly planeZ = -5;

    constructor(
        container: HTMLDivElement,
        videoElement: HTMLVideoElement,
        options: { onError?: (e: unknown) => void } = {}
    ) {
        super(container, videoElement, options);
    }

    async init(): Promise<void> {
        await super.init();
    }

    setupPanoramaPlane(texture: THREE.Texture): void {
        if (!this.scene || !this.camera) return;
        this.setPanoramaBackground(null);
        this.scene.background = new THREE.Color(0x000000);
        const img = texture.image as { width?: number; height?: number } | null;
        const imageAspect = img?.width && img?.height ? img.width / img.height : 16 / 9;
        const fovRad = THREE.MathUtils.degToRad(this.camera.fov);
        const dist = Math.abs(this.planeZ);
        const planeHeight = 2 * dist * Math.tan(fovRad / 2);
        const planeWidth = planeHeight * imageAspect;
        const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
        const material = new THREE.MeshBasicMaterial({ map: texture, depthWrite: false });
        const plane = new THREE.Mesh(geometry, material);
        plane.position.set(0, 0, this.planeZ);
        this.scene.add(plane);
        this.camera.position.set(0, 0, 0);
        this.camera.rotation.set(0, 0, 0);
        this.camera.quaternion.identity();
        const screenHalfWidth = dist * Math.tan(Math.atan(this.camera.aspect * Math.tan(fovRad / 2)));
        const halfPlane = planeWidth / 2;
        this.xMin = -(halfPlane - screenHalfWidth);
        this.xMax = (halfPlane - screenHalfWidth);
    }

    protected animate = (): void => {
        this.animationId = requestAnimationFrame(this.animate);
        if (this.camera) {
            const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
            const yaw = euler.y;
            const sensitivity = Math.abs(this.planeZ) * 0.8;
            const targetX = THREE.MathUtils.clamp(-yaw * sensitivity, this.xMin, this.xMax);
            this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetX, 0.12);
            this.camera.position.y = 0;
            this.camera.position.z = 0;
            this.camera.rotation.set(0, 0, 0);
            this.camera.quaternion.identity();
        }
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    };
}

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
    visitedRooms?: Set<string>;
    currentStationId?: number;
    currentStationTitle?: string;
    currentStationPoints?: number;
    onCompleteStation?: (stationId: number) => void;
    isCurrentStationCompleted?: boolean;
    isGuestMode?: boolean;
    showCompleteButton?: boolean;
    ignoreCompleteTimer?: boolean;
};

const TOTAL_ROOMS = 4;

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
    visitedRooms = new Set(),
    currentStationId,
    currentStationTitle,
    currentStationPoints,
    onCompleteStation,
    isCurrentStationCompleted = false,
    isGuestMode = false,
    showCompleteButton = false,
    ignoreCompleteTimer = true,
}: ZeitreiseViewProps) => {
    const { language } = useLanguage();
    const texts = getSchwarzesTorTexts(language);

    const rooms = [
        { id: 'kueche',       label: texts.roomKueche,       image: '/images/360/schwarzesTor/küche.jpg',       thumb: '/images/schwarzesTor/image2.png' },
        { id: 'wohnraum',     label: texts.roomWohnraum,     image: '/images/360/schwarzesTor/wohnraum.jpg',     thumb: '/images/schwarzesTor/image4.png' },
        { id: 'scheune',      label: texts.roomScheune,      image: '/images/360/schwarzesTor/scheune.jpg',      thumb: '/images/schwarzesTor/image1.png' },
        { id: 'arbeitsstube', label: texts.roomArbeitsstube, image: '/images/360/schwarzesTor/arbeitsstube.jpg', thumb: '/images/schwarzesTor/image3.png' },
    ];

    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const sessionRef = useRef<PanoramaPlaneVisualizer | null>(null);
    const [hasStarted, setHasStarted] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isCompact, setIsCompact] = useState(false);

    // Eigene Inhalte ausblenden wenn ARStationCompletionDialog erscheint
    const [hideContent, setHideContent] = useState(false);

    useEffect(() => {
        let observer: MutationObserver | null = null;
        const timeout = window.setTimeout(() => {
            const progressContainer = document.querySelector('.ar-progress-container');
            if (!progressContainer) return;
            observer = new MutationObserver(() => {
                setIsCompact(progressContainer.classList.contains('ar-progress-container-compact'));
            });
            observer.observe(progressContainer, { attributes: true, attributeFilter: ['class'] });
            setIsCompact(progressContainer.classList.contains('ar-progress-container-compact'));
        }, 300);
        return () => { window.clearTimeout(timeout); observer?.disconnect(); };
    }, []);

    const handleExpand = () => {
        setIsCompact(false);
        const progressContainer = document.querySelector('.ar-progress-container') as HTMLElement | null;
        progressContainer?.click();
    };

    const bottomExpanded = 'calc(112px + max(24px, env(safe-area-inset-bottom)))';
    const bottomCompact  = 'calc(62px + max(24px, env(safe-area-inset-bottom)))';
    const bottomPos = isCompact ? bottomCompact : bottomExpanded;

    useEffect(() => {
        if (!hasStarted || !containerRef.current || !videoRef.current) return;
        let cancelled = false;
        setIsStarting(true);

        const start = async () => {
            try {
                const session = new PanoramaPlaneVisualizer(
                    containerRef.current!,
                    videoRef.current!,
                    { onError: (e) => console.error('[ZeitreiseView]', e) }
                );
                await session.init();
                if (cancelled) { session.stop(); return; }

                if (session['scene']) {
                    const helpers = (session['scene'] as THREE.Scene).children.filter(
                        (c) => c.type === 'GridHelper' || c.type === 'AxesHelper'
                    );
                    helpers.forEach((h) => (session['scene'] as THREE.Scene).remove(h));
                }

                const texture = await new Promise<THREE.Texture>((resolve, reject) => {
                    new THREE.TextureLoader().load(
                        '/images/schwarzesTor/schwarzesTor2.JPG',
                        (tex) => {
                            tex.colorSpace = THREE.SRGBColorSpace;
                            tex.minFilter = THREE.LinearFilter;
                            tex.magFilter = THREE.LinearFilter;
                            tex.generateMipmaps = false;
                            resolve(tex);
                        },
                        undefined,
                        reject
                    );
                });
                if (cancelled) { session.stop(); return; }
                session.setupPanoramaPlane(texture);
                sessionRef.current = session;
                setIsReady(true);
            } catch (err: any) {
                if (!cancelled) setError(err?.message ?? 'Fehler beim Laden');
            } finally {
                if (!cancelled) setIsStarting(false);
            }
        };

        void start();
        return () => {
            cancelled = true;
            sessionRef.current?.stop();
            sessionRef.current = null;
        };
    }, [hasStarted]);

    const btnStyle: React.CSSProperties = {
        pointerEvents: 'auto',
        border: '1px solid rgba(255,255,255,0.35)',
        borderRadius: '12px',
        padding: '10px 14px',
        background: 'rgba(15,25,10,0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        color: 'white',
        fontWeight: 700,
        fontSize: '0.85rem',
        cursor: 'pointer',
        boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
        whiteSpace: 'nowrap' as const,
    };

    return (
        <>
            <style>{`
                .ar-video { display: none !important; }
                .ar-topbar { display: none !important; }
                header.sticky { display: none !important; }
                .ar-container canvas { z-index: 1 !important; }
                .ar-container { z-index: 1 !important; }
                .ar-ui-overlay    { z-index: 20000 !important; }
                .ar-menu-backdrop { z-index: 20001 !important; position: fixed !important; }
                .ar-menu-panel    { z-index: 20002 !important; position: fixed !important; }
                .zt-room-btn { transition: transform 0.12s, box-shadow 0.12s; }
                .zt-room-btn:active { transform: scale(0.94) !important; }
                @media (orientation: landscape) {
                    .zt-infobox-outer { padding-top: 70px !important; }
                    .zt-infobox-inner { padding: 8px 14px !important; }
                    .zt-infobox-inner h1 { font-size: 0.95rem !important; margin-bottom: 2px !important; }
                    .zt-infobox-inner p { font-size: 0.72rem !important; margin: 0 !important; }
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
                currentStationId={currentStationId}
                currentStationTitle={currentStationTitle}
                currentStationPoints={currentStationPoints}
                onCompleteStation={onCompleteStation}
                isCurrentStationCompleted={isCurrentStationCompleted}
                isGuestMode={isGuestMode}
                showCompleteButton={showCompleteButton}
                ignoreCompleteTimer={ignoreCompleteTimer}
                onCompleteInitiated={() => setHideContent(true)}
            />

            {/* Start-Screen */}
            {!hasStarted && !error && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(0,0,0,0.75)' }}>
                    <div style={{ width: 'min(400px, 100%)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(15,25,10,0.8)', padding: '24px', textAlign: 'center', color: 'white' }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>{texts.zeitreiseStartTitle}</h2>
                        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.75)', marginBottom: '20px', lineHeight: 1.5 }}>{texts.zeitreiseStartDescription}</p>
                        <button onClick={() => setHasStarted(true)} style={{ width: '100%', border: 'none', borderRadius: '12px', padding: '14px', background: 'var(--color-primary)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '1rem' }}>
                            {texts.zeitreiseStartButtonLabel}
                        </button>
                    </div>
                </div>
            )}

            {/* Ladescreen */}
            {hasStarted && isStarting && !isReady && !error && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)' }}>
                    <div style={{ color: 'white', fontSize: '0.95rem', fontWeight: 600, textAlign: 'center' }}>{texts.zeitreiseLoading}</div>
                </div>
            )}

            {/* Fehlerscreen */}
            {error && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(0,0,0,0.85)' }}>
                    <div style={{ background: 'rgba(20,10,10,0.9)', border: '1px solid rgba(255,100,100,0.3)', borderRadius: '14px', padding: '20px', color: 'white', textAlign: 'center', maxWidth: '320px' }}>
                        <p style={{ marginBottom: '14px', fontSize: '0.9rem' }}>{error}</p>
                        <button onClick={onNavigateBack} style={{ border: 'none', borderRadius: '10px', padding: '10px 20px', background: 'var(--color-primary)', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
                            {texts.backButtonLabel}
                        </button>
                    </div>
                </div>
            )}

            {/* ZeitreiseView-Inhalte — ausblenden wenn Abschluss-Dialog erscheint */}
            {isReady && !hideContent && (
                <>
                    {/* Gradient */}
                    <div style={{ position: 'fixed', inset: 0, zIndex: 11, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.0) 22%, rgba(0,0,0,0.0) 60%, rgba(0,0,0,0.45) 100%)' }} />

                    {/* Info-Box oben */}
                    <div className="zt-infobox-outer" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 12, pointerEvents: 'none', padding: '120px 16px 0' }}>
                        <div className="zt-infobox-inner" style={{ pointerEvents: 'auto', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(200,210,200,0.22)', backdropFilter: 'blur(10px) grayscale(10%)', WebkitBackdropFilter: 'blur(10px) grayscale(10%)', padding: '16px 18px' }}>
                            <h1 style={{ margin: '0 0 8px', fontSize: '1.4rem', fontWeight: 800, color: 'white', textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}>
                                {texts.zeitreiseTitle}
                            </h1>
                            <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.5, color: 'white', textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}>
                                {texts.zeitreiseSubtitle}
                            </p>
                        </div>
                    </div>

                    {/* Raum-Counter */}
                    <div style={{
                        position: 'fixed', bottom: bottomPos, left: 0, right: 0,
                        zIndex: 13, pointerEvents: 'none',
                        display: 'flex', justifyContent: 'flex-start',
                        padding: '0 16px', transition: 'bottom 0.35s ease',
                    }}>
                        <button onClick={handleExpand} style={btnStyle}>
                            {visitedRooms.size}/{TOTAL_ROOMS} 
                        </button>
                    </div>

                    {/* Raum-Buttons */}
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        zIndex: 12,
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 'clamp(150px, 25vh, 200px) clamp(16px, 5vw, 32px) clamp(170px, 25vh, 220px)',
                    }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gridTemplateRows: '1fr 1fr',
                            gap: 'clamp(8px, 2.5vw, 16px)',
                            width: '100%',
                            height: '100%',
                            maxWidth: '360px',
                            maxHeight: '280px',
                            margin: '0 auto',
                        }}>
                            {rooms.map((room) => (
                                <button
                                    key={room.id}
                                    className={`zt-room-btn zt-room-btn-${room.id}`}
                                    onClick={() => onSelectRoom?.(room)}
                                    style={{
                                        pointerEvents: 'auto',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 'clamp(4px, 1vw, 8px)',
                                        padding: 'clamp(6px, 1.5vw, 10px)',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255,255,255,0.35)',
                                        background: visitedRooms.has(room.id)
                                            ? 'rgba(12,105,15,0.7)'
                                            : 'rgba(15,25,10,0.65)',
                                        backdropFilter: 'blur(8px)',
                                        WebkitBackdropFilter: 'blur(8px)',
                                        boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                                        cursor: 'pointer',
                                        width: '100%',
                                        height: '100%',
                                        boxSizing: 'border-box',
                                    }}
                                >
                                    <div style={{
                                        width: 'clamp(32px, 8vw, 52px)',
                                        height: 'clamp(32px, 8vw, 52px)',
                                        borderRadius: '8px',
                                        backgroundImage: `url('${room.thumb}')`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        flexShrink: 0,
                                        border: '1px solid rgba(255,255,255,0.2)',
                                    }} />
                                    <span style={{
                                        color: 'white',
                                        fontSize: 'clamp(0.7rem, 2.8vw, 0.9rem)',
                                        fontWeight: 700,
                                        textShadow: '0 1px 4px rgba(0,0,0,0.7)',
                                        textAlign: 'center',
                                        lineHeight: 1.2,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        width: '100%',
                                    }}>
                                        {room.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

export default ZeitreiseView;