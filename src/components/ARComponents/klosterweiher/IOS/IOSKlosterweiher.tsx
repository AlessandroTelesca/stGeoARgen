import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as THREE from 'three';
import { ARComponentBase } from '../../ARComponentBase';
import { ARProximityGate } from '../../ARProximityGate';
import { ARVisualizer } from '../../../../ARbackend/ARVisualizer';
import { AR_VIEW_STATION_MAP } from '../../../../data/stationsConfig';
import gsap from 'gsap';

interface ARViewProps {
  onNavigateHome?: () => void;
  username?: string | null;
  onLogin?: () => void;
  onLogout?: () => void;
  onNavigateProfile?: () => void;
}

class IOSKlosterweiherARSession extends ARVisualizer {
  private rodUrl = new URL('./../models/Angel.glb', import.meta.url).href;
  private fishUrls = [
    // new URL('./../models/Forelle.glb', import.meta.url).href,
    // new URL('./../models/Neunauge.glb', import.meta.url).href,
    // new URL('./../models/Zander.glb', import.meta.url).href,
    // new URL('./../models/Schleie.glb', import.meta.url).href,
    // new URL('./../models/Döbel.glb', import.meta.url).href,
    new URL('./../models/Rotauge.glb', import.meta.url).href,
    // new URL('./../models/Rotfeder.glb', import.meta.url).href,
    // new URL('./../models/Stichling.glb', import.meta.url).href,
    // new URL('./../models/Karpfen.glb', import.meta.url).href,
  ];
  private waterUrl = new URL('./../models/Wasser.glb', import.meta.url).href;

  public fish: THREE.Object3D | null = null;
  public fishes: THREE.Object3D[] = [];
  private fishMixers: THREE.AnimationMixer[] = [];
  private fishAnimations: THREE.AnimationClip[][] = [];
  public rod: THREE.Object3D | null = null;
  public water: THREE.Object3D | null = null;
  public currentFishIndex = 0;
  private cameraLight: THREE.PointLight | null = null;
  private lastFrameTime: number = 0;

  public tapCount = 0;
  public hasCaughtFish = false;
  public onFishCaught?: () => void;
  public onFishReleased?: () => void;
  public onReadyCallback?: () => void;

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

  controlrod() {
    if (!this.rod) return;
    if (this.hasCaughtFish) return; // Wait for release before next catch
    const tl = gsap.timeline();

    this.tapCount += 1;
    if (this.tapCount >= 5) {
      this.catchfish();
    }

    tl.to(this.rod.rotation, {
      x: -0.6,
      duration: 0.5,
    });

    tl.to(this.rod.rotation, {
      x: -1,
      duration: 0.5,
      delay: 0.5,
    });

    tl.to(this.rod.rotation, {
      x: -0.8,
      duration: 0.5,
      delay: 0.5,
    });
  }

  catchfish() {
    if (!this.fish) return;
    if (!this.rod) return;
    const tl = gsap.timeline();

    gsap.to(this.fish.rotation, {
      y: Math.PI * 8,
      duration: 6,
    });

    this.playCurrentFishAnimation();
    this.fish.visible = true;

    tl.to(this.rod.rotation, {
      x: 0,
      duration: 0.5,
      delay: 2,
    })
    .to(this.rod.position, {
      // Slight move to the right
      x: 6,
      duration: 0.6,
    })
    .to(this.fish.position, {
      // Bring fish into view near camera
      y: -1.5,
      z: -1000,
      duration: 0.5,
    })
    .to(this.fish.position, {
      y: -2,
      z: -500,
      duration: 0.3,
      onComplete: () => {
        this.hasCaughtFish = true;
        this.onFishCaught?.();
      }
    });
  }

  releaseCurrentFish() {
    if (!this.fish) return;
    const activeMixer = this.fishMixers[this.currentFishIndex];
    activeMixer?.stopAllAction();
    this.fish.visible = false;
    this.fish.position.set(0, -500, -1000);
    this.fish.rotation.set(0, Math.PI / 2, 0);

    // Select random fish
    this.currentFishIndex = Math.floor(Math.random() * this.fishes.length);
    this.fish = this.fishes[this.currentFishIndex];
    this.fish.position.set(0, -500, -1000);
    this.fish.rotation.set(0, Math.PI / 2, 0);
    this.fish.visible = false;

    this.tapCount = 0;
    this.hasCaughtFish = false;
    this.onFishReleased?.();

    if (this.rod) {
      gsap.to(this.rod.position, {
        x: 3,
        duration: 0.6,
      });
    }
  }

  private playCurrentFishAnimation() {
    const mixer = this.fishMixers[this.currentFishIndex];
    const clips = this.fishAnimations[this.currentFishIndex];

    if (!mixer || !clips || clips.length === 0) return;

    mixer.stopAllAction();
    const action = mixer.clipAction(clips[0]);
    action.reset().play();
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
            <p style={{ margin: '0 0 12px 0', fontWeight: 700 }}>Start AR Experience</p>
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

      {waitingForReady && overlayRootRef.current && createPortal(
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
          <button
            onClick={() => {
              sessionRef.current?.showRodAndProceed();
              setWaitingForReady(false);
              setShowFishingInstructions(true);
            }}
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
        </div>,
        overlayRootRef.current
      )}

      {showFishingInstructions && overlayRootRef.current && createPortal(
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
            onClick={() => setShowFishingInstructions(false)}
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
        overlayRootRef.current
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
            Fisch wieder freilassen
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

export default IOSKlosterweiherView;
