import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ARComponentBase } from '../../ARComponentBase';
import { ARProximityGate } from '../../ARProximityGate';
import { ARVisualizer } from '../../../../ARbackend/ARVisualizer';
import { AR_VIEW_STATION_MAP } from '../../../../data/stationsConfig';
import { KlosterweiherARSessionBase } from '../KlosterweiherARSessionBase';
import { WaitingForReady, FishingInstructions, ReleaseFishButton } from '../KlosterweiherUI';

interface ARViewProps {
  onNavigateHome?: () => void;
  username?: string | null;
  onLogin?: () => void;
  onLogout?: () => void;
  onNavigateProfile?: () => void;
}

class IOSKlosterweiherARSession extends ARVisualizer {
  public onReadyCallback?: () => void;

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
  private lastFrameTime: number = 0;

  // Platform-specific position overrides for iOS
  protected getRodInitialPositionX(): number { return 3; }
  protected getRodCaughtPositionX(): number { return 6; }
  protected getRodCaughtDuration(): number { return 0.6; }
  protected getRodReleaseDuration(): number { return 0.6; }
  protected getFishInitialPositionY(): number { return -500; }
  protected getFishInitialPositionZ(): number { return -1000; }
  protected getFishCaughtPositionY1(): number { return -1.5; }
  protected getFishCaughtPositionZ1(): number { return -1000; }
  protected getFishCaughtPositionY2(): number { return -2; }
  protected getFishCaughtPositionZ2(): number { return -500; }

  // Import shared methods from base
  controlrod = KlosterweiherARSessionBase.prototype.controlrod;
  catchfish = KlosterweiherARSessionBase.prototype.catchfish;
  releaseCurrentFish = KlosterweiherARSessionBase.prototype.releaseCurrentFish;
  protected playCurrentFishAnimation = KlosterweiherARSessionBase.prototype['playCurrentFishAnimation'];
  protected updateFishMixers = KlosterweiherARSessionBase.prototype['updateFishMixers'];

  protected initThree(): void {
    super.initThree();
        // Ensure the 3D canvas renders above the video element
        if (this.renderer) {
          this.renderer.domElement.style.zIndex = '1000';
        }

  // Create and attach a light to the scene (not camera) for proper illumination
    this.cameraLight = new THREE.PointLight(0xffffff, 2.0, 100);
    this.cameraLight.position.set(0, 0, 0);
    if (this.scene && this.camera) {
      this.scene.add(this.cameraLight);
      
    }

  // Load rod model - remove from scene and attach to camera after loading
    this.loadGLTFModel(this.rodUrl, {
      // Place rod close to camera frustum
      position: new THREE.Vector3(3, -2, -9),
      rotation: new THREE.Euler(0, Math.PI, 0),
      scale: 1.2,
    }).then((model) => {
        
      this.rod = model || null;
      if (this.rod && this.scene && this.camera) {
        
        // Remove from scene and attach to camera
        this.scene.remove(this.rod);
        this.camera.add(this.rod);
        this.rod.visible = false; // Hide initially
        // Visibility will be enabled via user confirmation button
            } else {
              
      }
    }).catch((err) => {
      console.error('[IOSKlosterweiher] Rod model failed to load:', err);
    });

    
    // Load all fish models
    this.fishUrls.forEach((fishUrl, index) => {
        
      this.loadGLTFModelWithAnimations(fishUrl, {
        // Initialize off-screen but not extremely far
        position: new THREE.Vector3(0, -500, -20),
        rotation: new THREE.Euler(0, Math.PI / 2, 0),
        scale: 3,
      }).then(({ scene, animations }) => {
          
        const fishModel = scene || null;
        if (fishModel && this.scene && this.camera) {
          
          // Remove from scene and attach to camera
          this.scene.remove(fishModel);
          this.camera.add(fishModel);
          fishModel.visible = false;
          this.fishes.push(fishModel);
          this.fishAnimations.push(animations || []);
          this.fishMixers.push(new THREE.AnimationMixer(fishModel));
          if (index === 0) {
            this.fish = fishModel; // Set first fish as current
                  } else {
                    
          }
        }
      }).catch((err) => {
        console.error(`[IOSKlosterweiher] Fish model ${index} failed to load:`, err);
      });
    });

    // Add water model
    this.loadGLTFModel(this.waterUrl, {
      scale: 10,
    }).then((model) => {
      this.water = model || null;
      if (this.water) {
        console.log('[IOSKlosterweiher] Water loaded successfully');
        this.water.visible = false;
        this.water.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material.opacity = 0.02;
          }
        });
      }
    }).catch((err) => console.error('Water model failed to load', err));
  }

  // Explicitly show rod when user confirms they see the lake
  public showRodAndProceed() {
    if (this.rod) {
      this.rod.visible = true;
    }
    this.onReadyCallback?.();
  }

  protected handlePointer(clientX: number, clientY: number): void {
    // Allow rod control immediately (no ground detection on iOS)
    this.controlrod();
  }

  // Override animate to update animation mixers and light position
  protected animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate) as any;

    const currentTime = performance.now();
    const deltaSeconds = this.lastFrameTime ? (currentTime - this.lastFrameTime) / 1000 : 0;
    this.lastFrameTime = currentTime;

    // Update animation mixers
    if (deltaSeconds > 0 && deltaSeconds < 1) { // Cap delta to prevent huge jumps
      this.fishMixers.forEach((mixer) => mixer.update(deltaSeconds));
    }

    // Update light position to follow camera
    if (this.cameraLight && this.camera) {
      this.cameraLight.position.copy(this.camera.position);
      this.cameraLight.position.y += 2;
      this.cameraLight.position.z += 5;
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };

  async init(): Promise<void> {
    await super.init();
    // After base init, start our custom animate loop
    this.lastFrameTime = performance.now();
  }
}

export const IOSKlosterweiherView = ({ onNavigateHome, username, onLogin, onLogout, onNavigateProfile }: ARViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRootRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<IOSKlosterweiherARSession | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fishCaught, setFishCaught] = useState(false);
  const [showFishingInstructions, setShowFishingInstructions] = useState(false);
  const [waitingForReady, setWaitingForReady] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sessionRef.current?.stop();
    };
  }, []);

  // Auto-start AR when authorized
  useEffect(() => {
    if (isAuthorized && !hasStarted && !isStarting) {
      startAR();
    }
  }, [isAuthorized, hasStarted, isStarting]);

  const startAR = async () => {
    if (!containerRef.current || !videoRef.current || !overlayRootRef.current || isStarting || hasStarted) return;
    setIsStarting(true);
    setError(null);

    try {
      console.log('[IOSKlosterweiherView] Initializing AR session...');
      const session = new IOSKlosterweiherARSession(
        containerRef.current,
        videoRef.current,
        {
          onError: (e) => console.error('AR init failed', e),
        }
      );

      session.onFishCaught = () => setFishCaught(true);
      session.onFishReleased = () => setFishCaught(false);
      session.onReadyCallback = () => {
        setWaitingForReady(false);
        setShowFishingInstructions(true);
      };

      await session.init();
      console.log('[IOSKlosterweiherView] AR session initialized');
      sessionRef.current = session;
      setHasStarted(true);
      setWaitingForReady(true);
    } catch (e: any) {
      const msg = e?.message || 'Failed to start AR';
      setError(msg);
      console.error('[IOSKlosterweiherView] AR start failed', e);
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
        videoRef={videoRef as React.RefObject<HTMLVideoElement>}
        overlayRootRef={overlayRootRef}
        username={username}
        onLogin={onLogin}
        onLogout={onLogout}
        onNavigateProfile={onNavigateProfile}
      />

      {waitingForReady && overlayRootRef.current && (
        <WaitingForReady 
          overlayRoot={overlayRootRef.current}
          onReady={() => {
            sessionRef.current?.showRodAndProceed();
            setWaitingForReady(false);
            setShowFishingInstructions(true);
          }}
        />
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

export default IOSKlosterweiherView;
