import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ARComponentBase } from '../ARComponentBase';
import { ARProximityGate } from '../ARProximityGate';
import { GyroARVisualizer } from '../../../ARbackend/GyroARVisualizer';
import { AR_VIEW_STATION_MAP } from '../../../data/stationsConfig';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getGlockenspielTexts } from '../../../i18n/stations/glockenspiel';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { findNearestVisibleBellHit, getBellColliderRadius } from './hitDetection';
import { createScrollLockController } from './scrollLock';
import { clampMelodyLength, getRecentOtherUserMelodies, getLatestOtherUserMelody, getPlaybackDelayMs, parseMelody, serializeMelody, StoredMelodyEntry, type MelodyNote } from './melody';
import { withTimeout } from './loading';
import { ARStartCard } from '../ARStartCard';
import { Bell } from 'lucide-react';
import { asset } from '../../../lib/asset';
import { API_BASE_URL, getAuthToken } from '../../../services/api';

// TODO: Replace with your own glockenturm.glb model
// Place the GLB file in: src/components/ARComponents/glockenspiel/models/glockenturm.glb
const GLOCKENTURM_MODEL_URL = new URL('./models/glockenturm.glb', import.meta.url).href;
const GLOCKENSPIEL_PANORAMA_URL = asset('/images/360/glockenspiel.jpg');
const GLOCKENSPIEL_PANORAMA_FALLBACK_URL = asset('/images/360/bahnhof.jpg');

function loadPanoramaTexture(url: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        resolve(texture);
      },
      undefined,
      (error) => reject(error)
    );
  });
}

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
  private modelLoadPromise: Promise<void> | null = null;
  private modelLoaded = false;
  private sceneUpdateAnimationId: number | null = null;
  private modelReadyPromise: Promise<void> | null = null;
  // Touch/Zoom/Rotate properties
  private touchStartDistance = 0;
  private lastTouchX = 0;
  private lastTouchY = 0;
  private initialCameraDistance = 3.5;
  private readonly zoomInLimit = 3.5;
  private readonly zoomOutLimit = 8.5;
  // Zoom state to temporarily disable rotation while pinching
  private isZooming = false;
  private isRecordingMelody = false;
  private isPlaybackActive = false;
  private interactionEnabled = true;
  private recordedMelody: MelodyNote[] = [];
  private lastRecordedNoteTime = 0;
  private readonly maxRecordedMelodyLength = 96;
  private activeBellHighlight: { bell: THREE.Object3D; expiresAt: number } | null = null;
  private readonly scrollLock = createScrollLockController(document);
  private readonly keyboardState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
  };
  private lastKeyboardUpdateTime = performance.now();
  private readonly handleTouchStart = (event: TouchEvent): void => {
    if (!this.interactionEnabled) return;
    void this.onTouchStart(event);
  };
  private readonly handleTouchMove = (event: TouchEvent): void => {
    if (!this.interactionEnabled) return;
    this.onTouchMove(event);
  };
  private readonly handleTouchEnd = (event: TouchEvent): void => {
    if (!this.interactionEnabled) return;
    this.onTouchEnd(event);
  };
  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.interactionEnabled) return;
    const key = event.key.toLowerCase();
    switch (key) {
      case 'w':
      case 'arrowup':
        this.keyboardState.forward = true;
        event.preventDefault();
        break;
      case 's':
      case 'arrowdown':
        this.keyboardState.backward = true;
        event.preventDefault();
        break;
      case 'a':
      case 'arrowleft':
        this.keyboardState.left = true;
        event.preventDefault();
        break;
      case 'd':
      case 'arrowright':
        this.keyboardState.right = true;
        event.preventDefault();
        break;
      case 'q':
        this.keyboardState.down = true;
        event.preventDefault();
        break;
      case 'e':
        this.keyboardState.up = true;
        event.preventDefault();
        break;
      default:
        break;
    }
  };
  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    if (!this.interactionEnabled) return;
    const key = event.key.toLowerCase();
    switch (key) {
      case 'w':
      case 'arrowup':
        this.keyboardState.forward = false;
        break;
      case 's':
      case 'arrowdown':
        this.keyboardState.backward = false;
        break;
      case 'a':
      case 'arrowleft':
        this.keyboardState.left = false;
        break;
      case 'd':
      case 'arrowright':
        this.keyboardState.right = false;
        break;
      case 'q':
        this.keyboardState.down = false;
        break;
      case 'e':
        this.keyboardState.up = false;
        break;
      default:
        break;
    }
  };

  constructor(container: HTMLDivElement, videoElement: HTMLVideoElement, onError?: (err: unknown) => void) {
    super(container, videoElement, { onError });
    this.initAudio();
    this.initialCameraDistance = 4.0;
  }

  public setInteractionEnabled(enabled: boolean): void {
    this.interactionEnabled = Boolean(enabled);
    if (!this.interactionEnabled) {
      // reset transient interaction state
      this.isZooming = false;
      this.keyboardState.forward = false;
      this.keyboardState.backward = false;
      this.keyboardState.left = false;
      this.keyboardState.right = false;
      this.keyboardState.up = false;
      this.keyboardState.down = false;
    }
  }

  async init(): Promise<void> {
    // Call parent init (starts GyroARVisualizer's animate loop with gyro updates)
    await super.init();

    // Remove debug helpers (GridHelper / AxesHelper) so the scene is clean
    if (this.scene) {
      const debugHelpers = this.scene.children.filter(
        (child) => child.type === 'GridHelper' || child.type === 'AxesHelper'
      );
      debugHelpers.forEach((helper) => this.scene?.remove(helper));
    }

    try {
      this.setPanoramaBackground(await loadPanoramaTexture(GLOCKENSPIEL_PANORAMA_URL));
    } catch (err) {
      try {
        this.setPanoramaBackground(await loadPanoramaTexture(GLOCKENSPIEL_PANORAMA_FALLBACK_URL));
      } catch (fallbackErr) {
        console.error('[GlockenspielARSession] Failed to load panorama texture', fallbackErr);
      }
    }

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

  public async playSequence(sequence: MelodyNote[]): Promise<void> {
    this.isPlaybackActive = true;
    try {
      for (let i = 0; i < sequence.length; i += 1) {
        const entry = sequence[i];
        await this.playBellSound(entry.index);
        if (i < sequence.length - 1) {
          const gapMs = entry.gapMsToNext > 0 ? entry.gapMsToNext : getPlaybackDelayMs(sequence.length);
          // eslint-disable-next-line no-await-in-loop
          await new Promise((resolve) => setTimeout(resolve, gapMs));
        }
      }
    } finally {
      this.isPlaybackActive = false;
    }
  }

  private async ensureAudioReady(): Promise<boolean> {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (err) {
        console.warn('[Glockenspiel] AudioContext creation failed', err);
        return false;
      }
    }

    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (err) {
        console.warn('[Glockenspiel] audioContext.resume() failed', err);
        return false;
      }
    }

    if (this.bellSounds.length === 0) {
      try {
        await this.createBellSounds();
      } catch (err) {
        console.warn('[Glockenspiel] bell sound generation failed', err);
        return false;
      }
    }

    this.audioUnlocked = true;
    return true;
  }

  private async playBellSound(index: number): Promise<void> {
    if (index < 0 || index >= this.bellSounds.length) {
      console.warn('[Glockenspiel] Requested bell index out of range', index);
      return;
    }
    if (this.lastPlayedBell === index && this.playCooldown > 0) return;

    if (this.isRecordingMelody) {
      const now = Date.now();
      if (this.recordedMelody.length > 0 && this.lastRecordedNoteTime > 0) {
        const previousNote = this.recordedMelody[this.recordedMelody.length - 1];
        previousNote.gapMsToNext = Math.max(0, now - this.lastRecordedNoteTime);
      }

      this.recordedMelody.push({ index, gapMsToNext: 0 });
      this.recordedMelody = clampMelodyLength(this.recordedMelody, this.maxRecordedMelodyLength);
      this.lastRecordedNoteTime = now;
    }

    const audioReady = await this.ensureAudioReady();
    if (!audioReady || !this.audioContext || this.bellSounds.length === 0) {
      console.warn('[Glockenspiel] No audioContext available');
      return;
    }

    try {
      const source = this.audioContext.createBufferSource();
      source.buffer = this.bellSounds[index];
      source.connect(this.audioContext.destination);
      source.start();
      if (navigator.vibrate) navigator.vibrate(30);

      const bell = this.bellTargets.find((target) => (target.userData as any).bellIndex === index);
      if (bell) {
        this.createBellWave(bell);
        this.flashBellMesh(bell);
      }
      this.lastPlayedBell = index;
      this.playCooldown = 30;
    } catch (err) {
      console.warn('playBellSound failed', err);
    }
  }

  private createBellWave(bell: THREE.Object3D) {
    if (!this.scene) return;
    const ringGeometry = new THREE.RingGeometry(0.08, 0.16, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xffe08a,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: false,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    const bellWorldPosition = new THREE.Vector3();
    bell.getWorldPosition(bellWorldPosition);
    ring.position.copy(bellWorldPosition);
    ring.position.y += 0.08;
    ring.renderOrder = 9999;
    this.scene.add(ring);
    this.waveRings.push({ mesh: ring, life: 1 });
  }

  private flashBellMesh(bell: THREE.Object3D): void {
    this.clearBellHighlight();
    const highlightDurationMs = 220;
    const meshes = this.getBellHighlightMeshes(bell);

    meshes.forEach((mesh) => {
      const material = mesh.material;
      if (Array.isArray(material)) {
        material.forEach((entry) => this.applyBellHighlight(entry, true));
      } else if (material) {
        this.applyBellHighlight(material, true);
      }
    });

    this.activeBellHighlight = {
      bell,
      expiresAt: performance.now() + highlightDurationMs,
    };
  }

  private getBellHighlightMeshes(bell: THREE.Object3D): THREE.Mesh[] {
    const isHighlightableMesh = (mesh: THREE.Mesh) => {
      if ((mesh.userData as any)?.isBellCollider) return false;
      if (this.isLikelyBellMesh(mesh)) return true;
      const lowercaseName = (mesh.name || '').toLowerCase();
      return /\b(?:bell|glocke|gong|tone)\b/.test(lowercaseName);
    };

    if (bell instanceof THREE.Mesh && isHighlightableMesh(bell)) {
      return [bell];
    }

    const meshes: THREE.Mesh[] = [];
    bell.children.forEach((child) => {
      if (child instanceof THREE.Mesh && isHighlightableMesh(child)) {
        meshes.push(child);
      }
    });

    if (meshes.length === 0) {
      bell.traverse((object) => {
        if (object !== bell && object instanceof THREE.Mesh && isHighlightableMesh(object)) {
          const parent = object.parent;
          if (parent && (parent === bell || parent.parent === bell || parent.parent?.parent === bell)) {
            meshes.push(object);
          }
        }
      });
    }

    return meshes;
  }

  private applyBellHighlight(material: THREE.Material, highlighted: boolean): void {
    if (!material) return;

    const state = (material.userData as { glockenspielHighlightState?: { color?: THREE.Color; emissive?: THREE.Color; emissiveIntensity?: number } }).glockenspielHighlightState;
    if (highlighted) {
      if (!state) {
        const nextState = {
          color: material instanceof THREE.MeshBasicMaterial || material instanceof THREE.MeshLambertMaterial || material instanceof THREE.MeshStandardMaterial
            ? material.color.clone()
            : undefined,
          emissive: material instanceof THREE.MeshLambertMaterial || material instanceof THREE.MeshStandardMaterial
            ? material.emissive.clone()
            : undefined,
          emissiveIntensity: material instanceof THREE.MeshLambertMaterial || material instanceof THREE.MeshStandardMaterial
            ? material.emissiveIntensity
            : undefined,
        };
        (material.userData as { glockenspielHighlightState?: typeof nextState }).glockenspielHighlightState = nextState;
      }

      if (material instanceof THREE.MeshBasicMaterial) {
        material.color.set(0xfff2a8);
      } else if (material instanceof THREE.MeshLambertMaterial || material instanceof THREE.MeshStandardMaterial) {
        material.color.set(0xfff2a8);
        material.emissive.set(0xfff2a8);
        material.emissiveIntensity = 1.35;
      }
    } else if (state) {
      if (state.color && (material instanceof THREE.MeshBasicMaterial || material instanceof THREE.MeshLambertMaterial || material instanceof THREE.MeshStandardMaterial)) {
        material.color.copy(state.color);
      }
      if (material instanceof THREE.MeshLambertMaterial || material instanceof THREE.MeshStandardMaterial) {
        if (state.emissive) material.emissive.copy(state.emissive);
        material.emissiveIntensity = state.emissiveIntensity ?? 0;
      }
    }
  }

  private clearBellHighlight(): void {
    if (!this.activeBellHighlight) return;

    const bell = this.activeBellHighlight.bell;
    this.getBellHighlightMeshes(bell).forEach((mesh) => {
      const material = mesh.material;
      if (Array.isArray(material)) {
        material.forEach((entry) => this.applyBellHighlight(entry, false));
      } else if (material) {
        this.applyBellHighlight(material, false);
      }
    });
    this.activeBellHighlight = null;
  }

  public startMelodyRecording(): void {
    this.isRecordingMelody = true;
    this.recordedMelody = [];
    this.lastRecordedNoteTime = 0;
  }

  public stopMelodyRecording(): MelodyNote[] {
    const melody = [...this.recordedMelody];
    this.isRecordingMelody = false;
    this.recordedMelody = [];
    this.lastRecordedNoteTime = 0;
    return melody;
  }

  public get isModelLoaded(): boolean {
    return this.modelLoaded;
  }

  public async waitForModelReady(): Promise<void> {
    if (this.modelLoaded) return;
    if (!this.modelLoadPromise) return;
    await this.modelLoadPromise;
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
    this.glockenspielGroup.position.set(0, -3, 0);

    this.modelLoadPromise = this.loadGlockenspielModel()
      .then(() => {
        this.modelLoaded = true;
      })
      .catch((err) => {
        this.modelLoaded = false;
        console.warn('[Glockenspiel] model load failed', err);
      });

    window.addEventListener('touchstart', this.handleTouchStart, false);
    window.addEventListener('touchmove', this.handleTouchMove, false);
    window.addEventListener('touchend', this.handleTouchEnd, false);
    window.addEventListener('keydown', this.handleKeyDown, false);
    window.addEventListener('keyup', this.handleKeyUp, false);
    document.addEventListener('keydown', this.handleKeyDown, false);
    document.addEventListener('keyup', this.handleKeyUp, false);
    this.scrollLock.lock();
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

    // Keep debug visuals disabled for the normal experience.
    if (this.debugVisualsEnabled) {
      this.enableDebugVisuals(false);
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
          distanceToTarget - delta * zoomSpeed,
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

  private updateKeyboardCameraPosition(deltaSeconds: number): void {
    if (!this.camera) return;
    if (!this.interactionEnabled) return;
    const { forward, backward, left, right, up, down } = this.keyboardState;
    if (!forward && !backward && !left && !right && !up && !down) return;

    const moveSpeed = 3.5; // units per second
    const moveAmount = moveSpeed * deltaSeconds;

    if (forward) {
      this.camera.translateZ(-moveAmount);
    }
    if (backward) {
      this.camera.translateZ(moveAmount);
    }
    if (left) {
      this.camera.translateX(-moveAmount);
    }
    if (right) {
      this.camera.translateX(moveAmount);
    }
    if (up) {
      this.camera.position.y += moveAmount;
    }
    if (down) {
      this.camera.position.y -= moveAmount;
    }
  }

  private async loadGlockenspielModel(): Promise<void> {
    try {
      const model = await withTimeout(this.loadGlockenspielModelFast(GLOCKENTURM_MODEL_URL), 8000, 'Glockenspiel model load timed out');
      if (this.glockenspielGroup) {
        this.centerLoadedModel(model);
        this.glockenspielGroup.add(model);
      }
      this.registerBellsFromModel();
      if (this.bellTargets.length === 0) {
        console.log('[Glockenspiel] No bell targets found — creating fallback bells');
        this.createFallbackBells();
      }
    } catch (err) {
      console.warn('[Glockenspiel] Failed to load model, using fallback scene', err);
      if (this.glockenspielGroup) {
        this.createFallbackBells();
      }
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

  private isLikelyBellMesh(mesh: THREE.Mesh): boolean {
    const lowercaseName = (mesh.name || '').toLowerCase();
    if (/\b(?:bell|glocke|gong|tone)\b/.test(lowercaseName) && !/\b(?:pillar|column|support|base|frame|tower|wall|step|rope|beam|stand|clamp)\b/.test(lowercaseName)) {
      return true;
    }

    const bbox = new THREE.Box3().setFromObject(mesh);
    const size = bbox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const minDim = Math.min(size.x, size.y, size.z);
    const center = bbox.getCenter(new THREE.Vector3());

    if (maxDim < 0.03 || maxDim > 1.6) return false;
    if (minDim <= 0.001) return false;

    const aspectRatio = maxDim / minDim;
    const isCompact = aspectRatio < 4.5;
    const isAboveBase = center.y > -0.4;

    return isCompact && isAboveBase;
  }

  private registerBellsFromModel(): void {
    if (!this.glockenspielGroup) return;
    this.bellTargets = [];
    this.bellColliders = [];

    const candidateObjects: Array<{ object: THREE.Object3D; index: number }> = [];
    const fallbackObjects: THREE.Object3D[] = [];
    const bellLikeMeshes: THREE.Mesh[] = [];

    this.glockenspielGroup.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      if (this.isLikelyBellMesh(child)) {
        bellLikeMeshes.push(child);
      }

      const lowercaseName = (child.name || '').toLowerCase();
      if (!/\b(?:bell|glocke|gong|tone)\b/.test(lowercaseName)) return;

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

    const bellObjectsToRegister: Array<{ object: THREE.Object3D; index: number | null }> = [];

    if (candidateObjects.length > 0) {
      candidateObjects.sort((a, b) => a.index - b.index);
      candidateObjects.forEach((candidate) => {
        bellObjectsToRegister.push({ object: candidate.object, index: candidate.index });
      });
    }

    const alreadyRegistered = new Set<THREE.Object3D>();
    bellObjectsToRegister.forEach(({ object }) => alreadyRegistered.add(object));

    const orderedBellLikeMeshes = [...bellLikeMeshes]
      .filter((mesh) => !alreadyRegistered.has(mesh))
      .sort((a, b) => {
        const bboxA = new THREE.Box3().setFromObject(a);
        const bboxB = new THREE.Box3().setFromObject(b);
        const centerA = bboxA.getCenter(new THREE.Vector3());
        const centerB = bboxB.getCenter(new THREE.Vector3());
        if (Math.abs(centerA.y - centerB.y) > 0.01) return centerB.y - centerA.y;
        return centerA.x - centerB.x;
      });

    orderedBellLikeMeshes.forEach((mesh) => {
      bellObjectsToRegister.push({ object: mesh, index: null });
    });

    if (bellObjectsToRegister.length === 0 && fallbackObjects.length > 0) {
      fallbackObjects.forEach((obj) => {
        bellObjectsToRegister.push({ object: obj, index: null });
      });
    }

    const assignedIndices = new Set<number>();
    let nextFallbackIndex = 0;

    bellObjectsToRegister.forEach(({ object, index }) => {
      let resolvedIndex: number | null = null;
      if (typeof index === 'number' && Number.isInteger(index) && index >= 0 && index < 16) {
        resolvedIndex = index;
      }

      if (resolvedIndex === null || assignedIndices.has(resolvedIndex)) {
        while (nextFallbackIndex < 16 && assignedIndices.has(nextFallbackIndex)) {
          nextFallbackIndex += 1;
        }
        if (nextFallbackIndex >= 16) return;
        resolvedIndex = nextFallbackIndex;
        nextFallbackIndex += 1;
      }

      if (resolvedIndex === null || resolvedIndex < 0 || resolvedIndex >= 16) return;

      assignedIndices.add(resolvedIndex);
      object.userData = { ...(object.userData as object), bellIndex: resolvedIndex };
      this.bellTargets.push(object);
      const collider = this.createBellCollider(object, resolvedIndex);
      this.bellColliders.push(collider);
      console.log('[Glockenspiel] bell target', resolvedIndex, object.name || object.type, object);
    });

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

    // Apply keyboard-based debug movement for desktop.
    this.updateKeyboardCameraPosition(deltaSeconds);

    // No automatic rotation — user-controlled rotation should persist.

    if (this.activeBellHighlight && now >= this.activeBellHighlight.expiresAt) {
      this.clearBellHighlight();
    }

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

    if (this.isPlaybackActive) {
      this.setBellHighlight(null, 0x000000);
      if (this.playCooldown > 0) this.playCooldown--;
      return;
    }

    // Interaction via center-of-screen raycast
    this.interactionRaycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const sceneIntersections = this.scene
      ? this.interactionRaycaster.intersectObjects(this.scene.children, true)
      : [];
    const bellHit = findNearestVisibleBellHit(sceneIntersections, (object) => this.getBellIndexFromObject(object));

    if (bellHit) {
      const bellIndex = bellHit.bellIndex;
      this.setBellHighlight(bellIndex, 0x444400);
      if (this.lastPlayedBell !== bellIndex || this.playCooldown === 0) {
        void this.playBellSound(bellIndex);
      }
    } else {
      this.setBellHighlight(null, 0x000000);
    }

    if (this.playCooldown > 0) this.playCooldown--;
  }

  private createBellCollider(bell: THREE.Object3D, index: number): THREE.Mesh {
    bell.updateMatrixWorld(true);
    const bbox = new THREE.Box3().setFromObject(bell);
    const size = bbox.getSize(new THREE.Vector3());
    const radius = getBellColliderRadius(size);
    const isBellEight = index === 8;
    const colliderGeometry = isBellEight
      ? new THREE.BoxGeometry(
          Math.max(0.03, size.x * 0.3),
          Math.max(0.03, size.y * 0.4),
          Math.max(0.03, size.z * 0.3),
        )
      : new THREE.SphereGeometry(Math.max(0.03, radius * 0.8), 16, 12);
    const colliderMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true, transparent: true, opacity: 0.0, depthWrite: false, depthTest: false });
    const collider = new THREE.Mesh(colliderGeometry, colliderMaterial);
    collider.renderOrder = 9999;
    collider.frustumCulled = false;
    collider.name = `bellCollider_${index}`;
    collider.userData = { bellIndex: index, isBellCollider: true };
    collider.position.set(0, 0, 0);
    bell.add(collider);
    return collider;
  }

  private createBellDebugLabel(_bell: THREE.Object3D, _index: number): void {
    // Debug labels are intentionally disabled in the normal experience.
  }

  private enableDebugVisuals(_enabled: boolean): void {
    // Debug visuals are intentionally disabled in the normal experience.
    this.debugVisualsEnabled = false;
    this.bellColliders.forEach((collider) => {
      const mat = collider.material as THREE.Material & { opacity?: number; transparent?: boolean; needsUpdate?: boolean };
      mat.opacity = 0.0;
      mat.transparent = true;
      if (mat.needsUpdate !== undefined) mat.needsUpdate = true;
    });
  }

  private ensureMeshHasUniqueMaterial(mesh: THREE.Mesh): void {
    const material = mesh.material;
    if (Array.isArray(material)) {
      mesh.material = material.map((entry) => {
        if (entry && !(entry.userData as any)?.glockenspielHighlightState) {
          const cloned = entry.clone();
          cloned.userData = { ...cloned.userData };
          return cloned;
        }
        return entry;
      });
      return;
    }

    if (material && !(material.userData as any)?.glockenspielHighlightState) {
      const cloned = material.clone();
      cloned.userData = { ...cloned.userData };
      mesh.material = cloned;
    }
  }

  private setBellHighlight(activeIndex: number | null, _color: number): void {
    this.bellTargets.forEach((target) => {
      const isActive = activeIndex !== null && (target.userData as any)?.bellIndex === activeIndex;
      this.getBellHighlightMeshes(target).forEach((mesh) => {
        this.ensureMeshHasUniqueMaterial(mesh);
        const material = mesh.material;
        if (Array.isArray(material)) {
          material.forEach((entry) => this.applyBellHighlight(entry, isActive));
        } else if (material) {
          this.applyBellHighlight(material, isActive);
        }
      });
    });

    this.bellColliders.forEach((collider) => {
      const material = collider.material as THREE.MeshBasicMaterial;
      if (!material) return;
      material.opacity = 0.0;
      material.transparent = true;
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
    // Remove touch and keyboard event listeners
    window.removeEventListener('touchstart', this.handleTouchStart);
    window.removeEventListener('touchmove', this.handleTouchMove);
    window.removeEventListener('touchend', this.handleTouchEnd);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    this.scrollLock.unlock();
    if (this.audioContext) {
      this.audioContext.close();
    }
    super.stop();
  }
}

export const GlockenspielView: React.FC<ARViewProps> = (props) => {
  const { onNavigateHome, username, onLogin, onLogout, onNavigateProfile, onRegister, completedStations, totalStations, totalPoints, currentStationPoints = 0, onCompleteStation, isCurrentStationCompleted = false, isGuestMode = false } = props;
  const [isCompletionDialogOpen, setIsCompletionDialogOpen] = useState(false);
  const completionDialogTimerRef = useRef<number | null>(null);

  const handleCompletionDialogChange = (isOpen: boolean) => {
    // If dialog opens, hide immediately and clear any pending timers
    if (isOpen) {
      if (completionDialogTimerRef.current) {
        window.clearTimeout(completionDialogTimerRef.current);
        completionDialogTimerRef.current = null;
      }
      setIsCompletionDialogOpen(true);
      return;
    }

      // If dialog closes, delay re-showing the crosshair by 2s
    if (completionDialogTimerRef.current) {
      window.clearTimeout(completionDialogTimerRef.current);
      completionDialogTimerRef.current = null;
    }
    completionDialogTimerRef.current = window.setTimeout(() => {
      setIsCompletionDialogOpen(false);
      setShowCrosshair(true);
      completionDialogTimerRef.current = null;
    }, 2000) as unknown as number;
  };

  useEffect(() => {
    return () => {
      if (completionDialogTimerRef.current) {
        window.clearTimeout(completionDialogTimerRef.current);
        completionDialogTimerRef.current = null;
      }
    };
  }, []);
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
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [showStartGuide, setShowStartGuide] = useState(false);
  const [isPreparingExperience, setIsPreparingExperience] = useState(false);
  const startConfirmedRef = useRef(false);
  const [showInteractionHints, setShowInteractionHints] = useState(false);
  const [showMelodyHint, setShowMelodyHint] = useState(false);
  const [showCrosshair, setShowCrosshair] = useState(false);
  const [crosshairLockedHidden, setCrosshairLockedHidden] = useState(false);
  const [showMelodyStartPopup, setShowMelodyStartPopup] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const melodyStartPopupHandledRef = useRef(false);
  const [isMelodyRecording, setIsMelodyRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [showRecordingOptions, setShowRecordingOptions] = useState(false);
  const [recordingActionError, setRecordingActionError] = useState<string | null>(null);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const nameListA = [
    'Schwarzwald',
    'Tannen',
    'Berg',
    'Turm',
    'Glocken',
    'Kirchen',
    'Marktplatz',
    'Morgen',
    'Abend',
    'Nebel',
    'Sonne',
    'Mond',
    'Sterne',
    'Wind',
    'Wald',
    'Zeit',
    'Geschichte',
    'Heimat',
    'Reisende',
    'Entdecker',
    'Klänge',
    'Echos',
  ];
  const nameListB = [
    'Harmonie',
    'Symphonie',
    'Melodie',
    'Klang',
    'Lied',
    'Echo',
    'Ruf',
    'Resonanz',
    'Tanz',
    'Legende',
    'Geheimnis',
    'Erinnerung',
    'Zauber',
    'Schatz',
    'Traum',
    'Funke',
    'Rhythmus',
    'Ouvertüre',
  ];
  const [chosenPrefix, setChosenPrefix] = useState(nameListA[0]);
  const [chosenSuffix, setChosenSuffix] = useState(nameListB[0]);
  const [pendingRecordedMelody, setPendingRecordedMelody] = useState<MelodyNote[]>([]);
  const [savedMelodies, setSavedMelodies] = useState<Array<{ id: number; name: string; melody: string; created_at?: string | null }>>([]);
  const [showOtherUserMelodyList, setShowOtherUserMelodyList] = useState(false);
  const [hasSavedOnce, setHasSavedOnce] = useState(false);
  const latestSavedMelody = savedMelodies[0];
  const [isRecordingMenuClosed, setIsRecordingMenuClosed] = useState(false);
  const [isSavingMelody, setIsSavingMelody] = useState(false);
  const [isPlayingSavedMelody, setIsPlayingSavedMelody] = useState(false);
  const [isPreviewingRecording, setIsPreviewingRecording] = useState(false);
  const [isPlayingOtherUserMelody, setIsPlayingOtherUserMelody] = useState(false);

  const otherUserMelodies = useMemo<Array<StoredMelodyEntry & { created_at?: string | null }>>(
    () => getRecentOtherUserMelodies(savedMelodies, 10),
    [savedMelodies]
  );

  useEffect(() => {
    if (!isAuthorized || !hasSeen || !containerRef.current || !videoRef.current) return;

    setIsLoading(true);
    setStartError(null);

    const session = new GlockenspielARSession(containerRef.current, videoRef.current, (e) => {
      console.error('AR init error', e);
      setInitError(e instanceof Error ? e.message : String(e));
    });

    const initializeSession = async () => {
      try {
        sessionRef.current = session;
        await session.init();
        await session.waitForModelReady();
      } catch (err) {
        console.error('[GlockenspielView] AR init error:', err);
        setInitError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
      }
    };

    void initializeSession();

    return () => {
      sessionRef.current?.dispose();
      sessionRef.current = null;
    };
  }, [isAuthorized, hasSeen]);

  useEffect(() => {
    if (!hasStarted) {
      setShowInteractionHints(false);
      setShowMelodyHint(false);
      return;
    }

    setShowInteractionHints(true);
    const interactionTimer = window.setTimeout(() => {
      setShowInteractionHints(false);
    }, 4000);

    const melodyHintTimer = window.setTimeout(() => {
      setShowMelodyHint(true);
    }, 4000);

    const melodyHintHideTimer = window.setTimeout(() => {
      setShowMelodyHint(false);
    }, 8000);

    return () => {
      window.clearTimeout(interactionTimer);
      window.clearTimeout(melodyHintTimer);
      window.clearTimeout(melodyHintHideTimer);
    };
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) {
      setShowMelodyStartPopup(false);
      return;
    }

    if (isMelodyRecording || isPreviewingRecording || isPlayingOtherUserMelody || showRecordingOptions || melodyStartPopupHandledRef.current) {
      setShowMelodyStartPopup(false);
      return;
    }

    const popupTimer = window.setTimeout(() => {
      setShowMelodyStartPopup(true);
      melodyStartPopupHandledRef.current = true;
    }, 5000);

    return () => window.clearTimeout(popupTimer);
  }, [hasStarted, isMelodyRecording, isPreviewingRecording, isPlayingOtherUserMelody, showRecordingOptions]);

  useEffect(() => {
    // Keep interaction enabled even if the station is already completed.
    // Station completion still prevents awarding additional points (saving is still disabled),
    // but users can re-open, record and preview for review.
    try {
      sessionRef.current?.setInteractionEnabled(true);
    } catch (e) {}
  }, [isCurrentStationCompleted]);

  useEffect(() => {
    if (!isMelodyRecording) return;
    setRecordingSeconds(0);
    const interval = window.setInterval(() => {
      setRecordingSeconds((seconds) => Math.min(15, seconds + 1));
    }, 1000);

    const timer = window.setTimeout(() => {
      const melody = sessionRef.current?.stopMelodyRecording() ?? [];
      setIsMelodyRecording(false);
      setPendingRecordedMelody(melody);
      setShowRecordingOptions(true);
      setCrosshairLockedHidden(true);
      setShowCrosshair(false);
    }, 15000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timer);
    };
  }, [isMelodyRecording]);

  useEffect(() => {
    void loadSavedMelodies();
  }, []);

  const loadSavedMelodies = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/get_glockenspiel_melodies.php?station_id=${AR_VIEW_STATION_MAP['glockenspiel']}`);
      if (!response.ok) throw new Error('Failed to fetch melodies');
      const payload = await response.json();
      if (payload?.success && Array.isArray(payload.melodies)) {
        setSavedMelodies(payload.melodies.map((item: { id: number; name: string; melody: string; created_at?: string | null }) => ({
          id: item.id,
          name: item.name,
          melody: item.melody,
          created_at: item.created_at ?? null,
        })));
      }
    } catch (err) {
      console.warn('[Glockenspiel] failed to load melodies', err);
    }
  };

  const saveRecordedMelody = async (melody: MelodyNote[], chosenMelodyName?: string | null): Promise<boolean> => {
    if (!melody.length) return false;
    setIsSavingMelody(true);
    const serialized = serializeMelody(melody);
    const payload = {
      station_id: AR_VIEW_STATION_MAP['glockenspiel'],
      melody: serialized,
      name: chosenMelodyName?.trim() || 'Glockenspiel-Melodie',
    };

    try {
      const response = await fetch(`${API_BASE_URL}/save_glockenspiel_melody.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken() ?? ''}` },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok || !result?.success) {
        const message = result?.message ?? 'Speichern fehlgeschlagen.';
        console.warn('[Glockenspiel] failed to save melody', message);
        setRecordingActionError(`Speichern fehlgeschlagen: ${message}`);
        return false;
      }

      setSavedMelodies((current) => [
        { id: result.id ?? Date.now(), name: payload.name, melody: serialized, created_at: new Date().toISOString() },
        ...current,
      ].slice(0, 6));
      setHasSavedOnce(true);
      setIsRecordingMenuClosed(true);
      return true;
    } catch (err) {
      console.warn('[Glockenspiel] failed to save melody', err);
      setRecordingActionError('Speichern fehlgeschlagen. Bitte versuche es erneut.');
      return false;
    } finally {
      setIsSavingMelody(false);
    }
  };

  const handleConfirmSight = () => {
    setHasSeen(true);
  };

  const handleStartGuideConfirm = () => {
    startConfirmedRef.current = true;
    setShowStartGuide(false);
    setHasStarted(true);
    void handleBeginExperience();
  };

  const handlePrepareExperience = async () => {
    if (!sessionRef.current) {
      setStartError(glockenspielTexts.arStartErrorFallback ?? 'Failed to start the AR view.');
      return;
    }

    setIsPreparingExperience(true);
    setStartError(null);
    setShowStartGuide(false);

    try {
      sessionRef.current.setCameraPositionAndLookAt(0, 2.0, 4.0);
      try {
        await sessionRef.current.stabilizeAndPlace(600);
      } catch (err) {
        sessionRef.current.setTowerPosition();
      }
      await sessionRef.current.waitForModelReady();
      if (!startConfirmedRef.current) {
        setShowStartGuide(true);
      }
    } catch (err) {
      setStartError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsPreparingExperience(false);
    }
  };

  const handleProfileButtonClick = () => {
    if (username) {
      onNavigateProfile?.();
      return;
    }

    if (onLogin) {
      onLogin();
      return;
    }

    onRegister?.();
  };

  const handleStartMelodyRecording = () => {
    if (!sessionRef.current) return;
    sessionRef.current.startMelodyRecording();
    setPendingRecordedMelody([]);
    setShowRecordingOptions(false);
    setIsRecordingMenuClosed(false);
    setRecordingActionError(null);
    setShowMelodyStartPopup(false);
    melodyStartPopupHandledRef.current = true;
    setCrosshairLockedHidden(false);
    setShowCrosshair(true);
    setRecordingSeconds(0);
    setIsMelodyRecording(true);
  };

  const playMelodySequence = async (sequence: MelodyNote[]) => {
    if (!sessionRef.current || !sequence.length) return;
    try {
      await sessionRef.current.playSequence(sequence);
    } catch (err) {
      console.warn('[Glockenspiel] playback failed', err);
    }
  };

  const handlePlaySavedMelody = async (melody: string) => {
    if (!sessionRef.current) return;
    setIsPlayingSavedMelody(true);
    try {
      await playMelodySequence(parseMelody(melody));
    } finally {
      setIsPlayingSavedMelody(false);
    }
  };

  const handlePlayLastSavedMelody = async () => {
    const lastSaved = savedMelodies[0];
    if (!lastSaved?.melody) {
      setRecordingActionError('Keine gespeicherte Melodie vorhanden.');
      return;
    }

    setRecordingActionError(null);
    setShowRecordingOptions(false);
    setIsPlayingSavedMelody(true);
    try {
      await playMelodySequence(parseMelody(lastSaved.melody));
    } finally {
      setIsPlayingSavedMelody(false);
      setShowRecordingOptions(true);
    }
  };

  const handlePreviewPendingMelody = async () => {
    if (!pendingRecordedMelody.length) {
      if (!hasSavedOnce) {
        setRecordingActionError('Keine Aufnahme zum Anhören vorhanden.');
        return;
      }

      await handlePlayLastSavedMelody();
      return;
    }

    setRecordingActionError(null);
    setShowRecordingOptions(false);
    setIsPreviewingRecording(true);
    try {
      await playMelodySequence(pendingRecordedMelody);
    } finally {
      setIsPreviewingRecording(false);
      setShowRecordingOptions(true);
    }
  };

  const handleCloseOtherUserMelodyList = () => {
    setShowOtherUserMelodyList(false);
    setShowRecordingOptions(true);
    setRecordingActionError(null);
  };

  const handlePlayOtherUserMelody = async (melody?: string) => {
    const otherUserMelody = melody
      ? { melody }
      : getLatestOtherUserMelody(savedMelodies);

    if (!otherUserMelody?.melody) {
      setRecordingActionError('Keine Melodie eines anderen Nutzers verfügbar.');
      return;
    }

    setRecordingActionError(null);
    setShowRecordingOptions(false);
    setShowOtherUserMelodyList(false);
    setIsPlayingOtherUserMelody(true);
    try {
      await playMelodySequence(parseMelody(otherUserMelody.melody));
    } finally {
      setIsPlayingOtherUserMelody(false);
      setShowRecordingOptions(true);
    }
  };


  const handleSavePendingMelody = async () => {
    if (!pendingRecordedMelody.length) {
      setRecordingActionError('Keine Aufnahme zum Speichern vorhanden.');
      return;
    }

    setRecordingActionError(null);
    setShowRecordingOptions(false);
    // Prepare random initial name and open name selection dialog
    setChosenPrefix(nameListA[Math.floor(Math.random() * nameListA.length)]);
    setChosenSuffix(nameListB[Math.floor(Math.random() * nameListB.length)]);
    setShowNameDialog(true);
  };

  const handleRedoRecording = () => {
    setShowRecordingOptions(false);
    setPendingRecordedMelody([]);
    setHasSavedOnce(false);
    setRecordingActionError(null);
    setShowCrosshair(true);
    handleStartMelodyRecording();
  };

  const handleBeginExperience = async () => {
    if (!sessionRef.current) {
      setStartError(glockenspielTexts.arStartErrorFallback ?? 'Failed to start the AR view.');
      return;
    }

    setIsStarting(true);
    setStartError(null);

    try {
      setHasStarted(true);
      setShowCrosshair(true);
    } catch (err) {
      setStartError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <ARProximityGate stationId={AR_VIEW_STATION_MAP['glockenspiel']} stationName={glockenspielTexts.stationName} onNavigateBack={onNavigateHome} onAccessGranted={() => setIsAuthorized(true)}>
      <div className="relative w-full h-full glockenspiel-ar" style={{ backgroundColor: '#050a10' }}>
        <style>{`.glockenspiel-ar .ar-container { background-color: #050a10 !important; z-index: 1 !important; } .glockenspiel-ar { isolation: isolate; background-color: #050a10; } .glockenspiel-ar .ar-ui-overlay { pointer-events: auto !important; } .glockenspiel-ar .ar-ui-overlay * { pointer-events: auto !important; } .glockenspiel-ar .glockenspiel-local-overlay { position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 1000 !important; pointer-events: none; } .glockenspiel-ar .glockenspiel-local-overlay .glockenspiel-action-stack { bottom: calc(6.6rem + max(12px, env(safe-area-inset-bottom))) !important; } @media (max-width: 480px) { .glockenspiel-ar .glockenspiel-local-overlay .glockenspiel-action-stack { bottom: calc(5.7rem + max(10px, env(safe-area-inset-bottom))) !important; } }`}</style>
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
          onCompletionDialogChange={handleCompletionDialogChange}
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

        {!initError && !isLoading && showCrosshair && !crosshairLockedHidden && !(isCompletionDialogOpen || showStartGuide || showMelodyStartPopup || showOtherUserMelodyList) && (
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

        {isRecordingMenuClosed && !showRecordingOptions && !showNameDialog && !showOtherUserMelodyList && hasStarted &&
          createPortal(
            <div
              className="flex flex-col items-start gap-2"
              style={{
                position: 'fixed',
                left: '12px',
                bottom: 'calc(6.2rem + env(safe-area-inset-bottom))',
                zIndex: 30001,
                pointerEvents: 'auto',
              }}
            >
              <button
                type="button"
                className="rounded-2xl border border-border bg-primary px-4 py-3 text-sm font-semibold text-white shadow-2xl"
                style={{ minWidth: '160px', zIndex: 30002 }}
                onClick={() => {
                  setShowRecordingOptions(true);
                  setIsRecordingMenuClosed(false);
                  setShowCrosshair(false);
                  setCrosshairLockedHidden(true);
                  setShowOtherUserMelodyList(false);
                  setShowNameDialog(false);
                }}
              >
                Menü öffnen
              </button>
            </div>,
            document.body
          )}

        {/* Intro overlays */}
        {!hasSeen && !initError && (
          <ARStartCard
            title={glockenspielTexts.arStartTitle}
            description={glockenspielTexts.arPermissionDescription}
            buttonLabel={glockenspielTexts.arPermissionButton}
            onStart={handleConfirmSight}
          />
        )}

        {hasSeen && !hasStarted && !showStartGuide && (
          <ARStartCard
            zIndex={14050}
            description={glockenspielTexts.arStartDescription}
            error={startError}
            loading={isPreparingExperience || isStarting}
            buttonLabel={isPreparingExperience ? 'Wird geladen…' : (isStarting ? glockenspielTexts.arStartingButton : glockenspielTexts.arStartButton)}
            onStart={() => void handlePrepareExperience()}
          />
        )}

        {showStartGuide && (
          <ARStartCard
            zIndex={14050}
            title="Glockenspiel AR"
            description="Richte das Fadenkreuz auf eine Glocke, um Klänge zu erzeugen."
            icon={<Bell className="w-8 h-8 text-primary" />}
            buttonLabel="OK"
            onStart={handleStartGuideConfirm}
          />
        )}

        {isPreparingExperience && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/85 backdrop-blur-sm pointer-events-none">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4 mx-auto" />
              <p className="text-white/85 text-sm font-semibold">Lädt Glockenspiel…</p>
            </div>
          </div>
        )}

        {hasStarted && (
          <div className="glockenspiel-local-overlay absolute inset-0">
            <div className="pointer-events-auto absolute inset-0 z-[90]">
              {showInteractionHints && (
                <div className="pointer-events-none absolute left-1/2 top-[6rem] z-[90] flex w-[min(92vw,460px)] -translate-x-1/2 justify-center px-3 sm:px-4" style={{ top: 'calc(6rem + env(safe-area-inset-top))' }}>
                  <div className="w-full rounded-2xl border border-border bg-white px-4 py-3 shadow-sm text-foreground">
                    <div className="flex items-stretch justify-between gap-3 text-sm">
                      <div className="flex flex-1 items-center justify-center gap-2">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
                          <img src={asset('/zoomAnimation.gif')} alt="Zoom" className="h-8 w-8 object-contain" />
                        </div>
                        <div className="flex min-h-[2.25rem] flex-col justify-center text-center sm:text-left">
                          <div className="font-semibold text-foreground">Zoomen</div>
                        
                        </div>
                      </div>
                      <div className="flex flex-1 items-center justify-center gap-2">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/10">
                          <img src={asset('/dragAnimation.gif')} alt="Drehen" className="h-14 w-14 object-contain" />
                        </div>
                        <div className="flex min-h-[2.25rem] flex-col justify-center text-center sm:text-left">
                          <div className="font-semibold text-foreground">Drehen</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {showMelodyStartPopup && !isMelodyRecording && !showRecordingOptions && (
                <div
                  style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 14000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    pointerEvents: 'auto',
                    background: 'rgba(5, 10, 16, 0.72)',
                  }}
                >
                  <div
                    style={{
                      width: 'min(460px, 100%)',
                      borderRadius: '16px',
                      background: 'rgba(0,0,0,0.72)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      padding: '20px',
                      textAlign: 'center',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
                    }}
                  >
                    <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 800, color: 'white' }}>
                      Melodie aufnehmen
                    </h3>
                    <p style={{ margin: '0 0 14px', color: 'rgba(255,255,255,0.95)', lineHeight: 1.5 }}>
                      Tippe auf Aufnahme starten, um die 15s lange Aufnahme zu beginnen.
                    </p>
                    <button
                      type="button"
                      onClick={handleStartMelodyRecording}
                      className="w-full rounded-2xl border border-border bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm"
                    >
                      Aufnahme starten
                    </button>
                  </div>
                </div>
              )}

              {showRecordingOptions && (
                <div
                  style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 14000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    pointerEvents: 'auto',
                    background: 'rgba(5, 10, 16, 0.72)',
                  }}
                >
                  <div
                    style={{
                      width: 'min(460px, 100%)',
                      borderRadius: '16px',
                      background: 'rgba(0,0,0,0.72)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      padding: '20px',
                      textAlign: 'center',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-white">Aufnahme beendet</div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowRecordingOptions(false);
                          setIsRecordingMenuClosed(true);
                          setCrosshairLockedHidden(false);
                          setShowCrosshair(true);
                        }}
                        className="rounded-full border border-border bg-white/10 px-3 py-1 text-xs font-semibold text-white"
                      >
                        X
                      </button>
                    </div>
                    {recordingActionError && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-white">
                        {recordingActionError}
                      </div>
                    )}
                    <div className="mt-3 flex flex-col gap-2">
                      {pendingRecordedMelody.length > 0 && (isGuestMode || !getAuthToken()) && (
                        <p className="text-xs text-white/80">{glockenspielTexts.saveLoginRequired}</p>
                      )}
                      {pendingRecordedMelody.length > 0 && !isGuestMode && !!getAuthToken() && (
                        <button
                          type="button"
                          onClick={() => void handleSavePendingMelody()}
                          disabled={isSavingMelody}
                          className="rounded-xl border border-border bg-primary px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {isSavingMelody ? 'Wird gespeichert…' : 'Speichern'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void handlePlayLastSavedMelody()}
                        disabled={isPlayingOtherUserMelody || isPreviewingRecording || isPlayingSavedMelody || !savedMelodies.length}
                        className="rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isPlayingSavedMelody
                          ? 'Wird abgespielt…'
                          : latestSavedMelody?.name
                            ? `Letzten Song "${latestSavedMelody.name}" anhören`
                            : 'Letzten Song anhören'}
                      </button>
                      <button
                        type="button"
                        onClick={handleRedoRecording}
                        className="rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground"
                      >
                        Noch einmal aufnehmen
                      </button>
                      <button
                        type="button"
                        onClick={() => void handlePreviewPendingMelody()}
                        disabled={isPreviewingRecording}
                        className="rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isPreviewingRecording ? 'Wird abgespielt…' : 'Anhören'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {showNameDialog && (
                <div
                  style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 15000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    pointerEvents: 'auto',
                    background: 'rgba(5, 10, 16, 0.85)',
                  }}
                >
                  <div
                    style={{
                      width: 'min(520px, 100%)',
                      borderRadius: '12px',
                      background: 'rgba(0,0,0,0.9)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      padding: '18px',
                      textAlign: 'center',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
                    }}
                  >
                    <div className="text-sm font-semibold text-white mb-2">Name für Melodie wählen</div>
                    <div className="text-xs text-slate-300 text-white mb-4">Wähle einen Namen für deine Melodie aus.</div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 12, flexWrap: 'wrap', overflowX: 'auto' }}>
                      <select value={chosenPrefix} onChange={(e) => setChosenPrefix(e.target.value)} className="rounded-md p-2 bg-black text-white border-none min-w-0 flex-1 max-w-[220px]">
                        {nameListA.map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                      <select value={chosenSuffix} onChange={(e) => setChosenSuffix(e.target.value)} className="rounded-md p-2 bg-black text-white border-none min-w-0 flex-1 max-w-[220px]">
                        {nameListB.map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div className="text-lg font-bold text-white mb-4">{`${chosenPrefix} ${chosenSuffix}`}</div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                      <button type="button" onClick={() => {
                        setChosenPrefix(nameListA[Math.floor(Math.random() * nameListA.length)]);
                        setChosenSuffix(nameListB[Math.floor(Math.random() * nameListB.length)]);
                      }} className="rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground">Zufall</button>
                      <button type="button" onClick={async () => {
                        const name = `${chosenPrefix} ${chosenSuffix}`;
                        setShowNameDialog(false);
                        setIsSavingMelody(true);
                        const ok = await saveRecordedMelody(pendingRecordedMelody, name);
                        setIsSavingMelody(false);
                        if (ok) {
                          setPendingRecordedMelody([]);
                          setHasSavedOnce(true);
                          setCrosshairLockedHidden(false);
                          setShowCrosshair(true);
                        } else {
                          setShowRecordingOptions(true);
                        }
                      }} disabled={isSavingMelody} className="rounded-xl border border-border bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-70">{isSavingMelody ? 'Wird gespeichert…' : 'OK'}</button>
                      <button type="button" onClick={() => { setShowNameDialog(false); setShowRecordingOptions(true); }} className="rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground">Abbrechen</button>
                    </div>
                  </div>
                </div>
              )}

              {showOtherUserMelodyList && (
                <div
                  style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 14000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    pointerEvents: 'auto',
                    background: 'rgba(5, 10, 16, 0.85)',
                  }}
                >
                  <div
                    style={{
                      width: 'min(520px, 100%)',
                      maxHeight: 'min(80vh, 660px)',
                      borderRadius: '16px',
                      background: 'rgba(0,0,0,0.88)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      padding: '20px',
                      textAlign: 'left',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
                      overflow: 'hidden',
                    }}
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">Letzte Melodien anderer Nutzer</div>
                        <div className="text-xs text-slate-300 text-white">Wähle eine Melodie zum Abspielen aus.</div>
                      </div>
                      <button
                        type="button"
                        onClick={handleCloseOtherUserMelodyList}
                        className="rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground"
                      >
                        Schließen
                      </button>
                    </div>
                    {otherUserMelodies.length === 0 ? (
                      <div className="rounded-2xl border border-border bg-slate-900 px-4 py-6 text-sm text-slate-300 text-white">
                        Keine Melodien verfügbar.
                      </div>
                    ) : (
                      <div className="space-y-3 overflow-y-auto pr-2" style={{ maxHeight: 'calc(80vh - 140px)' }}>
                        {otherUserMelodies.map((entry) => (
                          <div
                            key={entry.id ?? `${entry.created_at}-${entry.name}`}
                            className="rounded-2xl border border-border bg-slate-950 p-3"
                          >
                            <div className="mb-1 flex items-center justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-white">{entry.created_at ? new Date(entry.created_at).toLocaleString('de-DE') : 'Kein Datum'}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => void handlePlayOtherUserMelody(entry.melody)}
                                disabled={isPlayingOtherUserMelody || isPreviewingRecording || isPlayingSavedMelody}
                                className="rounded-xl border border-border bg-primary px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                {isPlayingOtherUserMelody ? 'Wird abgespielt…' : 'Abspielen'}
                              </button>
                            </div>
                            <div className="text-xs text-slate-300">{entry.name ?? 'Glockenspiel-Melodie'}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {isMelodyRecording && (
                <div className="glockenspiel-action-stack pointer-events-auto absolute bottom-[6.2rem] left-3 z-[95] flex flex-col items-start gap-2" style={{ bottom: 'calc(6.2rem + env(safe-area-inset-bottom))' }}>
                  <div className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-foreground shadow-sm">
                    Aufnahme läuft… {recordingSeconds}s
                  </div>
                </div>
              )}
            </div>
          </div>
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

