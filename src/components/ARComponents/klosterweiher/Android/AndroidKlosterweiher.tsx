import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as THREE from 'three';
import { ARComponentBase } from '../../ARComponentBase';
import { ARProximityGate } from '../../ARProximityGate';
import { WebXRVisualizer } from '../../../../ARbackend/WebXRVisualizer';
import { AR_VIEW_STATION_MAP } from '../../../../data/stationsConfig';
import gsap from 'gsap';


interface ARViewProps {
  onNavigateHome?: () => void;
  username?: string | null;
  onLogin?: () => void;
  onLogout?: () => void;
  onNavigateProfile?: () => void;
}

class AndroidKlosterweiherARSession extends WebXRVisualizer {
  // You can override methods or add custom functionality here
  // For example:
  // private initThree(): void {
  //   super.initThree();
  //   // Add custom Klosterweiher-specific 3D objects
  // }

  private rodUrl = new URL('./../models/Angel.glb', import.meta.url).href;
  private fishUrls = [
    new URL('./../models/Forelle.glb', import.meta.url).href,
    new URL('./../models/Neunauge.glb', import.meta.url).href,
    new URL('./../models/Zander.glb', import.meta.url).href,
    new URL('./../models/Schleie.glb', import.meta.url).href,
    new URL('./../models/Döbel.glb', import.meta.url).href,
    new URL('./../models/Rotauge.glb', import.meta.url).href,
    new URL('./../models/Rotfeder.glb', import.meta.url).href,
    new URL('./../models/Stichling.glb', import.meta.url).href,
    new URL('./../models/Karpfen.glb', import.meta.url).href,
  ];
  private waterUrl = new URL('./../models/Wasser.glb', import.meta.url).href;

  public fish: THREE.Object3D | null = null;
  public fishes: THREE.Object3D[] = [];
  public rod: THREE.Object3D | null = null;
  public water: THREE.Object3D | null = null;
  public currentFishIndex = 0;

  public tapCount = 0;
  public hasCaughtFish = false;
  public onFishCaught?: () => void;
  public onFishReleased?: () => void;

  protected initThree(): void {
    super.initThree();

    // Add rod model (initially hidden)
    this.loadGLTFModel(this.rodUrl, {
      position: new THREE.Vector3(5.5, -6, -6),
      rotation: new THREE.Euler(-1, 0, 0),
      scale: 1.2,
    }).then((model) => {
      this.rod = model || null;
      if (this.rod) {
        this.rod.parent = this.camera
        this.rod.visible = false; // Hide until ground is detected
      }
    }).catch((err) => console.error('Rod model failed to load', err));

    // Load all fish models
    this.fishUrls.forEach((fishUrl, index) => {
      this.loadGLTFModel(fishUrl, {
        position: new THREE.Vector3(0, -100, -100),
        rotation: new THREE.Euler(0, Math.PI / 2, 0),
        scale: 3,
      }).then((model) => {
        const fishModel = model || null;
        if (fishModel) {
          fishModel.parent = this.camera;
          fishModel.visible = false;
          this.fishes.push(fishModel);
          if (index === 0) {
            this.fish = fishModel; // Set first fish as current
          }
        }
      }).catch((err) => console.error(`Fish model ${index} failed to load`, err));
    });

    // Add water model
    this.loadGLTFModel(this.waterUrl, {
      scale: 10,
    }).then((model) =>{
      this.water = model || null;
            if (this.water) {
        this.water.visible = false;
      }
    }).catch((err) => console.error('Water model failed to load', err));
  }

  // Override to handle WebXR ground detection automatically
  protected onGroundDetected(): void {
    if (this.rod) {
      this.rod.visible = true;
    }
    
    // Place water on the ground
    if (this.water) {
      this.water.position.y = -500;
      this.water.scale.x = 20;
      this.water.scale.z = 20;
      this.water.visible = true;
    }
    
    console.log('Ground plane scanned and detected! Fishing rod and fish placed.');
  }

  protected handlePointer(clientX: number, clientY: number): void {
    // Only allow rod control after ground is detected via WebXR
    if (!this.isGroundDetected) {
      console.log('Waiting for ground plane detection...');
      return;
    }

    this.controlrod();
  }

  controlrod() {
    if (!this.rod) return;
    if (this.hasCaughtFish) return; // Wait for release before next catch
    const tl = gsap.timeline()

    this.tapCount += 1;
    if (this.tapCount >= 5) {
      this.catchfish();
    }

    tl.to(this.rod.rotation, {
      x: -0.8,
      duration: 0.5,
    });

    tl.to(this.rod.rotation, {
      x: -1.1,
      duration: 0.5,
      delay: 0.5,
    });

    tl.to(this.rod.rotation, {
      x: -1,
      duration: 0.5,
      delay: 0.5,
    });
  }

  catchfish() {
    if (!this.fish) return;
    if (!this.rod) return;
    const tl = gsap.timeline()

    gsap.to(this.fish.rotation, {
      y: Math.PI * 8 + Math.PI / 2,
      duration: 4,
    });

    gsap.to(this.rod.position, {
      x: 8,
      duration: 1,
    });

    this.fish.visible = true;

    tl.to(this.rod.rotation, {
      x: 0,
      duration: 0.5,
      delay: 2,
    })
    .to(this.fish.position, {
      y: 5,
      z: -30,
      duration: 0.5,
    })
    .to(this.fish.position, {
      y: 0,
      z: -30,
      duration: 0.3,
      onComplete: () => {
        this.hasCaughtFish = true;
        this.onFishCaught?.();
      }
    });

  }

  releaseCurrentFish() {
    if (!this.fish) return;
    this.fish.visible = false;
    this.fish.position.set(0, -100, -100);
    this.fish.rotation.set(0, Math.PI / 2, 0);

    // Select random fish
    this.currentFishIndex = Math.floor(Math.random() * this.fishes.length);
    this.fish = this.fishes[this.currentFishIndex];

    this.tapCount = 0;
    this.hasCaughtFish = false;
    this.onFishReleased?.();

    if(this.rod)
    gsap.to(this.rod.position, {
      x: 5.5,
      duration: 1,
    });
  }


}

export const AndroidKlosterweiherView = ({ onNavigateHome, username, onLogin, onLogout, onNavigateProfile }: ARViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRootRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<AndroidKlosterweiherARSession | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fishCaught, setFishCaught] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sessionRef.current?.stop();
    };
  }, []);

  const startAR = async () => {
    if (!containerRef.current || !overlayRootRef.current || isStarting || hasStarted) return;
    setIsStarting(true);
    setError(null);

    try {
      console.log('[KlosterweiherView] Initializing AR session...');
      const session = new AndroidKlosterweiherARSession(
        containerRef.current,
        {
          useWebXR: true,
          domOverlayRoot: overlayRootRef.current,
          onError: (e) => console.error('AR init failed', e),
        }
      );

      session.onFishCaught = () => setFishCaught(true);
      session.onFishReleased = () => setFishCaught(false);

      await session.init(); // Must be called from user gesture to satisfy WebXR security
      console.log('[KlosterweiherView] AR session initialized');
      sessionRef.current = session;
      setHasStarted(true);
    } catch (e: any) {
      const msg = e?.message || 'Failed to start AR';
      setError(msg);
      console.error('[KlosterweiherView] AR start failed', e);
    } finally {
      setIsStarting(false);
    }
  };

  const arContent = (
    <>
      <ARComponentBase
        onNavigateHome={onNavigateHome}
        closeARViewKey="closeARView"
        containerRef={containerRef as React.RefObject<HTMLDivElement>}
        videoRef={null as any}
        overlayRootRef={overlayRootRef}
        username={username}
        onLogin={onLogin}
        onLogout={onLogout}
        onNavigateProfile={onNavigateProfile}
      />

      {isAuthorized && !hasStarted && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            background: 'rgba(0,0,0,0.5)',
            pointerEvents: 'auto',
          }}
        >
          <div
            style={{
              padding: '16px',
              background: '#fff',
              borderRadius: '12px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
              minWidth: '240px',
              textAlign: 'center',
            }}
          >
            <p style={{ margin: '0 0 12px 0', fontWeight: 700 }}>Start AR to scan the ground</p>
            {error && <p style={{ color: '#b00020', margin: '0 0 8px 0' }}>{error}</p>}
            <button
              onClick={startAR}
              disabled={isStarting}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                background: '#0c690f',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {isStarting ? 'Starting...' : 'Start AR'}
            </button>
          </div>
        </div>
      )}

      {fishCaught && overlayRootRef.current && createPortal(
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
            onClick={() => sessionRef.current?.releaseCurrentFish()}
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
            Release the fish
          </button>
        </div>,
        overlayRootRef.current
      )}
    </>
  );

  // Wrap with Proximity Gate - checks if user is within 100m of station
  return (
    <ARProximityGate
      stationId={AR_VIEW_STATION_MAP['klosterweiher']}
      stationName="Klosterweiher"
      onNavigateBack={onNavigateHome}
      onAccessGranted={() => setIsAuthorized(true)}
    >
      {arContent}
    </ARProximityGate>
  );
};
