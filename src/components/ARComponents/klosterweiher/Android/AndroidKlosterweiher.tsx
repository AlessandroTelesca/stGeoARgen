import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ARComponentBase } from "../../ARComponentBase";
import { ARProximityGate } from "../../ARProximityGate";
import { WebXRVisualizer } from "../../../../ARbackend/WebXRVisualizer";
import { AR_VIEW_STATION_MAP } from "../../../../data/stationsConfig";
import { KlosterweiherARSessionBase } from "../KlosterweiherARSessionBase";
import {
  WaitingForGroundDetection,
  FishingInstructions,
  ReleaseFishButton,
  FishCaughtDialog,
  FishInfoPopup,
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
}

class AndroidKlosterweiherARSession extends WebXRVisualizer {
  public onGroundDetectedCallback?: () => void;
  public onModelsLoadedCallback?: () => void;

  // Properties from KlosterweiherARSessionBase
  protected rodUrl = new URL("./../models/Angel.glb", import.meta.url).href;
  protected fishUrls = [
    new URL("./../models/Rotauge.glb", import.meta.url).href,
    new URL("./../models/Forelle.glb", import.meta.url).href,
    new URL('./../models/Neunauge.glb', import.meta.url).href,
    new URL('./../models/Zander.glb', import.meta.url).href,
    new URL('./../models/Schleie.glb', import.meta.url).href,
    new URL('./../models/Doebel.glb', import.meta.url).href,
    new URL('./../models/Rotfeder.glb', import.meta.url).href,
    new URL('./../models/Stichling.glb', import.meta.url).href,
    new URL('./../models/Karpfen.glb', import.meta.url).href,
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
  public tapCount = 0;
  public hasCaughtFish = false;
  public onFishCaught?: (fishName: string) => void;
  public onFishReleased?: () => void;
  private modelsLoaded = false;
  private rodLoaded = false;
  private fishesLoaded = false;
  private waterLoaded = false;
  private threeInitialized = false; // Guard to prevent double initialization

  // Orbit controls for caught fish
  protected orbitEnabled = false;
  protected orbitStartX = 0;
  protected orbitStartY = 0;
  protected fishRotationVelocity = { x: 0, y: 0 };
  protected lastOrbitTime = Date.now();
  protected fishBeingRotated = false;

  // Platform-specific position overrides for Android
  protected getRodInitialPositionX(): number {
    return 5.5;
  }
  protected getRodCaughtPositionX(): number {
    return 9;
  }
  protected getRodCaughtDuration(): number {
    return 1;
  }
  protected getRodReleaseDuration(): number {
    return 1;
  }
  protected getFishInitialPositionY(): number {
    return -1500;
  }
  protected getFishInitialPositionZ(): number {
    return -1500;
  }
  protected getFishCaughtPositionY1(): number {
    return 3;
  }
  protected getFishCaughtPositionZ1(): number {
    return -500;
  }
  protected getFishCaughtPositionY2(): number {
    return -5;
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
        this.handlePointerMove(event.touches[0].clientX, event.touches[0].clientY);
      }
    };
    const onTouchEnd = () => {
      this.handlePointerUp();
    };

    this.renderer.domElement.addEventListener('mousemove', onMouseMove);
    this.renderer.domElement.addEventListener('mouseup', onMouseUp);
    this.renderer.domElement.addEventListener('touchmove', onTouchMove);
    this.renderer.domElement.addEventListener('touchend', onTouchEnd);

    // Store for cleanup
    (this.renderer.domElement as any)._orbitControlHandlers = {
      onMouseMove,
      onMouseUp,
      onTouchMove,
      onTouchEnd,
    };
  }

  private checkAllModelsLoaded(): void {
    if (this.rodLoaded && this.fishesLoaded && this.waterLoaded && !this.modelsLoaded) {
      this.modelsLoaded = true;
      this.onModelsLoadedCallback?.();
    }
  }

  protected initThree(): void {
    // Guard against double initialization
    if (this.threeInitialized) {
      console.log("[AndroidKlosterweiher] initThree already called, skipping...");
      return;
    }
    this.threeInitialized = true;

    super.initThree();

    // Setup additional pointer handlers for orbit controls
    this.setupOrbitControlListeners();

    // Create and attach a light to the camera that follows it
    this.cameraLight = new THREE.PointLight(0xffffff, 1.5, 100);
    this.cameraLight.position.set(0, 2, 5);
    this.cameraLight.parent = this.camera;
    this.loadGLTFModel(this.rodUrl, {
      position: new THREE.Vector3(3, -6, -20),
      rotation: new THREE.Euler(0, Math.PI, 0),
      scale: 1.2,
    })
      .then((model) => {
        this.rod = model || null;
        if (this.rod) {
          this.rod.parent = this.camera;
          this.rod.visible = false; // Hide until ground is detected
        }
        this.rodLoaded = true;
        this.checkAllModelsLoaded();
      })
      .catch((err) => {
        console.error("Rod model failed to load", err);
        this.rodLoaded = true;
        this.checkAllModelsLoaded();
      });

    // Load all fish models
    this.fishUrls.forEach((fishUrl, index) => {
      this.loadGLTFModelWithAnimations(fishUrl, {
        position: new THREE.Vector3(0, -100, -1500),
        rotation: new THREE.Euler(0, Math.PI / 2, 0),
        scale: 3,
      })
        .then(({ scene, animations }) => {
          const fishModel = scene || null;
          if (fishModel) {
            fishModel.parent = this.camera;
            fishModel.visible = false;
            this.fishes[index] = fishModel;
            this.fishAnimations[index] = animations || [];
            this.fishMixers[index] = new THREE.AnimationMixer(fishModel);

            // Create and store backdrop for this fish
            if (this.camera) {
              this.fishBackdrops[index] = this.createFishBackdrop(fishModel, this.camera);
            }

            console.log(
              `[AndroidKlosterweiher] Fish ${index} loaded. Total fish loaded: ${this.fishes.filter(Boolean).length}`,
            );
            if (index === 0) {
              this.fish = fishModel; // Set first fish as current
              this.currentFishIndex = 0;
            }
          }
          // Check if all fishes are loaded
          if (this.fishes.filter(Boolean).length === this.fishUrls.length) {
            this.fishesLoaded = true;
            this.checkAllModelsLoaded();
          }
        })
        .catch((err) => {
          console.error(`Fish model ${index} failed to load`, err);
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
          this.water.visible = false;
          this.water.traverse((child) => {
            if (child instanceof THREE.Mesh) child.material.opacity = 0.02;
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

    console.log(
      "Ground plane scanned and detected! Fishing rod and fish placed.",
    );
    this.onGroundDetectedCallback?.();
  }

  protected handlePointer(clientX: number, clientY: number): void {
    // Only allow rod control after ground is detected via WebXR
    if (!this.isGroundDetected) {
      console.log("Waiting for ground plane detection...");
      return;
    }

    // If fish is caught, start orbit control; otherwise, cast rod
    if (this.hasCaughtFish) {
      this.startOrbitControl(clientX, clientY);
    } else {
      this.controlrod();
    }
  }

  protected handlePointerMove(clientX: number, clientY: number): void {
    if (!this.isGroundDetected) return;
    this.updateOrbitControl(clientX, clientY);
  }

  protected handlePointerUp(): void {
    this.endOrbitControl();
  }

  stop(): void {
    // Cleanup orbit control listeners before calling parent stop
    if (this.renderer) {
      const handlers = (this.renderer.domElement as any)._orbitControlHandlers;
      if (handlers) {
        this.renderer.domElement.removeEventListener('mousemove', handlers.onMouseMove);
        this.renderer.domElement.removeEventListener('mouseup', handlers.onMouseUp);
        this.renderer.domElement.removeEventListener('touchmove', handlers.onTouchMove);
        this.renderer.domElement.removeEventListener('touchend', handlers.onTouchEnd);
      }
    }
    super.stop();
  }

  protected onXRFrameUpdate(deltaSeconds: number): void {
    this.updateFishMixers(deltaSeconds);
    this.applyOrbitMomentum(deltaSeconds);
    this.updateFishBackdrop();
  }
}

export const AndroidKlosterweiherView = ({
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
}: ARViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRootRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<AndroidKlosterweiherARSession | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fishCaught, setFishCaught] = useState(false);
  const [caughtFishName, setCaughtFishName] = useState<string>("");
  const [showFishingInstructions, setShowFishingInstructions] = useState(false);
  const [showFishInfo, setShowFishInfo] = useState(false);
  const [waitingForGroundDetection, setWaitingForGroundDetection] =
    useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sessionRef.current?.stop();
    };
  }, []);

  // Pre-create session and start loading models when authorized
  useEffect(() => {
    if (isAuthorized && !sessionRef.current && !hasStarted && containerRef.current && overlayRootRef.current) {
      console.log("[KlosterweiherView] Pre-creating AR session to load models...");
      const session = new AndroidKlosterweiherARSession(
        containerRef.current,
        {
          useWebXR: true,
          domOverlayRoot: overlayRootRef.current,
          onError: (e) => console.error("AR init failed", e),
        }
      );

      session.onFishCaught = (fishName: string) => {
        setFishCaught(true);
        setCaughtFishName(fishName);
      };
      session.onFishReleased = () => setFishCaught(false);
      session.onGroundDetectedCallback = () => {
        setWaitingForGroundDetection(false);
        setShowFishingInstructions(true);
      };
      session.onModelsLoadedCallback = () => {
        setModelsLoaded(true);
        console.log("[KlosterweiherView] All models loaded and ready!");
      };

      sessionRef.current = session;

      // Manually trigger initThree to start loading models without starting WebXR
      session['initThree']();
    }
  }, [isAuthorized, hasStarted]);

  const startAR = async () => {
    if (
      !containerRef.current ||
      !overlayRootRef.current ||
      isStarting ||
      hasStarted ||
      !sessionRef.current
    )
      return;
    setIsStarting(true);
    setError(null);

    try {
      console.log("[KlosterweiherView] Starting WebXR AR session...");
      await sessionRef.current.init(); // Must be called from user gesture to satisfy WebXR security
      console.log("[KlosterweiherView] AR session initialized");
      setHasStarted(true);
      setWaitingForGroundDetection(true);
    } catch (e: any) {
      const msg = e?.message || "Failed to start AR";
      setError(msg);
      console.error("[KlosterweiherView] AR start failed", e);
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
        onRegister={onRegister}
        completedStations={completedStations}
        totalStations={totalStations}
        totalPoints={totalPoints}
        currentStationId={5}
        currentStationTitle="Klosterweiher"
        currentStationPoints={45}
        onCompleteStation={onCompleteStation}
      />

      {isAuthorized && !hasStarted && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            background: "rgba(0,0,0,0.5)",
            pointerEvents: "auto",
          }}
        >
          <div
            style={{
              padding: "16px",
              background: "#fff",
              borderRadius: "12px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
              minWidth: "240px",
              textAlign: "center",
            }}
          >
            <p style={{ margin: "0 0 12px 0", fontWeight: 700 }}>
              {modelsLoaded ? "Start AR to scan the ground" : "Loading models..."}
            </p>
            {!modelsLoaded && (
              <p style={{ color: "#666", margin: "0 0 12px 0", fontSize: "14px" }}>
                Please wait while AR models are loading
              </p>
            )}
            {error && (
              <p style={{ color: "#b00020", margin: "0 0 8px 0" }}>{error}</p>
            )}
            <button
              onClick={startAR}
              disabled={isStarting || !modelsLoaded}
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                border: "none",
                background: modelsLoaded ? "#0c690f" : "#ccc",
                color: "#fff",
                fontWeight: 700,
                cursor: modelsLoaded && !isStarting ? "pointer" : "not-allowed",
                opacity: modelsLoaded && !isStarting ? 1 : 0.6,
              }}
            >
              {isStarting ? "Starting..." : modelsLoaded ? "Start AR" : "Loading..."}
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
        <>
          <FishCaughtDialog
            overlayRoot={overlayRootRef.current}
            fishName={caughtFishName}
            onLearnMore={() => setShowFishInfo(true)}
          />
          <ReleaseFishButton
            overlayRoot={overlayRootRef.current}
            onRelease={() => sessionRef.current?.releaseCurrentFish()}
          />
        </>
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
