import * as THREE from 'three';
import gsap from 'gsap';

/**
 * Base class containing shared logic for both Android and iOS Klosterweiher AR sessions.
 * Handles fish models, rod animations, catching/releasing mechanics.
 */
export abstract class KlosterweiherARSessionBase {
  // Model URLs
  protected rodUrl = new URL('./models/Angel.glb', import.meta.url).href;
  protected fishUrls = [
    new URL('./models/Forelle.glb', import.meta.url).href,
    new URL('./models/Neunauge.glb', import.meta.url).href,
    new URL('./models/Zander.glb', import.meta.url).href,
    new URL('./models/Schleie.glb', import.meta.url).href,
    new URL('./models/Döbel.glb', import.meta.url).href,
    new URL('./models/Rotauge.glb', import.meta.url).href,
    new URL('./models/Rotfeder.glb', import.meta.url).href,
    new URL('./models/Stichling.glb', import.meta.url).href,
    new URL('./models/Karpfen.glb', import.meta.url).href,
  ];
  protected waterUrl = new URL('./models/Wasser.glb', import.meta.url).href;

  // 3D Objects
  public fish: THREE.Object3D | null = null;
  public fishes: THREE.Object3D[] = [];
  protected fishMixers: THREE.AnimationMixer[] = [];
  protected fishAnimations: THREE.AnimationClip[][] = [];
  public rod: THREE.Object3D | null = null;
  public water: THREE.Object3D | null = null;
  public currentFishIndex = 0;
  protected cameraLight: THREE.PointLight | null = null;

  // Fishing state
  public tapCount = 0;
  public hasCaughtFish = false;
  public onFishCaught?: (fishName: string) => void;
  public onFishReleased?: () => void;

  /**
   * Controls the fishing rod animation when user taps
   */
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

  /**
   * Catch a fish animation sequence
   */
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
        const fishName = this.extractFishName(this.fishUrls[this.currentFishIndex]);
        this.onFishCaught?.(fishName);
      }
    });
  }

  /**
   * Release current fish and select a new random fish
   */
  releaseCurrentFish() {
    if (!this.fish) return;
    const activeMixer = this.fishMixers[this.currentFishIndex];
    activeMixer?.stopAllAction();
    this.fish.visible = false;
    this.fish.position.set(0, this.getFishInitialPositionY(), this.getFishInitialPositionZ());
    this.fish.rotation.set(0, Math.PI / 2, 0);

    // Select random fish
    this.currentFishIndex = Math.floor(Math.random() * this.fishes.length);
    this.fish = this.fishes[this.currentFishIndex];
    this.fish.position.set(0, this.getFishInitialPositionY(), this.getFishInitialPositionZ());
    this.fish.rotation.set(0, Math.PI / 2, 0);
    this.fish.visible = false;

    this.tapCount = 0;
    this.hasCaughtFish = false;
    this.onFishReleased?.();

    if (this.rod) {
      gsap.to(this.rod.position, {
        x: this.getRodInitialPositionX(),
        duration: this.getRodReleaseDuration(),
      });
    }
  }

  /**
   * Play animation for the currently selected fish
   */
  protected playCurrentFishAnimation() {
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
   * Extract fish name from model URL
   */
  protected extractFishName(url: string): string {
    // Extract filename from URL (e.g., "Rotauge.glb" from the URL)
    const match = url.match(/([^/]+)\.glb/);
    if (match && match[1]) {
      return match[1];
    }
    return 'Fisch';
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
