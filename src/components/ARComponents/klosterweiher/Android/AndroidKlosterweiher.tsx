import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ARComponentBase } from '../../ARComponentBase';
import { ARProximityGate } from '../../ARProximityGate';
import { WebXRVisualizer } from '../../../../ARbackend/WebXRVisualizer';
import { AR_VIEW_STATION_MAP } from '../../../../data/stationsConfig';
import { KlosterweiherARSessionBase } from '../KlosterweiherARSessionBase';
import { WaitingForGroundDetection, FishingInstructions, ReleaseFishButton } from '../KlosterweiherUI';


interface ARViewProps {
  onNavigateHome?: () => void;
  username?: string | null;
  onLogin?: () => void;
  onLogout?: () => void;
  onNavigateProfile?: () => void;
}

class AndroidKlosterweiherARSession extends WebXRVisualizer {
  public onGroundDetectedCallback?: () => void;

  // Properties from KlosterweiherARSessionBase
  protected rodUrl = new URL('./../models/Angel.glb', import.meta.url).href;
  protected fishUrls = [
    new URL('./../models/Rotauge.glb', import.meta.url).href,
  ];
  protected waterUrl = new URL('./../models/Wasser.glb', import.meta.url).href;
  public fish: THREE.Object3D | null = null;
  public fishes: THREE.Object3D[] = [];
  protected fishMixers: THREE.AnimationMixer[] = [];
  protected fishAnimations: THREE.AnimationClip[][] = [];
  public rod: THREE.Object3D | null = null;
  public water: THREE.Object3D | null = null;
  public currentFishIndex = 0;
  protected cameraLight: THREE.PointLight | null = null;
  public tapCount = 0;
  public hasCaughtFish = false;
  public onFishCaught?: () => void;
  public onFishReleased?: () => void;

  // Platform-specific position overrides for Android
  protected getRodInitialPositionX(): number { return 5.5; }
  protected getRodCaughtPositionX(): number { return 9; }
  protected getRodCaughtDuration(): number { return 1; }
  protected getRodReleaseDuration(): number { return 1; }
  protected getFishInitialPositionY(): number { return -100; }
  protected getFishInitialPositionZ(): number { return -1500; }
  protected getFishCaughtPositionY1(): number { return 3; }
  protected getFishCaughtPositionZ1(): number { return -500; }
  protected getFishCaughtPositionY2(): number { return -5; }
  protected getFishCaughtPositionZ2(): number { return -500; }

  // Import shared methods from base
  controlrod = KlosterweiherARSessionBase.prototype.controlrod;
  catchfish = KlosterweiherARSessionBase.prototype.catchfish;
  releaseCurrentFish = KlosterweiherARSessionBase.prototype.releaseCurrentFish;
  protected playCurrentFishAnimation = KlosterweiherARSessionBase.prototype['playCurrentFishAnimation'];
  protected updateFishMixers = KlosterweiherARSessionBase.prototype['updateFishMixers'];

  protected initThree(): void {
    super.initThree();

    // Create and attach a light to the camera that follows it
    this.cameraLight = new THREE.PointLight(0xffffff, 1.5, 100);
    this.cameraLight.position.set(0, 2, 5);
    this.cameraLight.parent = this.camera;
    this.loadGLTFModel(this.rodUrl, {
      position: new THREE.Vector3(3, -6, -20),
      rotation: new THREE.Euler(0, Math.PI, 0),
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
      this.loadGLTFModelWithAnimations(fishUrl, {
        position: new THREE.Vector3(0, -100, -1500),
        rotation: new THREE.Euler(0, Math.PI / 2, 0),
        scale: 3,
      }).then(({ scene, animations }) => {
        const fishModel = scene || null;
        if (fishModel) {
          fishModel.parent = this.camera;
          fishModel.visible = false;
          this.fishes.push(fishModel);
          this.fishAnimations.push(animations || []);
          this.fishMixers.push(new THREE.AnimationMixer(fishModel));
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
        this.water.traverse((child) => {
          if (child instanceof THREE.Mesh)
          child.material.opacity = 0.02
        });
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
      this.water.visible = false; //Change to true if water should be visible
    }
    
    console.log('Ground plane scanned and detected! Fishing rod and fish placed.');
    this.onGroundDetectedCallback?.();
  }

  protected handlePointer(clientX: number, clientY: number): void {
    // Only allow rod control after ground is detected via WebXR
    if (!this.isGroundDetected) {
      console.log('Waiting for ground plane detection...');
      return;
    }

    this.controlrod();
  }

  protected onXRFrameUpdate(deltaSeconds: number): void {
    this.updateFishMixers(deltaSeconds);
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
  const [showFishingInstructions, setShowFishingInstructions] = useState(false);
  const [waitingForGroundDetection, setWaitingForGroundDetection] = useState(false);

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
      session.onGroundDetectedCallback = () => {
        setWaitingForGroundDetection(false);
        setShowFishingInstructions(true);
      };

      await session.init(); // Must be called from user gesture to satisfy WebXR security
      console.log('[KlosterweiherView] AR session initialized');
      sessionRef.current = session;
      setHasStarted(true);
      setWaitingForGroundDetection(true);
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

      {waitingForGroundDetection && overlayRootRef.current && (
        <WaitingForGroundDetection overlayRoot={overlayRootRef.current} />
      )}

      {showFishingInstructions && overlayRootRef.current && (
        <FishingInstructions 
          overlayRoot={overlayRootRef.current}
          onStart={() => setShowFishingInstructions(false)}
        />
      )}

      {fishCaught && overlayRootRef.current && (
        <ReleaseFishButton 
          overlayRoot={overlayRootRef.current}
          onRelease={() => sessionRef.current?.releaseCurrentFish()}
        />
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
