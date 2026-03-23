import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ARComponentBase } from "../../ARComponentBase";
import { ARProximityGate } from "../../ARProximityGate";
import { ARVisualizer } from "../../../../ARbackend/ARVisualizer";
import { AR_VIEW_STATION_MAP } from "../../../../data/stationsConfig";
import { KlosterweiherARSessionBase } from "../KlosterweiherARSessionBase";
import {
  WaitingForReady,
  FishingInstructions,
  FishCaughtDialog,
  FishActionButtons,
  FishInfoPopup,
  TapInstructionGIF,
  DragInstructionGIF,
} from "../KlosterweiherUI";

interface ARViewProps {
  onNavigateHome?: () => void;
  username?: string | null;
  onLogin?: () => void;
  onLogout?: () => void;
  onNavigateProfile?: () => void;
  onRegister?: () => void;
  completedStations?: number;
  totalStations?: number;
  totalPoints?: number;
  onCompleteStation?: (stationId: number) => void;
  isCurrentStationCompleted?: boolean;
}

class IOSKlosterweiherARSession extends ARVisualizer {
  public onReadyCallback?: () => void;
  public onModelsLoadedCallback?: () => void;

  // Properties from KlosterweiherARSessionBase
  protected rodUrl = new URL("./../models/Angel.glb", import.meta.url).href;
  protected fishUrls = [
    new URL("./../models/Rotauge.glb", import.meta.url).href,
    new URL("./../models/Forelle.glb", import.meta.url).href,
    new URL("./../models/Neunauge.glb", import.meta.url).href,
    new URL("./../models/Zander.glb", import.meta.url).href,
    new URL("./../models/Schleie.glb", import.meta.url).href,
    new URL("./../models/Doebel.glb", import.meta.url).href,
    new URL("./../models/Rotfeder.glb", import.meta.url).href,
    new URL("./../models/Stichling.glb", import.meta.url).href,
    new URL("./../models/Karpfen.glb", import.meta.url).href,
  ];
  protected waterUrl = new URL("./../models/Wasser.glb", import.meta.url).href;
  public fish: THREE.Object3D | null = null;
  public fishes: THREE.Object3D[] = [];
  protected fishMixers: THREE.AnimationMixer[] = [];
  protected fishAnimations: THREE.AnimationClip[][] = [];
  protected fishBackdrops: THREE.Mesh[] = []; // Semi-transparent backdrop meshes for visibility
  public rod: THREE.Object3D | null = null;
  public water: THREE.Object3D | null = null;
  public currentFishIndex = 0;
  protected cameraLight: THREE.PointLight | null = null;
  protected ambientLight: THREE.AmbientLight | null = null;
  protected hemisphereLight: THREE.HemisphereLight | null = null;
  protected fishLights: THREE.PointLight[] = [];
  public tapCount = 0;
  public hasCaughtFish = false;
  private modelsLoaded = false;
  private rodLoaded = false;
  private fishesLoaded = false;
  private waterLoaded = false;
  public onFishCaught?: (fishName: string) => void;
  public onFishReleased?: () => void;
  public onTap?: () => void; // Callback for tap tracking
  public onDrag?: () => void; // Callback for drag tracking
  private lastFrameTime: number = 0;

  // Orbit controls for caught fish
  protected orbitEnabled = false;
  protected orbitStartX = 0;
  protected orbitStartY = 0;
  protected fishRotationVelocity = { x: 0, y: 0 };
  protected lastOrbitTime = Date.now();
  protected fishBeingRotated = false;

  // Platform-specific position overrides for iOS
  protected getRodInitialPositionX(): number {
    return 3;
  }
  protected getRodCaughtPositionX(): number {
    return 6;
  }
  protected getRodCaughtDuration(): number {
    return 0.6;
  }
  protected getRodReleaseDuration(): number {
    return 0.6;
  }
  protected getFishInitialPositionY(): number {
    return -1500;
  }
  protected getFishInitialPositionZ(): number {
    return -1500;
  }
  protected getFishCaughtPositionY1(): number {
    return -1.5;
  }
  protected getFishCaughtPositionZ1(): number {
    return -1000;
  }
  protected getFishCaughtPositionY2(): number {
    return -2;
  }
  protected getFishCaughtPositionZ2(): number {
    return -500;
  }

  // Import shared methods from base
  controlrod = KlosterweiherARSessionBase.prototype.controlrod;
  catchfish = KlosterweiherARSessionBase.prototype.catchfish;
  releaseCurrentFish = KlosterweiherARSessionBase.prototype.releaseCurrentFish;
  protected createFishBackdrop =
    KlosterweiherARSessionBase.prototype["createFishBackdrop"];
  protected playCurrentFishAnimation =
    KlosterweiherARSessionBase.prototype["playCurrentFishAnimation"];
  protected updateFishMixers =
    KlosterweiherARSessionBase.prototype["updateFishMixers"];
  protected updateFishBackdrop =
    KlosterweiherARSessionBase.prototype["updateFishBackdrop"];
  protected extractFishName =
    KlosterweiherARSessionBase.prototype["extractFishName"];
  protected startOrbitControl =
    KlosterweiherARSessionBase.prototype["startOrbitControl"];
  protected updateOrbitControl =
    KlosterweiherARSessionBase.prototype["updateOrbitControl"];
  protected endOrbitControl =
    KlosterweiherARSessionBase.prototype["endOrbitControl"];
  protected applyOrbitMomentum =
    KlosterweiherARSessionBase.prototype["applyOrbitMomentum"];

  private setupOrbitControlListeners(): void {
    if (!this.renderer) return;

    const onMouseMove = (event: MouseEvent) => {
      this.handlePointerMove(event.clientX, event.clientY);
    };
    const onMouseUp = () => {
      this.handlePointerUp();
    };
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length > 0) {
        this.handlePointerMove(
          event.touches[0].clientX,
          event.touches[0].clientY,
        );
      }
    };
    const onTouchEnd = () => {
      this.handlePointerUp();
    };

    this.renderer.domElement.addEventListener("mousemove", onMouseMove);
    this.renderer.domElement.addEventListener("mouseup", onMouseUp);
    this.renderer.domElement.addEventListener("touchmove", onTouchMove);
    this.renderer.domElement.addEventListener("touchend", onTouchEnd);

    // Store for cleanup
    (this.renderer.domElement as any)._orbitControlHandlers = {
      onMouseMove,
      onMouseUp,
      onTouchMove,
      onTouchEnd,
    };
  }

  private checkAllModelsLoaded(): void {
    if (
      this.rodLoaded &&
      this.fishesLoaded &&
      this.waterLoaded &&
      !this.modelsLoaded
    ) {
      this.modelsLoaded = true;
      this.onModelsLoadedCallback?.();
    }
  }

  protected initThree(): void {
    super.initThree();

    // Setup additional pointer handlers for orbit controls
    this.setupOrbitControlListeners();

    // Ensure the 3D canvas renders above the video element
    if (this.renderer) {
      this.renderer.domElement.style.zIndex = "1000";
    }

    // Create multiple lights for even illumination from all sides
    // Main camera light
    this.cameraLight = new THREE.PointLight(0xffffff, 3.0, 1000);
    this.cameraLight.position.set(0, 0, 0);
    if (this.scene && this.camera) {
      this.scene.add(this.cameraLight);
    }

    // Ambient light for overall illumination (no shadows)
    this.ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    if (this.scene) {
      this.scene.add(this.ambientLight);
    }

    // Hemisphere light for even top/bottom lighting
    this.hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 1.0);
    if (this.scene) {
      this.scene.add(this.hemisphereLight);
    }

    // Additional point lights around fish position for all-around lighting
    const fishLightPositions = [
      { x: 0, y: 0, z: -200 }, // Front
      { x: -200, y: 0, z: -400 }, // Left
      { x: 200, y: 0, z: -400 }, // Right
      { x: 0, y: 200, z: -400 }, // Top
      { x: 0, y: -200, z: -400 }, // Bottom
      { x: 0, y: 0, z: -600 }, // Behind fish
    ];

    fishLightPositions.forEach((pos) => {
      const light = new THREE.PointLight(0xffffff, 2.0, 800);
      light.position.set(pos.x, pos.y, pos.z);
      if (this.camera) {
        this.camera.add(light);
      }
      this.fishLights.push(light);
    });

    // Load rod model - remove from scene and attach to camera after loading
    this.loadGLTFModel(this.rodUrl, {
      // Place rod close to camera frustum
      position: new THREE.Vector3(3, -2, -9),
      rotation: new THREE.Euler(0, Math.PI, 0),
      scale: 1.2,
    })
      .then((model) => {
        this.rod = model || null;
        if (this.rod && this.scene && this.camera) {
          // Remove from scene and attach to camera
          this.scene.remove(this.rod);
          this.camera.add(this.rod);
          this.rod.visible = false; // Hide initially
          // Visibility will be enabled via user confirmation button
        }
        this.rodLoaded = true;
        this.checkAllModelsLoaded();
      })
      .catch((err) => {
        console.error("[IOSKlosterweiher] Rod model failed to load:", err);
        this.rodLoaded = true;
        this.checkAllModelsLoaded();
      });

    // Load all fish models
    this.fishUrls.forEach((fishUrl, index) => {
      this.loadGLTFModelWithAnimations(fishUrl, {
        // Initialize off-screen but not extremely far
        position: new THREE.Vector3(0, -500, -20),
        rotation: new THREE.Euler(0, Math.PI / 2, 0),
        scale: 3,
      })
        .then(({ scene, animations }) => {
          const fishModel = scene || null;
          if (fishModel && this.scene && this.camera) {
            // Remove from scene and attach to camera
            this.scene.remove(fishModel);
            this.camera.add(fishModel);
            fishModel.visible = false;
            this.fishes[index] = fishModel;
            this.fishAnimations[index] = animations || [];
            this.fishMixers[index] = new THREE.AnimationMixer(fishModel);

            // Disable shadows on fish for even lighting
            fishModel.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                child.castShadow = false;
                child.receiveShadow = false;
                // Flatten shading slightly for more even appearance
                if (child.material) {
                  const materials = Array.isArray(child.material)
                    ? child.material
                    : [child.material];
                  materials.forEach((mat) => {
                    if ("flatShading" in mat) {
                      mat.flatShading = false;
                    }
                  });
                }
              }
            });

            // Create and store backdrop for this fish
            this.fishBackdrops[index] = this.createFishBackdrop(
              fishModel,
              this.camera,
            );

            console.log(
              `[IOSKlosterweiher] Fish ${index} loaded. Total fish loaded: ${this.fishes.filter(Boolean).length}`,
            );
            if (index === 0) {
              this.fish = fishModel; // Set first fish as current
              this.currentFishIndex = 0;
            }
          }
          // Check if all fishes are loaded
          if (this.fishes.filter(Boolean).length === this.fishUrls.length) {
            this.currentFishIndex = Math.floor(
              Math.random() * this.fishes.length,
            );
            this.fish =
              this.fishes[this.currentFishIndex] || this.fishes[0] || null;
            this.fishesLoaded = true;
            this.checkAllModelsLoaded();
          }
        })
        .catch((err) => {
          console.error(
            `[IOSKlosterweiher] Fish model ${index} failed to load:`,
            err,
          );
          // Still mark as loaded to avoid infinite waiting
          if (this.fishes.filter(Boolean).length === this.fishUrls.length) {
            this.fishesLoaded = true;
            this.checkAllModelsLoaded();
          }
        });
    });

    // Add water model
    this.loadGLTFModel(this.waterUrl, {
      scale: 10,
    })
      .then((model) => {
        this.water = model || null;
        if (this.water) {
          console.log("[IOSKlosterweiher] Water loaded successfully");
          this.water.visible = false;
          this.water.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.material.opacity = 0.02;
            }
          });
        }
        this.waterLoaded = true;
        this.checkAllModelsLoaded();
      })
      .catch((err) => {
        console.error("Water model failed to load", err);
        this.waterLoaded = true;
        this.checkAllModelsLoaded();
      });
  }

  // Explicitly show rod when user confirms they see the lake
  public showRodAndProceed() {
    if (this.rod) {
      this.rod.visible = true;
    }
    this.onReadyCallback?.();
  }

  protected handlePointer(clientX: number, clientY: number): void {
    // Notify about tap
    this.onTap?.();

    // If fish is caught, start orbit control; otherwise, cast rod
    if (this.hasCaughtFish) {
      this.startOrbitControl(clientX, clientY);
    } else {
      this.controlrod();
    }
  }

  protected handlePointerMove(clientX: number, clientY: number): void {
    this.updateOrbitControl(clientX, clientY);
  }

  protected handlePointerUp(): void {
    this.endOrbitControl();
  }

  // Override animate to update animation mixers and light position
  protected animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate) as any;

    const currentTime = performance.now();
    const deltaSeconds = this.lastFrameTime
      ? (currentTime - this.lastFrameTime) / 1000
      : 0;
    this.lastFrameTime = currentTime;

    // Update animation mixers
    if (deltaSeconds > 0 && deltaSeconds < 1) {
      // Cap delta to prevent huge jumps
      this.fishMixers.forEach((mixer) => mixer.update(deltaSeconds));
      this.applyOrbitMomentum(deltaSeconds);
      this.updateFishBackdrop();
    }

    // Update light position to be between camera and fish
    if (this.cameraLight && this.camera) {
      this.cameraLight.position.copy(this.camera.position);
      // Position light in front of camera (negative Z) to illuminate fish at z=-500
      const forward = new THREE.Vector3(0, 0, -1);
      forward.applyQuaternion(this.camera.quaternion);
      this.cameraLight.position.add(forward.multiplyScalar(200));
      this.cameraLight.position.y += 1;
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };

  stop(): void {
    // Cleanup orbit control listeners before calling parent stop
    if (this.renderer) {
      const handlers = (this.renderer.domElement as any)._orbitControlHandlers;
      if (handlers) {
        this.renderer.domElement.removeEventListener(
          "mousemove",
          handlers.onMouseMove,
        );
        this.renderer.domElement.removeEventListener(
          "mouseup",
          handlers.onMouseUp,
        );
        this.renderer.domElement.removeEventListener(
          "touchmove",
          handlers.onTouchMove,
        );
        this.renderer.domElement.removeEventListener(
          "touchend",
          handlers.onTouchEnd,
        );
      }
    }
    super.stop();
  }

  async init(): Promise<void> {
    await super.init();
    // After base init, start our custom animate loop
    this.lastFrameTime = performance.now();
  }
}

export const IOSKlosterweiherView = ({
  onNavigateHome,
  username,
  onLogin,
  onLogout,
  onNavigateProfile,
  onRegister,
  completedStations,
  totalStations,
  totalPoints,
  onCompleteStation,
  isCurrentStationCompleted = false,
}: ARViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRootRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<IOSKlosterweiherARSession | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fishCaught, setFishCaught] = useState(false);
  const [caughtFishName, setCaughtFishName] = useState<string>("");
  const [showFishingInstructions, setShowFishingInstructions] = useState(false);
  const [showFishInfo, setShowFishInfo] = useState(false);
  const [waitingForReady, setWaitingForReady] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [showTapInstruction, setShowTapInstruction] = useState(false);
  const [tapsSinceStart, setTapsSinceStart] = useState(0);
  const [lastTapTime, setLastTapTime] = useState<number>(Date.now());
  const [showDragInstruction, setShowDragInstruction] = useState(false);
  const [dragsSinceStart, setDragsSinceStart] = useState(0);

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

  // Timer to show tap instruction after 5 seconds of inactivity
  useEffect(() => {
    if (!hasStarted || fishCaught || tapsSinceStart >= 3) return;

    const timer = setInterval(() => {
      const timeSinceLastTap = Date.now() - lastTapTime;
      if (timeSinceLastTap >= 5000) {
        setShowTapInstruction(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [hasStarted, fishCaught, lastTapTime, tapsSinceStart]);

  const startAR = async () => {
    if (
      !containerRef.current ||
      !videoRef.current ||
      !overlayRootRef.current ||
      isStarting ||
      hasStarted
    )
      return;
    setIsStarting(true);
    setError(null);

    try {
      console.log("[IOSKlosterweiherView] Initializing AR session...");
      const session = new IOSKlosterweiherARSession(
        containerRef.current,
        videoRef.current,
        {
          onError: (e) => console.error("AR init failed", e),
        },
      );

      session.onFishCaught = (fishName: string) => {
        setFishCaught(true);
        setCaughtFishName(fishName);
        setShowTapInstruction(false); // Hide tap instruction when fish is caught
        setShowDragInstruction(true); // Show drag instruction when fish is caught
        setDragsSinceStart(0);
      };
      session.onFishReleased = () => {
        setFishCaught(false);
        setTapsSinceStart(0); // Reset tap count for new fishing session
        setLastTapTime(Date.now());
        setShowDragInstruction(false);
        setDragsSinceStart(0);
      };
      session.onDrag = () => {
        setDragsSinceStart((prev) => {
          const newCount = prev + 1;
          if (newCount >= 3) {
            setShowDragInstruction(false);
          }
          return newCount;
        });
      };
      session.onTap = () => {
        setLastTapTime(Date.now());
        setTapsSinceStart((prev) => {
          const newCount = prev + 1;
          // Only hide GIF after reaching 3 taps
          if (newCount >= 3) {
            setShowTapInstruction(false);
          }
          return newCount;
        });
      };
      session.onReadyCallback = () => {
        setWaitingForReady(false);
        setShowFishingInstructions(true);
      };
      session.onModelsLoadedCallback = () => {
        setModelsLoaded(true);
      };

      await session.init();
      console.log("[IOSKlosterweiherView] AR session initialized");
      sessionRef.current = session;
      setHasStarted(true);
      setWaitingForReady(true);
    } catch (e: any) {
      const msg = e?.message || "Failed to start AR";
      setError(msg);
      console.error("[IOSKlosterweiherView] AR start failed", e);
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
        onRegister={onRegister}
        completedStations={completedStations}
        totalStations={totalStations}
        totalPoints={totalPoints}
        currentStationId={5}
        currentStationTitle="Klosterweiher"
        currentStationPoints={45}
        onCompleteStation={onCompleteStation}
        isCurrentStationCompleted={isCurrentStationCompleted}
      />

      {waitingForReady && overlayRootRef.current && (
        <WaitingForReady
          overlayRoot={overlayRootRef.current}
          onReady={() => {
            sessionRef.current?.showRodAndProceed();
            setWaitingForReady(false);
            setShowFishingInstructions(true);
            setShowTapInstruction(true); // Show tap instruction when ready
            setLastTapTime(Date.now());
          }}
          modelsLoaded={modelsLoaded}
        />
      )}

      {showFishingInstructions && overlayRootRef.current && (
        <FishingInstructions
          overlayRoot={overlayRootRef.current}
          onStart={() => {
            setShowFishingInstructions(false);
            setShowTapInstruction(true); // Show tap instruction after dismissing fishing instructions
            setLastTapTime(Date.now());
          }}
        />
      )}

      {showTapInstruction &&
        !fishCaught &&
        tapsSinceStart < 3 &&
        overlayRootRef.current && (
          <TapInstructionGIF overlayRoot={overlayRootRef.current} />
        )}

      {fishCaught && overlayRootRef.current && (
        <>
          <FishCaughtDialog
            overlayRoot={overlayRootRef.current}
            fishName={caughtFishName}
          />
          <FishActionButtons
            overlayRoot={overlayRootRef.current}
            onRelease={() => sessionRef.current?.releaseCurrentFish()}
            onLearnMore={() => setShowFishInfo(true)}
          />
        </>
      )}

      {fishCaught &&
        showDragInstruction &&
        dragsSinceStart < 3 &&
        overlayRootRef.current && (
          <DragInstructionGIF overlayRoot={overlayRootRef.current} />
        )}

      {showFishInfo && overlayRootRef.current && (
        <FishInfoPopup
          overlayRoot={overlayRootRef.current}
          fishName={caughtFishName}
          onClose={() => setShowFishInfo(false)}
        />
      )}
    </>
  );

  // Wrap with Proximity Gate - checks if user is within 100m of station
  return (
    <ARProximityGate
      stationId={AR_VIEW_STATION_MAP["klosterweiher"]}
      stationName="Klosterweiher"
      onNavigateBack={onNavigateHome}
      onAccessGranted={() => setIsAuthorized(true)}
    >
      {arContent}
    </ARProximityGate>
  );
};

export default IOSKlosterweiherView;
