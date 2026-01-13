import * as THREE from 'three';
import { ARVisualizer, ARInitOptions } from './ARVisualizer';

export interface ImageTrackingConfig {
  markerUrl: string;
  modelUrl?: string;
  onMarkerFound?: () => void;
  onMarkerLost?: () => void;
  onStatus?: (s: string) => void;
  onFrameCount?: (count: number) => void;
  onDebugLog?: (log: string) => void;
}

declare global {
  interface Window {
    MINDAR: any;
    AFRAME: any;
  }
}

export class ImageTrackingAR extends ARVisualizer {
  private markerConfig: ImageTrackingConfig;
  private controller: any = null;
  private trackedModel: THREE.Object3D | null = null;
  private isMarkerDetected = false;

  constructor(
    container: HTMLDivElement,
    videoElement: HTMLVideoElement,
    markerConfig: ImageTrackingConfig,
    options: ARInitOptions = {}
  ) {
    super(container, videoElement, options);
    this.markerConfig = markerConfig;
  }

  async init(): Promise<void> {
    try {
      this.markerConfig.onStatus?.('camera:init');
      await super.init();
      this.markerConfig.onStatus?.('camera:ready');

      this.markerConfig.onStatus?.('libs:loading');
      await this.loadLibraries();
      this.markerConfig.onStatus?.('libs:loaded');

      this.markerConfig.onStatus?.('tracking:setup');
      await this.setupImageTracking();
      this.markerConfig.onStatus?.('running');
      
      console.log('[ImageTrackingAR] Init complete');
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      console.error('[ImageTrackingAR] Init failed:', errMsg);
      this.markerConfig.onStatus?.(`error:${errMsg}`);
      this.markerConfig.onDebugLog?.(`Init error: ${errMsg}`);
      throw err;
    }
  }

  private async loadLibraries(): Promise<void> {
    await this.loadScript('https://aframe.io/releases/1.5.0/aframe.min.js', 'AFRAME');
    await this.loadScript(
      'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js',
      'MINDAR'
    );
  }

  private loadScript(src: string, globalCheck: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any)[globalCheck]) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => {
        setTimeout(() => {
          if ((window as any)[globalCheck]) {
            resolve();
          } else {
            reject(new Error(`${globalCheck} not available after load`));
          }
        }, 300);
      };
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  }

  private async setupImageTracking(): Promise<void> {
    try {
      const IMAGE = window.MINDAR?.IMAGE;
      if (!IMAGE) {
        throw new Error('MINDAR.IMAGE not available');
      }

      const Controller = IMAGE.Controller;
      if (!Controller) {
        throw new Error('Controller not found');
      }

      this.markerConfig.onDebugLog?.(`Creating Controller...`);

      await this.waitForVideoReady();
      const video = this.getVideoElement();
      
      this.markerConfig.onDebugLog?.(`Video ready: ${video.videoWidth}x${video.videoHeight}`);

      // Create controller
      this.controller = new Controller({
        inputWidth: video.videoWidth,
        inputHeight: video.videoHeight,
      });

      this.markerConfig.onDebugLog?.(`Controller created`);

      // Load marker targets
      this.markerConfig.onStatus?.('marker:fetch');
      this.markerConfig.onDebugLog?.(`Fetching marker...`);
      
      const response = await fetch(this.markerConfig.markerUrl);
      if (!response.ok) {
        throw new Error(`Marker fetch failed: ${response.status}`);
      }
      const buffer = await response.arrayBuffer();
      this.markerConfig.onDebugLog?.(`Marker fetched: ${buffer.byteLength} bytes`);
      this.markerConfig.onStatus?.('marker:loaded');

      // Try to add targets with error handling
      this.markerConfig.onDebugLog?.(`Adding targets...`);
      try {
        const result = await this.controller.addImageTargets(buffer);
        this.markerConfig.onDebugLog?.(`Targets added: ${JSON.stringify(result)}`);
      } catch (addErr: any) {
        this.markerConfig.onDebugLog?.(`addImageTargets error: ${addErr.message}`);
        throw addErr;
      }

      this.markerConfig.onStatus?.('detecting');
      this.markerConfig.onDebugLog?.(`Starting detection...`);

      // Start detection loop
      this.startDetectionLoop(video);
      
      console.log('[ImageTrackingAR] Tracking started');
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      this.markerConfig.onStatus?.(`error:${errMsg}`);
      this.markerConfig.onDebugLog?.(`Setup error: ${errMsg}`);
      // Don't throw - let the app continue with manual mode
      console.error('[ImageTrackingAR] Setup failed:', err);
    }
  }

  private detectionLoopId: number | null = null;

  private startDetectionLoop(video: HTMLVideoElement): void {
    let frameCount = 0;
    let loggedMethodOnce = false;

    const loop = () => {
      try {
        if (this.controller && video && video.readyState >= 2) {
          frameCount++;

          // Log available methods once
          if (!loggedMethodOnce) {
            this.markerConfig.onDebugLog?.(`detect type: ${typeof this.controller.detect}`);
            this.markerConfig.onDebugLog?.(`track type: ${typeof this.controller.track}`);
            this.markerConfig.onDebugLog?.(`match type: ${typeof this.controller.match}`);
            loggedMethodOnce = true;
          }

          // Try different detection methods
          let result = null;
          if (this.controller.detect) {
            result = this.controller.detect(video);
          } else if (this.controller.track) {
            result = this.controller.track(video);
          } else if (this.controller.match) {
            result = this.controller.match(video);
          }

          // Log every 30 frames
          if (frameCount % 30 === 0) {
            this.markerConfig.onDebugLog?.(`Frame ${frameCount}`);
            this.markerConfig.onDebugLog?.(`Result: ${JSON.stringify(result)}`);
            this.markerConfig.onDebugLog?.(`Result type: ${typeof result}`);
            if (result) {
              this.markerConfig.onDebugLog?.(`Result keys: ${Object.keys(result).join(',')}`);
            }
          }

          // Check if we got a detection
          if (result) {
            const isArray = Array.isArray(result);
            const hasTargetIndex = result.targetIndex !== undefined;
            const notEmpty = isArray ? result.length > 0 : true;
            
            if ((hasTargetIndex && result.targetIndex >= 0) || (isArray && notEmpty && result[0])) {
              if (!this.isMarkerDetected) {
                this.markerConfig.onStatus?.('marker:found');
                this.markerConfig.onDebugLog?.(`✓ DETECTED!`);
                this.onMarkerDetected(result);
              }
            } else if (this.isMarkerDetected) {
              this.markerConfig.onStatus?.('detecting');
              this.onMarkerLost({});
            }
          } else if (this.isMarkerDetected) {
            this.markerConfig.onStatus?.('detecting');
            this.onMarkerLost({});
          }
        }
      } catch (err: any) {
        if (frameCount % 120 === 0) {
          this.markerConfig.onDebugLog?.(`Error: ${err.message}`);
        }
      }

      this.detectionLoopId = requestAnimationFrame(() => loop());
    };

    this.detectionLoopId = requestAnimationFrame(() => loop());
  }

  private waitForVideoReady(): Promise<void> {
    const video = this.getVideoElement();
    return new Promise((resolve) => {
      const ready = () =>
        video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0;

      if (ready()) {
        resolve();
        return;
      }
      const onCanPlay = () => {
        if (ready()) {
          video.removeEventListener('loadedmetadata', onCanPlay);
          video.removeEventListener('canplay', onCanPlay);
          resolve();
        }
      };
      video.addEventListener('loadedmetadata', onCanPlay);
      video.addEventListener('canplay', onCanPlay);
    });
  }

  private onMarkerDetected(event: any): void {
    this.isMarkerDetected = true;
    console.log('[ImageTrackingAR] Marker detected:', event);
    this.markerConfig.onDebugLog?.(`MARKER FOUND!`);

    if (!this.trackedModel && this.markerConfig.modelUrl && this.scene) {
      this.loadGLTFModel(this.markerConfig.modelUrl, {
        position: [0, 0, 0],
        scale: 1,
      }).then((model) => {
        this.trackedModel = model;
        console.log('[ImageTrackingAR] 3D model loaded');
      }).catch((err) => {
        console.error('[ImageTrackingAR] Failed to load 3D model:', err);
      });
    }

    if (this.trackedModel) {
      this.trackedModel.visible = true;
    }

    this.markerConfig.onMarkerFound?.();
  }

  private onMarkerLost(event: any): void {
    this.isMarkerDetected = false;
    console.log('[ImageTrackingAR] Marker lost');

    if (this.trackedModel) {
      this.trackedModel.visible = false;
    }

    this.markerConfig.onMarkerLost?.();
  }

  public simulateMarkerDetected(): void {
    if (!this.isMarkerDetected) {
      this.onMarkerDetected({ simulated: true });
    }
  }

  public simulateMarkerLost(): void {
    if (this.isMarkerDetected) {
      this.onMarkerLost({ simulated: true });
    }
  }

  stop(): void {
    console.log('[ImageTrackingAR] Stopping');
    if (this.detectionLoopId !== null) {
      cancelAnimationFrame(this.detectionLoopId);
    }
    super.stop();
  }
}