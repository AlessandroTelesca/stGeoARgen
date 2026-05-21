import React, { useEffect, useRef, useState } from 'react';
import { ARComponentBase } from '../ARComponentBase';
import { ARProximityGate } from '../ARProximityGate';
import { GyroARVisualizer } from '../../../ARbackend/GyroARVisualizer';
import { AR_VIEW_STATION_MAP } from '../../../data/stationsConfig';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getGlockenspielTexts } from '../../../i18n/stations/glockenspiel';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

// TODO: Replace with your own glockenturm.glb model
// Place the GLB file in: src/components/ARComponents/glockenspiel/models/glockenturm.glb
const GLOCKENTURM_MODEL_URL = new URL('./models/glockenturm.glb', import.meta.url).href;

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
  currentStationPoints?: number;
  onCompleteStation?: (stationId: number) => void;
  isCurrentStationCompleted?: boolean;
  isGuestMode?: boolean;
}

class GlockenspielARSession extends GyroARVisualizer {
  private glockenspielGroup: THREE.Group | null = null;
  private bellTargets: THREE.Object3D[] = [];
  private bellColliders: THREE.Mesh[] = [];
  private interactionRaycaster = new THREE.Raycaster();
  private cameraDirection = new THREE.Vector3();
  private audioContext: AudioContext | null = null;
  private bellSounds: AudioBuffer[] = [];
  private lastPlayedBell = -1;
  private playCooldown = 0;
  private audioUnlocked = false;
  private debugVisualsEnabled = false;
  private waveRings: Array<{ mesh: THREE.Mesh; life: number }> = [];
  private lastUpdateTime = Date.now();
  private basePosition = new THREE.Vector3(0, 0, -10);
  private placementCameraPose: { position: THREE.Vector3; quaternion: THREE.Quaternion } | null = null;
  private hasPlacedTower = false;
  private sceneUpdateAnimationId: number | null = null;
  // Touch/Zoom/Rotate properties
  private touchStartDistance = 0;
  private lastTouchX = 0;
  private lastTouchY = 0;
  private initialCameraDistance = 3.5;
  private readonly zoomInLimit = 3.5;
  private readonly zoomOutLimit = 8.5;
  // Zoom state to temporarily disable rotation while pinching
  private isZooming = false;

  constructor(container: HTMLDivElement, videoElement: HTMLVideoElement, onError?: (err: unknown) => void) {
    super(container, videoElement, { onError });
    this.initAudio();
    this.initialCameraDistance = 4.0;
  }

  async init(): Promise<void> {
    // Call parent init (starts GyroARVisualizer's animate loop with gyro updates)
    await super.init();
    // Start separate loop for updateScene (raycasting, wave rings, etc.)
    this.startSceneUpdateLoop();
  }

  private startSceneUpdateLoop(): void {
    const loop = (): void => {
      this.updateScene();
      this.sceneUpdateAnimationId = requestAnimationFrame(loop);
    };
    this.sceneUpdateAnimationId = requestAnimationFrame(loop);
  }

  private async initAudio() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      await this.createBellSounds();
    } catch (err) {
      console.warn('Audio init failed', err);
    }
  }

  private async createBellSounds() {
    if (!this.audioContext) return;
    // 16 bell frequencies (C major scale extended)
    const frequencies = [
      261.63,  // C4
      293.66,  // D4
      329.63,  // E4
      349.23,  // F4
      392.00,  // G4
      440.00,  // A4
      493.88,  // B4
      523.25,  // C5
      587.33,  // D5
      659.25,  // E5
      698.46,  // F5
      783.99,  // G5
      880.00,  // A5
      987.77,  // B5
      1046.50, // C6
      1174.66  // D6
    ];
    for (const frequency of frequencies) {
      const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 2, this.audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < buffer.length; i++) {
        const t = i / this.audioContext.sampleRate;
        let sample = 0;
        sample += Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * 2);
        sample += Math.sin(2 * Math.PI * frequency * 2 * t) * Math.exp(-t * 3) * 0.5;
        sample += Math.sin(2 * Math.PI * frequency * 3 * t) * Math.exp(-t * 4) * 0.3;
        data[i] = sample * 0.3;
      }
      this.bellSounds.push(buffer);
    }
  }

  public async playSequence(sequence: number[]): Promise<void> {
    for (const index of sequence) {
      this.playBellSound(index);
      // wait between notes
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  private playBellSound(index: number) {
    if (!this.audioContext) {
      console.warn('[Glockenspiel] No audioContext available');
      return;
    }
    if (this.bellSounds.length === 0) {
      console.warn('[Glockenspiel] No bell sounds generated yet');
      return;
    }
    if (index < 0 || index >= this.bellSounds.length) {
      console.warn('[Glockenspiel] Requested bell index out of range', index);
      return;
    }
    if (this.lastPlayedBell === index && this.playCooldown > 0) return;
    try {
      // Some browsers start the AudioContext in 'suspended' state until a user gesture.
      if (this.audioContext.state === 'suspended') {
        // attempt resume; ignore rejection but log it
        this.audioContext.resume().catch((e) => console.warn('[Glockenspiel] audioContext.resume() failed', e));
      }

      const source = this.audioContext.createBufferSource();
      source.buffer = this.bellSounds[index];
      source.connect(this.audioContext.destination);
      source.start();
      if (navigator.vibrate) navigator.vibrate(30);

      const bell = this.bellTargets.find((target) => (target.userData as any).bellIndex === index);
      if (bell) this.createBellWave(bell);
      this.lastPlayedBell = index;
      this.playCooldown = 30;
    } catch (err) {
      console.warn('playBellSound failed', err);
    }
  }

  private createBellWave(bell: THREE.Object3D) {
    if (!this.scene) return;
    // Larger, more visible wave rings
    const ringGeometry = new THREE.RingGeometry(0.12, 0.18, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xfff5ba, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    const bellWorldPosition = new THREE.Vector3();
    bell.getWorldPosition(bellWorldPosition);
    ring.position.copy(bellWorldPosition);
    ring.position.y += 0.05; // above the bell
    ring.renderOrder = 999;
    this.scene.add(ring);
    this.waveRings.push({ mesh: ring, life: 1 });
  }

  public setCameraPositionAndLookAt(x: number, y: number, z: number): void {
    if (!this.camera) return;
    this.camera.position.set(x, y, z);
    this.initialCameraDistance = z;
    this.camera.lookAt(0, 0.25, 0);
  }

  public setTowerPosition(): void {
    if (!this.glockenspielGroup || this.hasPlacedTower) return;
    // Tower stays at origin (0, 0, 0) — camera looks at it
    this.glockenspielGroup.position.set(0, 0, 0);
    this.hasPlacedTower = true;
  }

  public async stabilizeAndPlace(durationMs = 600): Promise<void> {
    if (!this.glockenspielGroup || this.hasPlacedTower) return;
    // Tower stays at origin
    this.glockenspielGroup.position.set(0, 0, 0);
    this.hasPlacedTower = true;
  }

  protected initThree(): void {
    super.initThree();
    if (!this.scene) return;
    if (this.renderer) {
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.setClearAlpha(0);
    }
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);

    this.glockenspielGroup = new THREE.Group();
    this.scene.add(this.glockenspielGroup);
    // Shift wrapper slightly right and down so the tower appears more centered on screen.
    this.glockenspielGroup.position.set(0, -3, 0);
    
    // Load model (with fallback to procedural bells)
    this.loadGlockenspielModel();
    
    // Setup touch/zoom/rotate controls
    this.setupTouchControls();
  }

  private setupTouchControls(): void {
    // Use window/document for touch events (public access)
    window.addEventListener('touchstart', (e) => this.onTouchStart(e), false);
    window.addEventListener('touchmove', (e) => this.onTouchMove(e), false);
    window.addEventListener('touchend', (e) => this.onTouchEnd(e), false);
    // Disable window scrolling
    document.body.style.overflow = 'hidden';
    document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  }

  private async onTouchStart(event: TouchEvent): Promise<void> {
    console.log('[Glockenspiel] touchstart, touches=', event.touches.length);
    // Ensure audioContext exists and is unlocked on first user gesture
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('[Glockenspiel] created AudioContext on touch');
        await this.createBellSounds();
        this.audioUnlocked = true;
        console.log('[Glockenspiel] bell sounds generated after creating AudioContext');
      } else if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        this.audioUnlocked = true;
        console.log('[Glockenspiel] audioContext resumed on touch');
      }
    } catch (e) {
      console.warn('[Glockenspiel] audio init/resume failed on touch', e);
    }

    // Enable debug visuals on first touch for troubleshooting
    if (!this.debugVisualsEnabled) {
      console.log('[Glockenspiel] enabling debug visuals');
      this.enableDebugVisuals(true);
    }
    if (event.touches.length === 2) {
      // Two-finger pinch for zoom
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      this.touchStartDistance = Math.sqrt(dx * dx + dy * dy);
      this.isZooming = true;
    } else if (event.touches.length === 1) {
      // One-finger drag to rotate the model
      this.lastTouchX = event.touches[0].clientX;
      this.lastTouchY = event.touches[0].clientY;
    }
  }

  private onTouchMove(event: TouchEvent): void {
    if (event.touches.length === 2) {
      // Pinch zoom
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      const currentDistance = Math.sqrt(dx * dx + dy * dy);
      const delta = currentDistance - this.touchStartDistance;
      
      if (this.camera && Math.abs(delta) > 5) {
        const zoomSpeed = 0.015;
        const target = new THREE.Vector3(0, 0.25, 0);
        const direction = this.camera.position.clone().sub(target).normalize();
        const distanceToTarget = this.camera.position.distanceTo(target);
        const nextDistance = THREE.MathUtils.clamp(
          distanceToTarget + delta * zoomSpeed,
          this.zoomInLimit,
          this.zoomOutLimit
        );
        const moveAmount = nextDistance - distanceToTarget;
        this.camera.position.addScaledVector(direction, moveAmount);
        this.initialCameraDistance = nextDistance;
        this.touchStartDistance = currentDistance;
      }
    } else if (event.touches.length === 1 && this.glockenspielGroup && !this.isZooming) {
      const deltaX = event.touches[0].clientX - this.lastTouchX;
      const rotationSpeed = 0.01;
      this.glockenspielGroup.rotation.y += deltaX * rotationSpeed;
      this.lastTouchX = event.touches[0].clientX;
      this.lastTouchY = event.touches[0].clientY;
    }
  }

  private onTouchEnd(event: TouchEvent): void {
    this.touchStartDistance = 0;
    // Exit zoom mode when no touches remain
    if (!event.touches || event.touches.length === 0) {
      this.isZooming = false;
    }
  }

  private async loadGlockenspielModel(): Promise<void> {
    try {
      // Try fast load without DRACO first (if GLB is not DRACO-compressed)
      const model = await this.loadGlockenspielModelFast(GLOCKENTURM_MODEL_URL);
      if (this.glockenspielGroup) {
        this.centerLoadedModel(model);
        this.glockenspielGroup.add(model);
      }
      // Auto-register bell meshes from the model (search for meshes named "bell_0", "bell_1", etc.)
      this.registerBellsFromModel();
      // If registration didn't find any bell targets, create a fallback procedural set
      if (this.bellTargets.length === 0) {
        console.log('[Glockenspiel] No bell targets found — creating fallback bells');
        this.createFallbackBells();
      }
    } catch (err) {
      console.warn('[Glockenspiel] Failed to load model', err);
    }
  }

  private loadGlockenspielModelFast(url: string): Promise<THREE.Object3D> {
    // Fast loader without DRACO (works for non-compressed GLB files)
    if (!this.scene) return Promise.reject(new Error('Scene not initialized'));
    
    const loader = new GLTFLoader();
    // Do NOT set DRACO loader for faster loading
    
    return new Promise<THREE.Object3D>((resolve, reject) => {
      loader.load(
        url,
        (gltf) => {
          const model = gltf.scene;
          resolve(model);
        },
        (progress) => {
          // Optional: log progress
          console.log(`[Glockenspiel] Loading: ${Math.round((progress.loaded / progress.total) * 100)}%`);
        },
        (err) => reject(err)
      );
    });
  }

  private centerLoadedModel(model: THREE.Object3D): void {
    // Center the loaded model in its parent group and place its base on the floor.
    const bbox = new THREE.Box3().setFromObject(model);
    const center = bbox.getCenter(new THREE.Vector3());
    const size = bbox.getSize(new THREE.Vector3());
    model.position.sub(center);
    model.position.y += size.y * 0.5;
  }

  private registerBellsFromModel(): void {
    if (!this.glockenspielGroup) return;
    this.bellTargets = [];
    this.bellColliders = [];

    const candidateObjects: Array<{ object: THREE.Object3D; index: number }> = [];
    const fallbackObjects: THREE.Object3D[] = [];
    const allMeshes: THREE.Mesh[] = [];
    this.glockenspielGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        allMeshes.push(child);
      }
      const lowercaseName = (child.name || '').toLowerCase();
      if (!/\b(?:bell|glocke)\b/.test(lowercaseName)) return;

      const bellMatch = lowercaseName.match(/(\d{1,2})/);
      if (bellMatch) {
        const index = Number(bellMatch[1]);
        if (Number.isFinite(index)) {
          candidateObjects.push({ object: child, index });
        }
      } else {
        fallbackObjects.push(child);
      }
    });

    // If no explicit named bell objects found, try a position-based heuristic
    if (candidateObjects.length === 0) {
      // Heuristic: pick up to 16 meshes that look like bells (smallish meshes above base)
      const candidates = allMeshes
        .map((m) => {
          const bbox = new THREE.Box3().setFromObject(m);
          const size = bbox.getSize(new THREE.Vector3());
          return { mesh: m, bbox, size };
        })
        .filter((item) => {
          // filter out very large parts (base) and extremely small floating bits
          const maxDim = Math.max(item.size.x, item.size.y, item.size.z);
          return maxDim > 0.02 && maxDim < 1.2;
        });

      if (candidates.length > 0) {
        // sort by Y (vertical) descending so top rows first, then by X
        candidates.sort((a, b) => {
          const ay = a.bbox.getCenter(new THREE.Vector3()).y;
          const by = b.bbox.getCenter(new THREE.Vector3()).y;
          if (Math.abs(ay - by) > 0.01) return by - ay; // higher first
          const ax = a.bbox.getCenter(new THREE.Vector3()).x;
          const bx = b.bbox.getCenter(new THREE.Vector3()).x;
          return ax - bx;
        });
        const take = Math.min(16, candidates.length);
        for (let i = 0; i < take; i++) {
          const obj = candidates[i].mesh;
          const bellIndex = i;
          obj.userData = { ...(obj.userData as object), bellIndex };
          this.bellTargets.push(obj);
          const collider = this.createBellCollider(obj, bellIndex);
          this.bellColliders.push(collider);
          console.log('[Glockenspiel] heuristic matched bell target', bellIndex, obj.name || obj.type, obj);
        }
      }
    }

    if (candidateObjects.length > 0) {
      candidateObjects.sort((a, b) => a.index - b.index);
      candidateObjects.forEach((candidate) => {
        const bellObject = candidate.object;
        const bellIndex = candidate.index;
        if (bellIndex < 0 || bellIndex >= 16) return;

        bellObject.userData = { ...(bellObject.userData as object), bellIndex };
        this.bellTargets.push(bellObject);
        const collider = this.createBellCollider(bellObject, bellIndex);
        this.bellColliders.push(collider);
        console.log('[Glockenspiel] bell target', bellIndex, bellObject.name || bellObject.type, bellObject);
      });
    } else if (fallbackObjects.length > 0) {
      fallbackObjects.forEach((obj, candidateIndex) => {
        const bellIndex = candidateIndex;
        if (bellIndex >= 16) return;

        obj.userData = { ...(obj.userData as object), bellIndex };
        this.bellTargets.push(obj);
        const collider = this.createBellCollider(obj, bellIndex);
        this.bellColliders.push(collider);
        console.log('[Glockenspiel] fallback bell target', bellIndex, obj.name || obj.type, obj);
      });
    }

    if (this.bellTargets.length === 0) {
      console.warn('[Glockenspiel] No bell targets found in model');
    }
  }

  private createFallbackBells() {
    if (!this.glockenspielGroup) return;
    this.bellTargets = [];
    this.bellColliders = [];
    
    // Add a simple tower base
    const baseGeometry = new THREE.CylinderGeometry(0.4, 0.5, 1.0, 8);
    const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x8B7355 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.5;
    this.glockenspielGroup.add(base);

    // 16 bell spheres arranged in 4 rows of 4
    const bellPositions = [
      // Row 1 (bottom)
      { x: -0.30, y: 1.5, z: -0.30 },
      { x: -0.10, y: 1.5, z: -0.30 },
      { x: 0.10, y: 1.5, z: -0.30 },
      { x: 0.30, y: 1.5, z: -0.30 },
      // Row 2
      { x: -0.30, y: 1.8, z: -0.10 },
      { x: -0.10, y: 1.8, z: -0.10 },
      { x: 0.10, y: 1.8, z: -0.10 },
      { x: 0.30, y: 1.8, z: -0.10 },
      // Row 3
      { x: -0.30, y: 2.1, z: 0.10 },
      { x: -0.10, y: 2.1, z: 0.10 },
      { x: 0.10, y: 2.1, z: 0.10 },
      { x: 0.30, y: 2.1, z: 0.10 },
      // Row 4 (top)
      { x: -0.30, y: 2.4, z: 0.30 },
      { x: -0.10, y: 2.4, z: 0.30 },
      { x: 0.10, y: 2.4, z: 0.30 },
      { x: 0.30, y: 2.4, z: 0.30 }
    ];
    
    // 16 distinct colors (rainbow gradient)
    const bellColors = [
      0xFF0000, // Red
      0xFF7F00, // Orange
      0xFFFF00, // Yellow
      0x00FF00, // Green
      0x00FFFF, // Cyan
      0x0000FF, // Blue
      0x4B0082, // Indigo
      0x9400D3, // Violet
      0xFF1493, // Deep Pink
      0x00CED1, // Dark Turquoise
      0x32CD32, // Lime Green
      0xFFD700, // Gold
      0xDC143C, // Crimson
      0x00FA9A, // Medium Spring Green
      0x1E90FF, // Dodger Blue
      0xFFB6C1  // Light Pink
    ];

    bellPositions.forEach((pos, index) => {
      const bellGeometry = new THREE.SphereGeometry(0.06, 16, 12);
      const bellMaterial = new THREE.MeshStandardMaterial({ color: bellColors[index], metalness: 0.8, roughness: 0.2 });
      const bell = new THREE.Mesh(bellGeometry, bellMaterial);
      bell.position.set(pos.x, pos.y, pos.z);
      bell.userData = { bellIndex: index };
      this.glockenspielGroup!.add(bell);
      this.bellTargets.push(bell);
      const collider = this.createBellCollider(bell, index);
      this.bellColliders.push(collider);
    });
  }

  private updateScene(): void {
    if (!this.glockenspielGroup || !this.camera || !this.scene) return;
    const now = performance.now();
    const deltaSeconds = Math.min(0.06, (now - this.lastUpdateTime) / 1000);
    this.lastUpdateTime = now;
    const time = now * 0.001;

    // No automatic rotation — user-controlled rotation should persist.

    if (this.waveRings.length > 0) {
      this.waveRings = this.waveRings.filter((wave) => {
        wave.life -= deltaSeconds * 1.5;
        const scale = 1 + (1 - wave.life) * 2.4;
        wave.mesh.scale.set(scale, scale, scale);
        const material = wave.mesh.material as THREE.MeshBasicMaterial;
        material.opacity = Math.max(0, wave.life * 0.4);
        if (wave.life <= 0) {
          this.scene?.remove(wave.mesh);
          wave.mesh.geometry.dispose();
          material.dispose();
          return false;
        }
        return true;
      });
    }

    const scene = this.scene;
    if (!scene) return;

    // Interaction via center-of-screen raycast
    this.interactionRaycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    let bellIntersects = this.interactionRaycaster.intersectObjects(this.bellColliders, true);
    if (bellIntersects.length === 0 && this.bellTargets.length > 0) {
      bellIntersects = this.interactionRaycaster.intersectObjects(this.bellTargets, true);
    }
    const bellIntersect = bellIntersects.length > 0 ? bellIntersects[0] : null;
    const isBlocked = bellIntersect
      ? this.interactionRaycaster
          .intersectObjects(scene.children, true)
          .filter((hit) => {
            const userData = hit.object.userData as any;
            const isBellObject = typeof userData?.bellIndex === 'number' || this.isBellCollider(hit.object);
            return !isBellObject;
          })
          .some((hit) => hit.distance < bellIntersect.distance - 1e-4)
      : false;

    if (bellIntersect && !isBlocked) {
      const bellIndex = this.getBellIndexFromObject(bellIntersect.object);
      if (bellIndex !== null) {
        this.setBellHighlight(bellIndex, 0x444400);
        if (this.lastPlayedBell !== bellIndex || this.playCooldown === 0) {
          this.playBellSound(bellIndex);
        }
      }
    } else {
      this.setBellHighlight(null, 0x000000);
    }

    if (this.playCooldown > 0) this.playCooldown--;
  }

  private createBellCollider(bell: THREE.Object3D, index: number): THREE.Mesh {
    const bbox = new THREE.Box3().setFromObject(bell);
    const size = bbox.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z) * 0.45 + 0.01;
    const colliderGeometry = new THREE.SphereGeometry(radius, 12, 10);
    const colliderMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true, transparent: true, opacity: 0.35, depthWrite: false });
    const collider = new THREE.Mesh(colliderGeometry, colliderMaterial);
    collider.renderOrder = 9999;
    collider.frustumCulled = false;
    collider.name = `bellCollider_${index}`;
    collider.userData = { bellIndex: index, isBellCollider: true };
    collider.position.set(0, 0, 0);
    bell.add(collider);
    this.createBellDebugLabel(bell, index);
    return collider;
  }

  private createBellDebugLabel(bell: THREE.Object3D, index: number): void {
    const labelText = bell.name ? `${bell.name}` : `bell_${index}`;
    const canvas = document.createElement('canvas');
    const size = 128;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#ff6666';
    ctx.font = 'bold 26px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, size / 2, size / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(0.5, 0.25, 1);
    sprite.position.set(0, 0.2, 0);
    sprite.renderOrder = 9999;
    sprite.frustumCulled = false;
    (sprite.material as THREE.SpriteMaterial).depthTest = false;
    bell.add(sprite);
    // store reference so we can toggle visibility later
    try {
      (bell.userData as any).debugLabel = sprite;
    } catch (e) {
      // ignore
    }
  }

  private enableDebugVisuals(enabled: boolean): void {
    this.debugVisualsEnabled = enabled;
    // Toggle collider visibility and label visibility
    this.bellColliders.forEach((collider) => {
      const mat = collider.material as THREE.Material & { opacity?: number };
      if (enabled) {
        (mat as any).opacity = 0.45;
        (mat as any).transparent = true;
      } else {
        (mat as any).opacity = 0.0;
        (mat as any).transparent = true;
      }
      if ((mat as any).needsUpdate !== undefined) (mat as any).needsUpdate = true;
      collider.visible = enabled;
    });
    this.bellTargets.forEach((target) => {
      const label = (target.userData as any).debugLabel as THREE.Sprite | undefined;
      if (label) {
        label.visible = enabled;
        label.frustumCulled = false;
      }
    });
  }

  private setBellHighlight(activeIndex: number | null, color: number): void {
    this.bellColliders.forEach((collider) => {
      const index = (collider.userData as any).bellIndex;
      const material = collider.material as THREE.MeshBasicMaterial;
      if (!material) return;
      if (activeIndex !== null && index === activeIndex) {
        material.color.setHex(color);
        material.opacity = 0.55;
      } else {
        material.color.setHex(0xff0000);
        material.opacity = 0.25;
      }
      material.needsUpdate = true;
    });
  }

  private isBellCollider(object: THREE.Object3D): boolean {
    return !!(object.userData as any).isBellCollider;
  }

  private getBellIndexFromObject(object: THREE.Object3D): number | null {
    let current: THREE.Object3D | null = object;
    while (current) {
      const userData = current.userData as any;
      if (typeof userData?.bellIndex === 'number') {
        return userData.bellIndex;
      }
      current = current.parent;
    }
    return null;
  }

  public dispose(): void {
    if (this.sceneUpdateAnimationId !== null) {
      cancelAnimationFrame(this.sceneUpdateAnimationId);
    }
    // Remove touch event listeners
    window.removeEventListener('touchstart', (e) => this.onTouchStart(e));
    window.removeEventListener('touchmove', (e) => this.onTouchMove(e));
    window.removeEventListener('touchend', (e) => this.onTouchEnd(e));
    document.removeEventListener('touchmove', (e) => e.preventDefault());
    if (this.audioContext) {
      this.audioContext.close();
    }
    document.body.style.overflow = 'auto'; // restore scrolling
    super.stop();
  }
}

export const GlockenspielView: React.FC<ARViewProps> = (props) => {
  const { onNavigateHome, username, onLogin, onLogout, onNavigateProfile, onRegister, completedStations, totalStations, totalPoints, currentStationPoints = 0, onCompleteStation, isCurrentStationCompleted = false, isGuestMode = false } = props;
  const { language } = useLanguage();
  const glockenspielTexts = getGlockenspielTexts(language);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<GlockenspielARSession | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [hasSeen, setHasSeen] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthorized || !containerRef.current || !videoRef.current) return;
    setIsLoading(true);
    const session = new GlockenspielARSession(containerRef.current, videoRef.current, (e) => console.error('AR init error', e));
    sessionRef.current = session;
    session.init().catch((err) => {
      console.error('[GlockenspielView] AR init error:', err);
      setInitError(err instanceof Error ? err.message : String(err));
    }).finally(() => {
      setIsLoading(false);
    });
    return () => {
      sessionRef.current?.dispose();
      sessionRef.current = null;
    };
  }, [isAuthorized]);

  const handleConfirmSight = () => {
    setHasSeen(true);
  };

  const handleBeginExperience = async () => {
    if (!sessionRef.current) return;
    // Set camera to fixed viewing position: higher and further away
    sessionRef.current.setCameraPositionAndLookAt(0, 2.0, 4.0);
    // Place tower at origin
    try {
      await sessionRef.current.stabilizeAndPlace(600);
    } catch (err) {
      sessionRef.current.setTowerPosition();
    }
    setHasStarted(true);
  };

  return (
    <ARProximityGate stationId={AR_VIEW_STATION_MAP['glockenspiel']} stationName={glockenspielTexts.stationName} onNavigateBack={onNavigateHome} onAccessGranted={() => setIsAuthorized(true)}>
      <div className="relative w-full h-full glockenspiel-ar">
        <style>{`.glockenspiel-ar .ar-container { background-color: transparent !important; }`}</style>
        <ARComponentBase
          onNavigateHome={onNavigateHome}
          closeARViewKey="closeGlockenspielView"
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
          currentStationId={1}
          currentStationTitle={glockenspielTexts.stationName}
          currentStationPoints={currentStationPoints}
          onCompleteStation={onCompleteStation}
          isCurrentStationCompleted={isCurrentStationCompleted}
          isGuestMode={isGuestMode}
        />

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 pointer-events-none">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-white mb-4 mx-auto" />
              <p className="text-white text-sm">Lädt Glockenspiel...</p>
            </div>
          </div>
        )}

        {!initError && !isLoading && (
          <div className="pointer-events-none fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2" style={{ zIndex: 9999 }}>
            <div className="relative z-50 w-12 h-12">
              <div className="absolute inset-0 rounded-full border border-yellow-400/80 blur-sm opacity-80" />
              <div className="absolute inset-0 rounded-full border border-white/80 flex items-center justify-center shadow-[0_0_12px_rgba(0,0,0,0.45)]">
                <div className="absolute left-1/2 top-0 w-[2px] h-full bg-white/80 -translate-x-1/2" />
                <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white/80 -translate-y-1/2" />
                <div className="w-2 h-2 rounded-full bg-white shadow-md" />
              </div>
            </div>
          </div>
        )}

        {/* Intro overlays */}
        {!hasSeen && !initError && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="pointer-events-auto bg-black/50 p-6 rounded-lg text-white text-center">
              <h2 className="text-lg font-bold mb-2">Ich sehe das Glockenspiel</h2>
              <p className="text-sm mb-4">Bitte richte die Kamera so aus, dass du das Glockenspiel im Raum siehst.</p>
              <div className="flex gap-2 justify-center">
                <button className="bg-white text-black px-4 py-2 rounded" onClick={handleConfirmSight}>Ich sehe das Glockenspiel</button>
              </div>
            </div>
          </div>
        )}

        {hasSeen && !hasStarted && (
          <div className="absolute inset-0 flex items-end justify-center p-6 pointer-events-none">
            <div className="pointer-events-auto bg-white/90 p-4 rounded-lg text-center">
              <p className="mb-3">Bereit? Platziere das Glockenspiel 3 Meter vor dir.</p>
              <div className="flex gap-2 justify-center">
                <button className="bg-primary text-white px-4 py-2 rounded" onClick={handleBeginExperience}>Mit dem Erlebnis beginnen</button>
              </div>
            </div>
          </div>
        )}

        {hasStarted && (
          <>
            <div className="pointer-events-none absolute bottom-6 left-0 right-0 text-center px-4">
              <p className="text-sm text-white/95 drop-shadow-lg font-semibold">
                Richte das Fadenkreuz auf eine Glocke, um sie zum Klingen zu bringen.
              </p>
            </div>
          </>
        )}

        {initError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white p-4 rounded shadow">AR konnte nicht gestartet werden: {initError}</div>
          </div>
        )}
      </div>
    </ARProximityGate>
  );
};

export default GlockenspielView;

