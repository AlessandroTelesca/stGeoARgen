import * as THREE from "three";
import gsap from "gsap";

export interface CaughtObjectPayload {
  isChest: boolean;
  fishName: string;
}

export const DEFAULT_TREASURE_SPAWN_CHANCE = 0.03; // 3% chance to spawn treasure chest instead of fish

/**
 * Base class containing shared logic for both Android and iOS Klosterweiher AR sessions.
 * Handles fish models, rod animations, catching/releasing mechanics.
 */
export abstract class KlosterweiherARSessionBase {
  // Model URLs
  protected rodUrl = new URL("./models/Angel.glb", import.meta.url).href;
  protected fishUrls = [
    new URL("./models/Rotauge.glb", import.meta.url).href,
    new URL("./models/Forelle.glb", import.meta.url).href,
    new URL("./models/Neunauge.glb", import.meta.url).href,
    new URL("./models/Zander.glb", import.meta.url).href,
    new URL("./models/Schleie.glb", import.meta.url).href,
    new URL("./models/Doebel.glb", import.meta.url).href,
    new URL("./models/Rotfeder.glb", import.meta.url).href,
    new URL("./models/Stichling.glb", import.meta.url).href,
    new URL("./models/Karpfen.glb", import.meta.url).href,
  ];
  protected waterUrl = new URL("./models/Wasser.glb", import.meta.url).href;

  // 3D Objects
  public fish: THREE.Object3D | null = null;
  public fishes: THREE.Object3D[] = [];
  protected fishMixers: THREE.AnimationMixer[] = [];
  protected fishAnimations: THREE.AnimationClip[][] = [];
  protected fishBackdrops: THREE.Mesh[] = []; // Semi-transparent backdrop meshes for visibility
  public treasureChest: THREE.Mesh | null = null;
  public isTreasureChestActive = false;
  public rod: THREE.Object3D | null = null;
  public water: THREE.Object3D | null = null;
  public currentFishIndex = 0;
  protected cameraLight: THREE.PointLight | null = null;

  // Fishing state
  public tapCount = 0;
  public hasCaughtFish = false;
  public onFishCaught?: (fishName: string) => void;
  public onCatchObjectCaught?: (payload: CaughtObjectPayload) => void;
  public onFishReleased?: () => void;
  public onDrag?: () => void;
  protected rodAnimationInProgress = false;
  protected treasureSpawnChance = DEFAULT_TREASURE_SPAWN_CHANCE;

  // Orbit controls for caught fish
  protected orbitEnabled = false;
  protected orbitStartX = 0;
  protected orbitStartY = 0;
  protected fishRotationVelocity = { x: 0, y: 0 };
  protected lastOrbitTime = Date.now();
  protected fishBeingRotated = false;

  /**
   * Controls the fishing rod animation when user taps
   */
  controlrod() {
    if (!this.rod) return;
    if (this.hasCaughtFish) return; // Wait for release before next catch
    if (this.rodAnimationInProgress) return; // Prevent animation while one is running

    this.rodAnimationInProgress = true;
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
      onComplete: () => {
        this.rodAnimationInProgress = false;
      },
    });
  }

  /**
   * Catch a fish animation sequence
   */
  catchfish() {
    if (!this.fish) return;
    if (!this.rod) return;
    const tl = gsap.timeline();

    if (this.isTreasureChestActive) {
      gsap.to(this.fish.rotation, {
        y: this.fish.rotation.y + Math.PI * 2,
        duration: 2.2,
      });
    } else {
      gsap.to(this.fish.rotation, {
        y: Math.PI * 8,
        duration: 6,
      });
    }

    // Only play animation if fish hasn't been rotated yet
    if (!this.fishBeingRotated && !this.isTreasureChestActive) {
      this.playCurrentFishAnimation();
    }
    this.fish.visible = true;

    // Show backdrop for visibility
    const backdrop =
      this.currentFishIndex >= 0
        ? this.fishBackdrops[this.currentFishIndex]
        : undefined;
    // if (backdrop) backdrop.visible = true; // Backdrop deactivated

    tl.to(this.rod.rotation, {
      x: 0,
      duration: 0.5,
      delay: 2,
    })
      .to(this.rod.position, {
        x: this.getRodCaughtPositionX(),
        duration: this.getRodCaughtDuration(),
      })
      .to(this.fish.position, {
        y: this.getFishCaughtPositionY1(),
        z: this.getFishCaughtPositionZ1(),
        duration: 0.5,
      })
      .to(this.fish.position, {
        y: this.getFishCaughtPositionY2(),
        z: this.getFishCaughtPositionZ2(),
        duration: 0.3,
        onComplete: () => {
          this.hasCaughtFish = true;
          const fishName = this.isTreasureChestActive
            ? "Schatzkiste"
            : this.extractFishName(this.fishUrls[this.currentFishIndex]);
          this.onCatchObjectCaught?.({
            isChest: this.isTreasureChestActive,
            fishName,
          });
          this.onFishCaught?.(fishName);
        },
      });
  }

  /**
   * Release current fish and select a new random fish
   */
  releaseCurrentFish() {
    if (!this.fish) return;
    const activeMixer =
      this.currentFishIndex >= 0
        ? this.fishMixers[this.currentFishIndex]
        : undefined;
    activeMixer?.stopAllAction();
    this.fish.visible = false;

    // Hide current fish backdrop
    const oldBackdrop =
      this.currentFishIndex >= 0
        ? this.fishBackdrops[this.currentFishIndex]
        : undefined;
    if (oldBackdrop) oldBackdrop.visible = false;
    this.fish.position.set(
      0,
      this.getFishInitialPositionY(),
      this.getFishInitialPositionZ(),
    );
    this.fish.rotation.set(0, Math.PI / 2, 0);

    this.selectNextCatchObject();

    console.log(
      `[KlosterweiherARSessionBase] Released object. New fish index: ${this.currentFishIndex}. Chest active: ${this.isTreasureChestActive}`,
    );
    if (this.fish) {
      this.fish.position.set(
        0,
        this.getFishInitialPositionY(),
        this.getFishInitialPositionZ(),
      );
      this.fish.rotation.set(0, Math.PI / 2, 0);
      this.fish.visible = false;
    }

    this.tapCount = 0;
    this.hasCaughtFish = false;
    this.fishBeingRotated = false;
    this.onFishReleased?.();

    if (this.rod) {
      gsap.to(this.rod.position, {
        x: this.getRodInitialPositionX(),
        duration: this.getRodReleaseDuration(),
      });
    }
  }

  protected ensureTreasureChest(camera: THREE.Camera) {
    if (this.treasureChest) return;

    const chestGeometry = new THREE.BoxGeometry(560, 360, 420);
    const chestMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b5a2b,
      roughness: 0.5,
      metalness: 0.2,
    });

    const chest = new THREE.Mesh(chestGeometry, chestMaterial);
    chest.visible = false;
    chest.position.set(0, this.getFishInitialPositionY(), this.getFishInitialPositionZ());
    chest.rotation.set(0, Math.PI / 2, 0);

    camera.add(chest);
    this.treasureChest = chest;
  }

  protected selectNextCatchObject() {
    if (this.treasureChest && Math.random() < this.treasureSpawnChance) {
      this.isTreasureChestActive = true;
      this.currentFishIndex = -1;
      this.fish = this.treasureChest;
      return;
    }

    this.isTreasureChestActive = false;

    // Select a random fish that's different from current among loaded models
    const loadedIndices = this.fishes
      .map((f, i) => (f ? i : -1))
      .filter((i) => i >= 0);

    if (loadedIndices.length === 0) {
      this.currentFishIndex = 0;
      this.fish = null;
      return;
    }

    let newIndex = loadedIndices[0];
    if (loadedIndices.length > 1) {
      do {
        newIndex =
          loadedIndices[Math.floor(Math.random() * loadedIndices.length)];
      } while (newIndex === this.currentFishIndex);
    }

    this.currentFishIndex = newIndex;
    this.fish = this.fishes[this.currentFishIndex];
  }

  /**
   * Create a semi-transparent white backdrop mesh for a fish model
   */
  protected createFishBackdrop(
    fishModel: THREE.Object3D,
    camera: THREE.Camera,
  ): THREE.Mesh {
    const shape = new THREE.Shape();
    const radiusX = 700;
    const radiusY = 300;
    const segments = 128;

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * radiusX;
      const y = Math.sin(angle) * radiusY;

      if (i === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }

    const geometry = new THREE.ShapeGeometry(shape);

    // Create semi-transparent white material
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false, // Ensure proper transparency rendering
    });

    const backdrop = new THREE.Mesh(geometry, material);
    backdrop.visible = false;

    // Add backdrop to camera (not as child of fish) so it doesn't rotate with fish
    camera.add(backdrop);

    return backdrop;
  }

  /**
   * Play animation for the currently selected fish
   */
  protected playCurrentFishAnimation() {
    if (this.currentFishIndex < 0) return;

    const mixer = this.fishMixers[this.currentFishIndex];
    const clips = this.fishAnimations[this.currentFishIndex];

    if (!mixer || !clips || clips.length === 0) return;

    mixer.stopAllAction();
    const action = mixer.clipAction(clips[0]);
    action.reset().play();
  }

  /**
   * Update animation mixers - should be called in render loop
   */
  protected updateFishMixers(deltaSeconds: number) {
    this.fishMixers.forEach((mixer) => mixer.update(deltaSeconds));
  }

  /**
   * Update backdrop position to follow fish without rotating
   */
  protected updateFishBackdrop() {
    if (!this.fish || !this.hasCaughtFish) return;
    if (this.currentFishIndex < 0) return;

    const backdrop = this.fishBackdrops[this.currentFishIndex];
    if (!backdrop || !backdrop.visible) return;

    // Copy fish position but keep backdrop facing camera (no rotation)
    backdrop.position.copy(this.fish.position);
    // Offset slightly behind the fish (towards camera)
    backdrop.position.z -= 400;
    backdrop.position.y += 50;
  }

  /**
   * Handle orbit control start (touch/mouse down)
   */
  protected startOrbitControl(clientX: number, clientY: number): void {
    if (!this.hasCaughtFish || !this.fish) return;
    this.orbitEnabled = true;
    this.orbitStartX = clientX;
    this.orbitStartY = clientY;
    this.lastOrbitTime = Date.now();

    // Stop fish animation when user starts rotating
    if (!this.fishBeingRotated) {
      this.fishBeingRotated = true;
      const activeMixer =
        this.currentFishIndex >= 0
          ? this.fishMixers[this.currentFishIndex]
          : undefined;
      activeMixer?.stopAllAction();
    }

    // Notify about drag
    this.onDrag?.();
  }

  /**
   * Handle orbit control movement (touch/mouse move)
   */
  protected updateOrbitControl(clientX: number, clientY: number): void {
    if (!this.orbitEnabled || !this.fish) return;

    const deltaX = clientX - this.orbitStartX;
    const deltaY = clientY - this.orbitStartY;
    const sensitivity = 0.005;

    // Calculate velocity for momentum
    const now = Date.now();
    const timeDelta = Math.max(1, now - this.lastOrbitTime) / 1000;
    this.fishRotationVelocity.y = (deltaX * sensitivity) / timeDelta;
    this.fishRotationVelocity.x = (deltaY * sensitivity) / timeDelta;

    // Apply rotation to fish
    this.fish.rotation.y += deltaX * sensitivity;
    this.fish.rotation.x += deltaY * sensitivity;

    // Clamp x rotation to prevent flipping
    this.fish.rotation.x = Math.max(
      -Math.PI / 2,
      Math.min(Math.PI / 2, this.fish.rotation.x),
    );

    this.orbitStartX = clientX;
    this.orbitStartY = clientY;
    this.lastOrbitTime = now;
  }

  /**
   * Handle orbit control end (touch/mouse up)
   */
  protected endOrbitControl(): void {
    this.orbitEnabled = false;
  }

  /**
   * Apply momentum/inertia to the fish rotation
   */
  protected applyOrbitMomentum(deltaSeconds: number): void {
    if (!this.fish || this.orbitEnabled) return;

    const friction = 0.95; // Friction coefficient
    if (
      Math.abs(this.fishRotationVelocity.x) > 0.001 ||
      Math.abs(this.fishRotationVelocity.y) > 0.001
    ) {
      this.fish.rotation.y += this.fishRotationVelocity.y * deltaSeconds;
      this.fish.rotation.x += this.fishRotationVelocity.x * deltaSeconds;

      // Apply friction
      this.fishRotationVelocity.x *= friction;
      this.fishRotationVelocity.y *= friction;

      // Clamp x rotation
      this.fish.rotation.x = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, this.fish.rotation.x),
      );
    }
  }

  /**
   * Extract fish name from model URL
   */
  protected extractFishName(url: string): string {
    // Extract filename from URL (e.g., "Rotauge.glb" or "Rotauge-DCD9klYJ.glb")

    const match = url.match(/([^/]+)\.glb(?:\?.*)?$/);
    let name = match && match[1] ? match[1] : "";

    // Delete everything after the first hyphen (including the hyphen)
    if (name && name.includes("-")) {
      name = name.split("-")[0];
    }
    return name || "Fisch";
  }

  // Platform-specific overridable methods for position/timing differences
  protected abstract getRodInitialPositionX(): number;
  protected abstract getRodCaughtPositionX(): number;
  protected abstract getRodCaughtDuration(): number;
  protected abstract getRodReleaseDuration(): number;
  protected abstract getFishInitialPositionY(): number;
  protected abstract getFishInitialPositionZ(): number;
  protected abstract getFishCaughtPositionY1(): number;
  protected abstract getFishCaughtPositionZ1(): number;
  protected abstract getFishCaughtPositionY2(): number;
  protected abstract getFishCaughtPositionZ2(): number;
}
