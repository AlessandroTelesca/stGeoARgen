import React, { useRef, useEffect, useState } from 'react';
import { ARComponentBase } from '../ARComponentBase';
import { GyroARVisualizer } from '../../../ARbackend/GyroARVisualizer';
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
        const imageAspect = img?.width && img?.height
            ? img.width / img.height
            : 16 / 9;

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
};

// Buttons Rooms 
const rooms = [
    { id: 'kueche', label: 'Küche', image: '/images/360/schwarzesTor/küche.jpg', thumb: '/images/schwarzesTor/image2.png', top: '43%', left: '20%' },
    { id: 'wohnraum', label: 'Wohnraum', image: '/images/360/schwarzesTor/wohnraum.jpg', thumb: '/images/schwarzesTor/image4.png', top: '43%', left: '80%' },
    { id: 'scheune', label: 'Scheune', image: '/images/360/schwarzesTor/scheune.jpg', thumb: '/images/schwarzesTor/image1.png', top: '64%', left: '20%' },
    { id: 'arbeitsstube', label: 'Arbeitsstube', image: '/images/360/schwarzesTor/arbeitsstube.jpg', thumb: '/images/schwarzesTor/image3.png', top: '64%', left: '80%' },
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
    const sessionRef = useRef<PanoramaPlaneVisualizer | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!containerRef.current || !videoRef.current) return;
        let cancelled = false;

        const start = async () => {
            try {
                const session = new PanoramaPlaneVisualizer(
                    containerRef.current!,
                    videoRef.current!,
                    { onError: (e) => console.error('[ZeitreiseView]', e) }
                );
                await session.init();
                if (cancelled) { session.stop(); return; }

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
            }
        };

        void start();
        return () => {
            cancelled = true;
            sessionRef.current?.stop();
            sessionRef.current = null;
        };
    }, []);

    return (
        <>
            <style>{`
    .ar-video { display: none !important; }
    .ar-topbar { display: none !important; }
    header.sticky { display: none !important; }
    
    /* Canvas nach hinten — Overlays können drüber liegen */
    .ar-container canvas {
        z-index: 1 !important;
    }
    .ar-container {
        z-index: 1 !important;
    }
    
    .ar-menu-backdrop {
        z-index: 99998 !important;
        position: fixed !important;
        transform: translateZ(0) !important;
    }
    .ar-menu-panel {
        z-index: 99999 !important;
        position: fixed !important;
        transform: translateZ(0) !important;
    }
    .zt-room-btn {
        transition: transform 0.12s, box-shadow 0.12s;
    }
    .zt-room-btn:active {
        transform: translate(-50%, -50%) scale(0.94) !important;
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

            {/* Ladescreen */}
            {!isReady && !error && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 50,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.85)',
                }}>
                    <div style={{ color: 'white', fontSize: '0.95rem', fontWeight: 600, textAlign: 'center' }}>
                        <div style={{ marginBottom: '8px', fontSize: '1.5rem' }}>🕰️</div>
                        Zeitreise wird geladen…
                    </div>
                </div>
            )}

            {/* Fehlerscreen */}
            {error && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 50,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '24px', background: 'rgba(0,0,0,0.85)',
                }}>
                    <div style={{
                        background: 'rgba(20,10,10,0.9)', border: '1px solid rgba(255,100,100,0.3)',
                        borderRadius: '14px', padding: '20px', color: 'white',
                        textAlign: 'center', maxWidth: '320px',
                    }}>
                        <p style={{ marginBottom: '14px', fontSize: '0.9rem' }}>{error}</p>
                        <button onClick={onNavigateBack} style={{
                            border: 'none', borderRadius: '10px', padding: '10px 20px',
                            background: 'var(--color-primary)', color: 'white',
                            fontWeight: 700, cursor: 'pointer',
                        }}>Zurück</button>
                    </div>
                </div>
            )}

            {isReady && (
                <>
                    {/* Gradient oben + unten */}
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 11, pointerEvents: 'none',
                        background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.0) 22%, rgba(0,0,0,0.0) 60%, rgba(0,0,0,0.45) 100%)',
                    }} />

                    {/* ── Info-Box ── */}
                    <div style={{
                        position: 'fixed', top: 80, left: 0, right: 0,
                        zIndex: 12, pointerEvents: 'none',
                        padding: '80px 16px 0',
                    }}>
                        <div style={{
                            pointerEvents: 'auto',
                            borderRadius: '20px',
                            border: '1px solid rgba(255,255,255,0.3)',
                            background: 'rgba(200,210,200,0.22)',
                            backdropFilter: 'blur(10px) grayscale(10%)',
                            WebkitBackdropFilter: 'blur(10px) grayscale(10%)',
                            padding: '16px 18px',
                        }}>
                            <h1 style={{
                                margin: '0 0 8px',
                                fontSize: '1.4rem',
                                fontWeight: 800,
                                color: 'white',
                                textShadow: '0 2px 10px rgba(0,0,0,0.9)',
                            }}>
                                Zeitreise
                            </h1>
                            <p style={{
                                margin: 0,
                                fontSize: '0.92rem',
                                lineHeight: 1.5,
                                color: 'white',
                                textShadow: '0 1px 6px rgba(0,0,0,0.8)',
                            }}>
                                Bewege dein Handy und wähle einen Raum.
                            </p>
                        </div>
                    </div>

                    {/* ── Raum-Buttons auf der Hausfassade ── */}
                    <div style={{
                        position: 'fixed', inset: 0,
                        zIndex: 12, pointerEvents: 'none',
                    }}>
            {rooms.map((room) => (
    <button
        key={room.id}
        className="zt-room-btn"
        onClick={() => onSelectRoom?.(room)}
        style={{
            position: 'absolute',
            top: room.top,
            left: room.left,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 18px 12px 12px',
            borderRadius: '14px',
            border: '1px solid rgba(255,255,255,0.35)',
            background: 'rgba(255, 255, 255, 0.14)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
            cursor: 'pointer',
            maxWidth: '234px',
        }}
    >
        <div style={{
            width: '100px',
            height: '70px',
            borderRadius: '9px',
            backgroundImage: `url('${room.thumb}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            flexShrink: 0,
            border: '1px solid rgba(136, 136, 136, 0.42)',
        }} />
        <span style={{
            color: 'white',
            fontSize: '1.41rem',
            fontWeight: 700,
            textShadow: '0 1px 4px rgba(0,0,0,0.7)',
            textAlign: 'left',
            lineHeight: 1.2,
        }}>
            {room.label}
        </span>
    </button>
))}
                    </div>
                </>
            )}
        </>
    );
};

export default ZeitreiseView;