import React, { useRef, useEffect, useState } from 'react';
import { ARComponentBase } from '../ARComponentBase';
import { GyroARVisualizer } from '../../../ARbackend/GyroARVisualizer';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getSchwarzesTorTexts } from '../../../i18n/stations/schwarzesTor';
import * as THREE from 'three';
import { ARStartCard } from '../ARStartCard';
import { asset } from '../../../lib/asset';

class PanoramaPlaneVisualizer extends GyroARVisualizer {
    private xMin = 0;
    private xMax = 0;
    private readonly planeZ = -5;
    private manualX: number | null = null;

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

    setCameraX(x: number): void {
        this.manualX = THREE.MathUtils.clamp(x, this.xMin, this.xMax);
        if (this.camera) this.camera.position.x = this.manualX;
    }

    clearManualX(): void { this.manualX = null; }
    getCameraX(): number { return this.camera?.position.x ?? 0; }
    getXBounds(): { xMin: number; xMax: number } { return { xMin: this.xMin, xMax: this.xMax }; }

    projectToScreen(position3D: THREE.Vector3): { x: number; y: number; visible: boolean } {
        if (!this.camera || !this.renderer) return { x: 0, y: 0, visible: false };
        const canvas = this.renderer.domElement;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;

        // Kamera verschiebt sich horizontal → position3D relativ zur Kamera-X korrigieren
        const fovRad = THREE.MathUtils.degToRad(this.camera.fov);
        const screenWidthAtZ = 2 * Math.abs(this.planeZ) * Math.tan(fovRad / 2) * this.camera.aspect;
        const pixelsPerUnit = w / screenWidthAtZ;
        const cameraOffsetPx = this.camera.position.x * pixelsPerUnit;

        const projected = position3D.clone().project(this.camera);
        const rawX = (projected.x * 0.5 + 0.5) * w;
        const rawY = (-projected.y * 0.5 + 0.5) * h;

        // Korrektur: Kamera-Verschiebung rausrechnen, dann Bild-Offset addieren
        const x = rawX - cameraOffsetPx;
        const y = rawY;

        // Sichtbar nur wenn auf dem Bildschirm (mit Puffer)
        const padding = 80;
        const visible = x > -padding && x < w + padding && y > -padding && y < h + padding;

        return { x, y, visible };
    }

    protected animate = (): void => {
        this.animationId = requestAnimationFrame(this.animate);
        if (this.manualX !== null) {
            if (this.camera) {
                this.camera.position.x = this.manualX;
                this.camera.position.y = 0;
                this.camera.position.z = 0;
                this.camera.rotation.set(0, 0, 0);
                this.camera.quaternion.identity();
            }
        } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (this as any).updateCameraFromGyro();
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
const IS_DEV = import.meta.env.DEV;

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
        { id: 'kueche',       label: texts.roomKueche,       image: asset('/images/360/schwarzesTor/küche.jpg'),       thumb: asset('/images/schwarzesTor/image2.webp'), position3D: new THREE.Vector3(-1.75,  0.75, -5) },
        { id: 'wohnraum',     label: texts.roomWohnraum,     image: asset('/images/360/schwarzesTor/wohnraum.jpg'),     thumb: asset('/images/schwarzesTor/image4.webp'), position3D: new THREE.Vector3( 1.75,  0.75, -5) },
        { id: 'scheune',      label: texts.roomScheune,      image: asset('/images/360/schwarzesTor/scheune.jpg'),      thumb: asset('/images/schwarzesTor/image1.webp'), position3D: new THREE.Vector3(-1.75, -1.25, -5) },
        { id: 'arbeitsstube', label: texts.roomArbeitsstube, image: asset('/images/360/schwarzesTor/arbeitsstube.jpg'), thumb: asset('/images/schwarzesTor/image3.webp'), position3D: new THREE.Vector3( 1.75, -1.25, -5) },
    ];

    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const sessionRef = useRef<PanoramaPlaneVisualizer | null>(null);
    const roomPosAnimRef = useRef<number | null>(null);

    const [hasStarted, setHasStarted] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isCompact, setIsCompact] = useState(false);
    const [hideContent, setHideContent] = useState(false);
    const [roomScreenPositions, setRoomScreenPositions] = useState<{ x: number; y: number; visible: boolean }[]>([]);

    const [btnSize, setBtnSize] = useState(100);
    useEffect(() => {
        const updateSize = () => {
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const smaller = Math.min(vw, vh);
            setBtnSize(Math.min(140, Math.max(80, smaller * 1.15))); 
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        window.addEventListener('orientationchange', updateSize);
        return () => {
            window.removeEventListener('resize', updateSize);
            window.removeEventListener('orientationchange', updateSize);
        };
    }, []);

    const [debugX, setDebugX] = useState(0);
    const [debugBounds, setDebugBounds] = useState({ xMin: -5, xMax: 5 });
    const [showDebug, setShowDebug] = useState(false);
    const [gyroActive, setGyroActive] = useState(true);

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

    useEffect(() => {
        if (!isReady || !sessionRef.current) return;
        const bounds = sessionRef.current.getXBounds();
        setDebugBounds(bounds);
        setDebugX(0);
    }, [isReady]);

    useEffect(() => {
        if (!isReady) return;
        const update = () => {
            if (!sessionRef.current) return;
            const positions = rooms.map((room) =>
                sessionRef.current!.projectToScreen(room.position3D)
            );
            setRoomScreenPositions(positions);
            roomPosAnimRef.current = requestAnimationFrame(update);
        };
        roomPosAnimRef.current = requestAnimationFrame(update);
        return () => { if (roomPosAnimRef.current) cancelAnimationFrame(roomPosAnimRef.current); };
    }, [isReady]);

    const handleExpand = () => {
        setIsCompact(false);
        const progressContainer = document.querySelector('.ar-progress-container') as HTMLElement | null;
        progressContainer?.click();
    };

    const handleDebugSlider = (value: number) => {
        setDebugX(value);
        sessionRef.current?.setCameraX(value);
    };

    const toggleGyro = () => {
        if (gyroActive) { sessionRef.current?.setCameraX(debugX); setGyroActive(false); }
        else { sessionRef.current?.clearManualX(); setGyroActive(true); }
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
                const session = new PanoramaPlaneVisualizer(containerRef.current!, videoRef.current!, { onError: (e) => console.error('[ZeitreiseView]', e) });
                await session.init();
                if (cancelled) { session.stop(); return; }
                if (session['scene']) {
                    const helpers = (session['scene'] as THREE.Scene).children.filter((c) => c.type === 'GridHelper' || c.type === 'AxesHelper');
                    helpers.forEach((h) => (session['scene'] as THREE.Scene).remove(h));
                }
                const texture = await new Promise<THREE.Texture>((resolve, reject) => {
                    new THREE.TextureLoader().load(asset('/images/schwarzesTor/schwarzesTor2.JPG'), (tex) => {
                        tex.colorSpace = THREE.SRGBColorSpace;
                        tex.minFilter = THREE.LinearFilter;
                        tex.magFilter = THREE.LinearFilter;
                        tex.generateMipmaps = false;
                        resolve(tex);
                    }, undefined, reject);
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
        return () => { cancelled = true; sessionRef.current?.stop(); sessionRef.current = null; };
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

    const labelFontSize = `${Math.max(9, btnSize * 0.11)}px`;

    // Button-Breite und -Höhe: rechteckig im 16:9 Format
    const btnW = btnSize;
const btnH = Math.round(btnSize * 0.85);        // ← statt 0.75, etwas höher
const thumbW = Math.round(btnW * 0.92);         // ← statt 0.88, breiter
const thumbH = Math.round(thumbW * 0.56);       // 16:9 bleibt

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
                .zt-room-btn:active { transform: translate(-50%, -50%) scale(0.94) !important; }
                .zt-infobox-outer { padding: 150px 12px 0; }
                .zt-infobox-inner { padding: 12px 14px; isolation: auto; }
                .zt-infobox-inner h1 { font-size: clamp(1rem, 4vw, 1.4rem); margin-bottom: 4px; }
                .zt-infobox-inner p  { font-size: clamp(0.75rem, 2.5vw, 0.92rem); margin: 0; }
                @media (max-height: 600px) {
                    .zt-infobox-outer { padding-top: 60px !important; }
                    .zt-infobox-inner { padding: 6px 12px !important; }
                    .zt-infobox-inner h1 { font-size: 0.9rem !important; margin-bottom: 2px !important; }
                    .zt-infobox-inner p  { font-size: 0.7rem !important; }
                }
                @media (orientation: landscape) {
                    .zt-infobox-outer { padding-top: 70px !important; }
                    .zt-infobox-inner { padding: 6px 12px !important; }
                    .zt-infobox-inner h1 { font-size: 0.9rem !important; margin-bottom: 2px !important; }
                    .zt-infobox-inner p  { font-size: 0.7rem !important; margin: 0 !important; }
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

            {!hasStarted && !error && (
                <ARStartCard
                    zIndex={30000}
                    title={texts.zeitreiseStartTitle}
                    description={texts.zeitreiseStartDescription}
                    buttonLabel={texts.zeitreiseStartButtonLabel}
                    onStart={() => setHasStarted(true)}
                />
            )}

            {hasStarted && isStarting && !isReady && !error && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 30000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)' }}>
                    <div style={{ color: 'white', fontSize: '0.95rem', fontWeight: 600, textAlign: 'center' }}>{texts.zeitreiseLoading}</div>
                </div>
            )}

            {error && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 30000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(0,0,0,0.85)' }}>
                    <div style={{ background: 'rgba(20,10,10,0.9)', border: '1px solid rgba(255,100,100,0.3)', borderRadius: '14px', padding: '20px', color: 'white', textAlign: 'center', maxWidth: '320px' }}>
                        <p style={{ marginBottom: '14px', fontSize: '0.9rem' }}>{error}</p>
                        <button onClick={onNavigateBack} style={{ border: 'none', borderRadius: '10px', padding: '10px 20px', background: 'var(--color-primary)', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
                            {texts.backButtonLabel}
                        </button>
                    </div>
                </div>
            )}

            {isReady && !hideContent && (
                <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 11, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.0) 22%, rgba(0,0,0,0.0) 60%, rgba(0,0,0,0.45) 100%)' }} />

                    <div className="zt-infobox-outer" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 12, pointerEvents: 'none' }}>
                        <div className="zt-infobox-inner" style={{ pointerEvents: 'auto', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(15,25,15,0.60)' }}>
                            <h1 style={{ margin: '0 0 4px', color: 'white', fontWeight: 800, textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}>{texts.zeitreiseTitle}</h1>
                            <p style={{ margin: 0, color: 'white', textShadow: '0 1px 6px rgba(0,0,0,0.8)', lineHeight: 1.4 }}>{texts.zeitreiseSubtitle}</p>
                        </div>
                    </div>

                    <div style={{ position: 'fixed', bottom: bottomPos, left: 0, right: 0, zIndex: 13, pointerEvents: 'none', display: 'flex', justifyContent: 'flex-start', padding: '0 16px', transition: 'bottom 0.35s ease' }}>
                        <button onClick={handleExpand} style={btnStyle}>
                            {visitedRooms.size}/{TOTAL_ROOMS}
                        </button>
                    </div>

                    {isCurrentStationCompleted && (
                        <div style={{ position: 'fixed', bottom: bottomPos, right: '16px', zIndex: 13 }}>
                            <button onClick={onNavigateBack} style={{ border: 'none', borderRadius: '32px', padding: '12px 20px', background: 'var(--color-primary)', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(0,0,0,0.3)' }}>
                                ✓ {language === 'de' ? 'Station abgeschlossen — Zur Startseite' : 'Station completed — Go Home'}
                            </button>
                        </div>
                    )}

                    {IS_DEV && (
                        <div style={{ position: 'fixed', top: '50%', right: '8px', transform: 'translateY(-50%)', zIndex: 19999, pointerEvents: 'auto' }}>
                            <button onClick={() => setShowDebug(v => !v)} style={{ background: 'rgba(255,200,0,0.9)', border: 'none', borderRadius: '8px', padding: '6px 10px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', marginBottom: showDebug ? '6px' : 0, display: 'block', width: '100%' }}>🎛 Debug</button>
                            {showDebug && (
                                <div style={{ background: 'rgba(0,0,0,0.9)', borderRadius: '12px', padding: '12px', color: 'white', width: '170px', fontSize: '0.75rem' }}>
                                    <p style={{ margin: '0 0 4px', fontWeight: 700 }}>Kamera X</p>
                                    <input type="range" min={debugBounds.xMin} max={debugBounds.xMax} step={0.001} value={debugX} onChange={(e) => handleDebugSlider(Number(e.target.value))} style={{ width: '100%', marginBottom: '6px', cursor: 'pointer' }} />
                                    <p style={{ margin: '0 0 8px', opacity: 0.75, lineHeight: 1.6 }}>x = <strong>{debugX.toFixed(3)}</strong><br/>min = {debugBounds.xMin.toFixed(3)}<br/>max = {debugBounds.xMax.toFixed(3)}</p>
                                    <div style={{ display: 'grid', gap: '4px' }}>
                                        <button onClick={() => handleDebugSlider(0)} style={{ border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px', padding: '4px', background: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', fontSize: '0.75rem' }}>← Mitte →</button>
                                        <button onClick={() => handleDebugSlider(debugBounds.xMin)} style={{ border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px', padding: '4px', background: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', fontSize: '0.75rem' }}>← Links (min)</button>
                                        <button onClick={() => handleDebugSlider(debugBounds.xMax)} style={{ border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px', padding: '4px', background: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', fontSize: '0.75rem' }}>Rechts (max) →</button>
                                        <button onClick={toggleGyro} style={{ border: 'none', borderRadius: '6px', padding: '5px', background: gyroActive ? 'rgba(12,105,15,0.8)' : 'rgba(180,50,50,0.8)', color: 'white', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, marginTop: '4px' }}>
                                            Gyro: {gyroActive ? '✓ AN' : '✗ AUS'}
                                        </button>
                                    </div>
                                    <p style={{ margin: '8px 0 4px', fontWeight: 700, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '8px' }}>Button-Pos</p>
                                    {roomScreenPositions.map((pos, i) => (
                                        <p key={i} style={{ margin: '2px 0', opacity: 0.7, fontSize: '0.7rem' }}>
                                            {rooms[i]?.id}: {pos.visible ? `${Math.round(pos.x)}, ${Math.round(pos.y)}` : 'aus'}
                                        </p>
                                    ))}
                                    <p style={{ margin: '6px 0 2px', opacity: 0.7, fontSize: '0.7rem' }}>btnSize: {Math.round(btnSize)}px</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Raum-Buttons — rechteckig, fixed an 3D-Position */}
                    <div style={{ position: 'fixed', inset: 0, zIndex: 12, pointerEvents: 'none' }}>
                        {rooms.map((room, index) => {
                            const pos = roomScreenPositions[index];
                            if (!pos?.visible) return null;

                            const vw = window.innerWidth;
                            const vh = window.innerHeight;
                            const halfW = btnW / 2 + 6;
                            const halfH = btnH / 2 + 6;
                            const topSafe = Math.max(halfH, 124);
                            const botSafe = Math.max(halfH, 150);
                            const cx = Math.max(halfW, Math.min(vw - halfW, pos.x));
                            const cy = Math.max(topSafe, Math.min(vh - botSafe, pos.y));

                            return (
                                <button
                                    key={room.id}
                                    className={`zt-room-btn zt-room-btn-${room.id}`}
                                    onClick={() => onSelectRoom?.(room)}
                                    style={{
                                        position: 'absolute',
                                        left: cx,
                                        top: cy,
                                        transform: 'translate(-50%, -50%)',
                                        pointerEvents: 'auto',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'flex-start',
                                        gap: `${Math.max(5, btnSize * 0.1)}px`,
                                        padding: `${Math.max(8, btnSize * 0.01)}px ${Math.max(10, btnSize * 0.01)}px`,
                                        width: `${btnW}px`,
                                        height: `${btnH}px`,
                                        borderRadius: '14px',
                                        border: visitedRooms.has(room.id)
                                            ? '2px solid var(--color-primary)'
                                            : '1px solid rgba(255,255,255,0.45)',
                                        background: visitedRooms.has(room.id)
                                            ? 'rgba(12,105,15,0.82)'
                                            : 'rgba(15,25,15,0.72)',
                                        boxShadow: visitedRooms.has(room.id)
                                            ? '0 6px 18px rgba(12,105,15,0.45)'
                                            : '0 6px 18px rgba(0,0,0,0.45)',
                                        cursor: 'pointer',
                                        boxSizing: 'border-box',
                                        overflow: 'hidden',
                                    }}
                                >
                                    {/* Thumbnail — 16:9 */}
                                    <div style={{ position: 'relative', width: `${thumbW}px`, height: `${thumbH}px`, flexShrink: 0 }}>
                                        <div style={{
                                            width: '100%',
                                            height: '100%',
                                            borderRadius: '8px',
                                            backgroundImage: `url('${room.thumb}')`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                            border: '1px solid rgba(255,255,255,0.2)',
                                        }} />
                                        {visitedRooms.has(room.id) && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '-5px',
                                                right: '-5px',
                                                width: `${Math.max(14, btnSize * 0.16)}px`,
                                                height: `${Math.max(14, btnSize * 0.16)}px`,
                                                borderRadius: '50%',
                                                background: 'var(--color-primary)',
                                                border: '2px solid white',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                                fontSize: `${Math.max(8, btnSize * 0.09)}px`,
                                                fontWeight: 800,
                                                boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
                                            }}>✓</div>
                                        )}
                                    </div>
                                    {/* Label */}
                                    <span style={{
                                        color: 'white',
                                        fontSize: labelFontSize,
                                        fontWeight: 700,
                                        textAlign: 'center',
                                        lineHeight: 1.15,
                                        width: '100%',
                                        textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                                        wordBreak: 'break-word',
                                        hyphens: 'auto',
                                    }}>
                                        {room.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </>
    );
};

export default ZeitreiseView;