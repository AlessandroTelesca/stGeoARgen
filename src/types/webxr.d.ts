// WebXR Device API Type Definitions
// For real AR plane detection like Amazon AR

interface XRSystem {
  isSessionSupported(mode: XRSessionMode): Promise<boolean>;
  requestSession(mode: XRSessionMode, options?: XRSessionInit): Promise<XRSession>;
}

interface Navigator {
  xr?: XRSystem;
}

type XRSessionMode = 'inline' | 'immersive-vr' | 'immersive-ar';

interface XRSessionInit {
  requiredFeatures?: string[];
  optionalFeatures?: string[];
  domOverlay?: { root: HTMLElement };
}

interface XRSession extends EventTarget {
  requestReferenceSpace(type: XRReferenceSpaceType): Promise<XRReferenceSpace>;
  requestAnimationFrame(callback: XRFrameRequestCallback): number;
  requestHitTestSource?(options: XRHitTestOptionsInit): Promise<XRHitTestSource | undefined>;
  end(): Promise<void>;
}

type XRReferenceSpaceType = 'viewer' | 'local' | 'local-floor' | 'bounded-floor' | 'unbounded';

interface XRReferenceSpace extends EventTarget {
  // Reference space for tracking
}

interface XRHitTestOptionsInit {
  space: XRReferenceSpace;
  offsetRay?: XRRay;
}

interface XRHitTestSource {
  cancel(): void;
}

type XRFrameRequestCallback = (time: DOMHighResTimeStamp, frame: XRFrame) => void;

interface XRFrame {
  getHitTestResults(hitTestSource: XRHitTestSource): XRHitTestResult[];
  getPose(space: XRReferenceSpace, baseSpace: XRReferenceSpace): XRPose | undefined;
}

interface XRHitTestResult {
  getPose(baseSpace: XRReferenceSpace): XRPose | undefined;
}

interface XRPose {
  transform: XRRigidTransform;
  emulatedPosition: boolean;
}

interface XRRigidTransform {
  position: DOMPointReadOnly;
  orientation: DOMPointReadOnly;
  matrix: Float32Array;
}

interface XRRay {
  origin: DOMPointReadOnly;
  direction: DOMPointReadOnly;
}

// Make types available globally
export {};
