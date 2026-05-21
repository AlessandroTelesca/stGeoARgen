import React, { useEffect, useRef, useState } from 'react';
import { ARComponentBase } from '../ARComponentBase';
import { ARVisualizer } from '../../../ARbackend/ARVisualizer';
import { AR_VIEW_STATION_MAP } from '../../../data/stationsConfig';
import * as THREE from 'three';

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

class GlockenspielARSession extends ARVisualizer {
  private glockenspielGroup: THREE.Group | null = null;
  private bellMeshes: THREE.Mesh[] = [];
  private interactionRaycaster: THREE.Raycaster = new THREE.Raycaster();
  private cameraDirection: THREE.Vector3 = new THREE.Vector3();
  private audioContext: AudioContext | null = null;
  private bellSounds: AudioBuffer[] = [];
  private lastPlayedBell: number = -1;
  private playCooldown: number = 0;
  private waveRings: Array<{ mesh: THREE.Mesh; life: number }> = [];
  private lastUpdateTime: number = Date.now();
  private basePosition: THREE.Vector3 = new THREE.Vector3(0, 0, -10);
  private placementCameraPose: {
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
  } | null = null;
  private hasPlacedTower = false;
  private deviceOrientation: { alpha: number; beta: number; gamma: number } | null = null;
  private screenOrientation = 0;
  protected animate = (): void => {
    if (this.renderer && this.scene && this.camera) {
      this.updateScene();
      this.renderer.render(this.scene, this.camera);
    }
    this.animationId = requestAnimationFrame(this.animate);
  };
  private readonly onBellPlayed?: (index: number) => void;

  constructor(
    container: HTMLDivElement,
    videoElement: HTMLVideoElement,
    onBellPlayed?: (index: number) => void
  ) {
    super(container, videoElement);
    this.onBellPlayed = onBellPlayed;
    this.initAudio();
  }

  private async initAudio() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      // Erstelle synthetische Glocken-Sounds
      await this.createBellSounds();
    } catch (error) {
      console.warn('Audio initialization failed:', error);
    }
  }

  private async createBellSounds() {
    if (!this.audioContext) return;

    const frequencies = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00]; // C5, D5, E5, F5, G5, A5

    for (const frequency of frequencies) {
      const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 2, this.audioContext.sampleRate);
      const data = buffer.getChannelData(0);

      // Erstelle einen einfachen Glocken-Sound mit Grundton und Obertönen
      for (let i = 0; i < buffer.length; i++) {
        const t = i / this.audioContext.sampleRate;
        let sample = 0;

        // Grundton
        sample += Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * 2);

        // Obertöne für realistischeren Glockenklang
        sample += Math.sin(2 * Math.PI * frequency * 2 * t) * Math.exp(-t * 3) * 0.5;
        sample += Math.sin(2 * Math.PI * frequency * 3 * t) * Math.exp(-t * 4) * 0.3;
        sample += Math.sin(2 * Math.PI * frequency * 4.2 * t) * Math.exp(-t * 5) * 0.2;

        data[i] = sample * 0.3; // Lautstärke reduzieren
      }

      this.bellSounds.push(buffer);
    }
  }

  private playBellSound(index: number) {
    if (!this.audioContext || this.bellSounds.length === 0 || index >= this.bellSounds.length) return;

    // Verhindere zu häufiges Abspielen der gleichen Glocke
    if (this.lastPlayedBell === index && this.playCooldown > 0) return;

    try {
      const source = this.audioContext.createBufferSource();
      source.buffer = this.bellSounds[index];
      source.connect(this.audioContext.destination);
      source.start();

      if (navigator.vibrate) {
        navigator.vibrate(30);
      }

      if (this.bellMeshes[index]) {
        this.createBellWave(this.bellMeshes[index]);
      }
      this.onBellPlayed?.(index);

      this.lastPlayedBell = index;
      this.playCooldown = 30; // ~0.5 Sekunden Cooldown bei 60fps
    } catch (error) {
      console.warn('Failed to play bell sound:', error);
    }
  }

  public async playSequence(sequence: number[]): Promise<void> {
    for (const index of sequence) {
      this.playBellSound(index);
      await new Promise((resolve) => setTimeout(resolve, 550));
    }
  }

  private createBellWave(bell: THREE.Mesh) {
    if (!this.scene) return;

    const ringGeometry = new THREE.RingGeometry(0.08, 0.12, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xfff5ba,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(bell.position);
    ring.position.y -= 0.02;
    ring.renderOrder = 999;

    this.scene.add(ring);
    this.waveRings.push({ mesh: ring, life: 1 });
  }

  public setTowerPosition(): void {
    if (!this.glockenspielGroup || !this.camera || this.hasPlacedTower) return;

    // Pseudo-World Placement: fixiere den Turm einmalig 3m vor der Kamera.
    const cameraPosition = new THREE.Vector3();
    const cameraQuaternion = new THREE.Quaternion();
    this.camera.getWorldPosition(cameraPosition);
    this.camera.getWorldQuaternion(cameraQuaternion);

    this.placementCameraPose = {
      position: cameraPosition.clone(),
      quaternion: cameraQuaternion.clone(),
    };

    const forwardOffset = new THREE.Vector3(0, 0, -3).applyQuaternion(cameraQuaternion);
    const placementPosition = cameraPosition.clone().add(forwardOffset);
    placementPosition.y += 0.4; // leicht erhöht platzieren

    this.basePosition.copy(placementPosition);
    this.glockenspielGroup.position.copy(this.basePosition);
    this.glockenspielGroup.quaternion.copy(cameraQuaternion);
    this.hasPlacedTower = true;
  }

  protected initThree(): void {
    super.initThree();
    if (!this.scene) return;

    // Zusätzliche Szeneinhalte für das Glockenspiel
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);

    this.glockenspielGroup = new THREE.Group();
    this.scene.add(this.glockenspielGroup);

    // Skaliere den Turm etwas größer, damit er gut sichtbar ist
    this.glockenspielGroup.scale.set(2, 2, 2);

    this.createBellTower();
    this.createBells();

    // Initial position before placement
    this.glockenspielGroup.position.copy(this.basePosition);

    if ('ondeviceorientation' in window) {
      window.addEventListener('deviceorientation', this.handleDeviceOrientation, true);
      window.addEventListener('orientationchange', this.handleScreenOrientation, true);
      this.handleScreenOrientation();
    }
  }

  private handleDeviceOrientation = (event: DeviceOrientationEvent): void => {
    if (event.alpha === null) return;

    this.deviceOrientation = {
      alpha: THREE.MathUtils.degToRad(event.alpha),
      beta: THREE.MathUtils.degToRad(event.beta ?? 0),
      gamma: THREE.MathUtils.degToRad(event.gamma ?? 0),
    };
  };

  private handleScreenOrientation = (): void => {
    const angle = (screen.orientation && typeof screen.orientation.angle === 'number')
      ? screen.orientation.angle
      : (window.orientation || 0);
    this.screenOrientation = THREE.MathUtils.degToRad(typeof angle === 'number' ? angle : 0);
  };

  private setObjectQuaternion(
    quaternion: THREE.Quaternion,
    alpha: number,
    beta: number,
    gamma: number,
    orient: number
  ): void {
    const zee = new THREE.Vector3(0, 0, 1);
    const euler = new THREE.Euler();
    const q0 = new THREE.Quaternion();

    euler.set(beta, alpha, -gamma, 'YXZ');
    quaternion.setFromEuler(euler);
    quaternion.multiply(q0.setFromAxisAngle(zee, -orient));
  }

  private createBellTower() {
    if (!this.glockenspielGroup) return;

    // Basis (helles Holz)
    const baseGeometry = new THREE.CylinderGeometry(0.3, 0.4, 0.8, 8);
    const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x8B7355 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.4;
    this.glockenspielGroup.add(base);

    // Turm-Oberteil (dunkler)
    const towerGeometry = new THREE.CylinderGeometry(0.25, 0.3, 0.6, 8);
    const towerMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
    const tower = new THREE.Mesh(towerGeometry, towerMaterial);
    tower.position.y = 1.1;
    this.glockenspielGroup.add(tower);

    // Dach (rot)
    const roofGeometry = new THREE.ConeGeometry(0.35, 0.4, 8);
    const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x8B0000 });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 1.6;
    this.glockenspielGroup.add(roof);

    // Glockenstuhl (Holzstruktur)
    const frameGeometry = new THREE.BoxGeometry(0.8, 0.1, 0.8);
    const frameMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.y = 1.8;
    this.glockenspielGroup.add(frame);
  }

  private createBells() {
    if (!this.glockenspielGroup) return;

    const bellPositions = [
      { x: -0.25, y: 1.9, z: -0.25 },
      { x: -0.15, y: 1.95, z: -0.15 },
      { x: 0, y: 2.0, z: -0.2 },
      { x: 0.15, y: 1.95, z: -0.15 },
      { x: 0.25, y: 1.9, z: -0.25 },
      { x: 0, y: 1.85, z: 0.2 }
    ];

    const bellColors = [0xFFD700, 0xFFA500, 0xFF6347, 0xFF69B4, 0x9370DB, 0x00CED1];

    bellPositions.forEach((pos, index) => {
      // Glockenkörper
      const bellGeometry = new THREE.SphereGeometry(0.08, 16, 12);
      const bellMaterial = new THREE.MeshStandardMaterial({
        color: bellColors[index],
        metalness: 0.8,
        roughness: 0.2
      });
      const bell = new THREE.Mesh(bellGeometry, bellMaterial);
      bell.position.set(pos.x, pos.y, pos.z);
      bell.userData = { bellIndex: index };
      this.glockenspielGroup!.add(bell);
      this.bellMeshes.push(bell);

      // Glockenaufhängung
      const hangerGeometry = new THREE.CylinderGeometry(0.005, 0.005, 0.1, 6);
      const hangerMaterial = new THREE.MeshLambertMaterial({ color: 0x2F2F2F });
      const hanger = new THREE.Mesh(hangerGeometry, hangerMaterial);
      hanger.position.set(pos.x, pos.y + 0.05, pos.z);
      this.glockenspielGroup!.add(hanger);
    });
  }

  private updateScene(): void {
    if (!this.glockenspielGroup || !this.camera) return;

    // Schwebende Animation - behalte die Basisposition bei
    const now = performance.now();
    const deltaSeconds = Math.min(0.06, (now - this.lastUpdateTime) / 1000);
    this.lastUpdateTime = now;

    const time = now * 0.001;
    // Deaktiviere die Y-Animation für maximale Statik
    // this.glockenspielGroup.position.y = this.basePosition.y + Math.sin(time * 0.5) * 0.1;

    if (this.deviceOrientation && this.camera) {
      this.setObjectQuaternion(
        this.camera.quaternion,
        this.deviceOrientation.alpha,
        this.deviceOrientation.beta,
        this.deviceOrientation.gamma,
        this.screenOrientation
      );
      this.camera.updateMatrixWorld(true);
    }

    // Leichte Rotation für besseren 3D-Effekt
    this.glockenspielGroup.rotation.y = Math.sin(time * 0.2) * 0.1;

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

    // Blick-basierte Interaktion
    this.camera.getWorldDirection(this.cameraDirection);
    this.interactionRaycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

    const intersects = this.interactionRaycaster.intersectObjects(this.bellMeshes);

    if (intersects.length > 0) {
      const intersectedBell = intersects[0].object as THREE.Mesh;
      const bellIndex = intersectedBell.userData.bellIndex as number;

      // Highlight die angeschautte Glocke
      this.bellMeshes.forEach((bell, index) => {
        const material = bell.material as THREE.MeshLambertMaterial;
        if (index === bellIndex) {
          material.emissive.setHex(0x444400);
          // Spiele Sound wenn noch nicht abgespielt
          if (this.lastPlayedBell !== bellIndex || this.playCooldown === 0) {
            this.playBellSound(bellIndex);
          }
        } else {
          material.emissive.setHex(0x000000);
        }
      });
    } else {
      // Reset alle Highlights
      this.bellMeshes.forEach((bell) => {
        const material = bell.material as THREE.MeshLambertMaterial;
        material.emissive.setHex(0x000000);
      });
    }

    // Cooldown für Sound-Wiedergabe
    if (this.playCooldown > 0) {
      this.playCooldown--;
    }
  }

  public dispose(): void {
    if (this.audioContext) {
      this.audioContext.close();
    }
    window.removeEventListener('deviceorientation', this.handleDeviceOrientation, true);
    window.removeEventListener('orientationchange', this.handleScreenOrientation, true);
    this.stop();
  }
}

export const GlockenspielView: React.FC<ARViewProps> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRootRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<GlockenspielARSession | null>(null);
  const [hasSeenGlockenspiel, setHasSeenGlockenspiel] = useState(false);
  const [hasStartedExperience, setHasStartedExperience] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [currentSequence, setCurrentSequence] = useState<number[]>([]);
  const [recentSequences, setRecentSequences] = useState<Array<{ id: string; label: string; sequence: number[] }>>([]);
  const [showSequenceList, setShowSequenceList] = useState(false);
  const isReplayingRef = useRef(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('glockenspielSequenceHistory');
      if (stored) {
        const parsed = JSON.parse(stored) as Array<{ id: string; label: string; sequence: number[] }>;
        setRecentSequences(parsed.slice(0, 10));
      }
    } catch (_) {
      // ignore invalid localStorage data
    }
  }, []);

  const saveSequenceHistory = (sequence: number[]) => {
    if (sequence.length === 0) return;
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? (crypto as Crypto).randomUUID() : `${Date.now()}`;
    const label = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const next = [{ id, label, sequence }, ...recentSequences].slice(0, 10);
    setRecentSequences(next);
    try {
      window.localStorage.setItem('glockenspielSequenceHistory', JSON.stringify(next));
    } catch (_) {
      // ignore storage errors
    }
  };

  const recordBell = (index: number) => {
    if (isReplayingRef.current) return;
    setCurrentSequence((prev) => [...prev, index]);
  };

  const playRecentSequence = async (sequence: number[]) => {
    if (!sessionRef.current) return;
    isReplayingRef.current = true;
    await sessionRef.current.playSequence(sequence);
    isReplayingRef.current = false;
  };

  useEffect(() => {
    if (!hasSeenGlockenspiel || !containerRef.current || !videoRef.current) return;

    const session = new GlockenspielARSession(containerRef.current, videoRef.current, recordBell);
    sessionRef.current = session;

    session.init().catch((error) => {
      console.error('[GlockenspielView] AR init error:', error);
      setInitError(error instanceof Error ? error.message : String(error));
      setShowFallback(true);
    });

    return () => {
      sessionRef.current?.stop();
      sessionRef.current = null;
    };
  }, [hasSeenGlockenspiel]);

  const handleStopAR = () => {
    if (currentSequence.length > 0) {
      saveSequenceHistory(currentSequence);
    }
    setCurrentSequence([]);
    setHasSeenGlockenspiel(false);
    setHasStartedExperience(false);

    if (sessionRef.current) {
      sessionRef.current.dispose();
      sessionRef.current = null;
    }
    setShowFallback(false);
  };

  const handleConfirmSight = () => {
    setHasSeenGlockenspiel(true);
  };

  const handleBeginExperience = () => {
    if (sessionRef.current) {
      sessionRef.current.setTowerPosition();
    }
    setHasStartedExperience(true);
  };

  const showIntroOverlay = !hasSeenGlockenspiel && !showFallback;
  const showReadyOverlay = hasSeenGlockenspiel && !hasStartedExperience && !showFallback;

  useEffect(() => {
    console.log('[GlockenspielView] State:', { hasSeenGlockenspiel, hasStartedExperience, showIntroOverlay, showReadyOverlay, showFallback });
  }, [hasSeenGlockenspiel, hasStartedExperience, showIntroOverlay, showReadyOverlay, showFallback]);

  return (
    <div className="relative w-full h-full">
      {showFallback ? (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 text-center">
            <h2 className="text-xl font-bold mb-4">Virtuelles Glockenspiel</h2>
            <p className="text-gray-600 mb-4">
              AR konnte nicht gestartet werden.
            </p>
            {initError && <p className="text-sm text-red-600 mb-4">{initError}</p>}
            <button
              onClick={handleStopAR}
              className="mt-6 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors"
            >
              Zurück
            </button>
          </div>
        </div>
      ) : (
        <div className="relative w-full h-full">
          {!hasSeenGlockenspiel ? (
            /* Intro-Phase: Nur die Intro-Card zeigen */
            <ARComponentBase
              onNavigateHome={props.onNavigateHome}
              closeARViewKey="closeGlockenspielView"
              containerRef={containerRef as React.RefObject<HTMLDivElement>}
              videoRef={videoRef as React.RefObject<HTMLVideoElement>}
              overlayRootRef={overlayRootRef}
              username={props.username}
              onLogin={props.onLogin}
              onLogout={props.onLogout}
              onNavigateProfile={props.onNavigateProfile}
              onRegister={props.onRegister}
              completedStations={props.completedStations}
              totalStations={props.totalStations}
              totalPoints={props.totalPoints}
              currentStationId={1}
              currentStationTitle="Glockenspiel"
              currentStationPoints={50}
              onCompleteStation={props.onCompleteStation}
              isCurrentStationCompleted={props.isCurrentStationCompleted}
            />
          ) : (
            /* After "Ich sehe das Glockenspiel" is clicked, initialize AR */
            <ARComponentBase
              onNavigateHome={props.onNavigateHome}
              closeARViewKey="closeGlockenspielView"
              containerRef={containerRef as React.RefObject<HTMLDivElement>}
              videoRef={videoRef as React.RefObject<HTMLVideoElement>}
              overlayRootRef={overlayRootRef}
              username={props.username}
              onLogin={props.onLogin}
              onLogout={props.onLogout}
              onNavigateProfile={props.onNavigateProfile}
              onRegister={props.onRegister}
              completedStations={props.completedStations}
              totalStations={props.totalStations}
              totalPoints={props.totalPoints}
              currentStationId={1}
              currentStationTitle="Glockenspiel"
              currentStationPoints={50}
              onCompleteStation={props.onCompleteStation}
              isCurrentStationCompleted={props.isCurrentStationCompleted}
            />
          )}

          {showIntroOverlay && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 10005, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.8)', padding: '16px', pointerEvents: 'auto' }}>
              <div className="max-w-md w-full rounded-3xl bg-white p-6 text-center shadow-2xl shadow-slate-950/20">
                <h2 className="text-2xl font-bold text-slate-950 mb-4">Richten Sie Ihre Kamera auf das Glockenspiel</h2>
                <button
                  onClick={handleConfirmSight}
                  className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-light"
                >
                  Ich sehe das Glockenspiel
                </button>
              </div>
            </div>
          )}

          {showReadyOverlay && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 10005, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
              <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', zIndex: -1 }} />
              <div className="relative max-w-md w-full rounded-3xl bg-white p-6 shadow-2xl shadow-slate-950/20">
                <h3 className="text-xl font-semibold text-slate-950 mb-3">Bereit für das Glockenspiel</h3>
                <p className="text-sm text-slate-600 mb-5">
                  Tippen Sie auf den Bildschirm, um die Glocken zu spielen.
                </p>
                <button
                  onClick={handleBeginExperience}
                  className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-light"
                >
                  Mit dem Erlebnis beginnen
                </button>
              </div>
            </div>
          )}

          {hasSeenGlockenspiel && (
            <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
              <div className="relative w-14 h-14 rounded-full border border-white/75">
                <div className="absolute inset-0 rounded-full border border-white/60" />
                <div className="absolute left-1/2 top-0 h-4 w-px bg-white/90 transform -translate-x-1/2" />
                <div className="absolute left-1/2 bottom-0 h-4 w-px bg-white/90 transform -translate-x-1/2" />
                <div className="absolute top-1/2 left-0 w-4 h-px bg-white/90 transform -translate-y-1/2" />
                <div className="absolute top-1/2 right-0 w-4 h-px bg-white/90 transform -translate-y-1/2" />
                <div className="absolute left-1/2 top-1/2 w-3 h-3 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
