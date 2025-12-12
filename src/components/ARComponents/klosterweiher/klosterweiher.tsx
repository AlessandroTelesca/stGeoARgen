import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ARComponentBase } from '../ARComponentBase';
import { WebXRVisualizer } from '../../../ARbackend/WebXRVisualizer';
import gsap from 'gsap';


interface ARViewProps {
  onNavigateHome?: () => void;
}

class KlosterweiherARSession extends WebXRVisualizer {
  // You can override methods or add custom functionality here
  // For example:
  // private initThree(): void {
  //   super.initThree();
  //   // Add custom Klosterweiher-specific 3D objects
  // }

  private rodUrl = new URL('./models/Angel.glb', import.meta.url).href;
  private fishUrl = new URL('./models/Fisch.glb', import.meta.url).href;

  public fish: THREE.Object3D | null = null;
  public rod: THREE.Object3D | null = null;

  public tapCount = 0;

  protected initThree(): void {
    super.initThree();

    // Add rod model (initially hidden)
    this.loadGLTFModel(this.rodUrl, {
      position: new THREE.Vector3(5.5, -6, -6),
      rotation: new THREE.Euler(-1, 0, 0),
      scale: 1.2,
    }).then((model) => {
      this.rod = model || null;
      if (this.rod) {
        this.rod.visible = false; // Hide until ground is detected
      }
    }).catch((err) => console.error('Rod model failed to load', err));

    // Add fish model
    this.loadGLTFModel(this.fishUrl, {
      position: new THREE.Vector3(0, -100, -100),
      rotation: new THREE.Euler(0, Math.PI / 2, 0),
      scale: 3,
    }).then((model) =>{
      this.fish = model || null;
    }).catch((err) => console.error('Fish model failed to load', err));
  }

  // Override to handle WebXR ground detection automatically
  protected onGroundDetected(): void {
    if (this.rod) {
      this.rod.visible = true;
    }
    console.log('Ground plane scanned and detected! Fishing rod ready.');
  }

  protected handlePointer(clientX: number, clientY: number): void {
    // Only allow rod control after ground is detected via WebXR
    if (!this.isGroundDetected) {
      console.log('Waiting for ground plane detection...');
      return;
    }

    this.controlrod();
  }

  controlrod() {
    if (!this.rod) return;
    const tl = gsap.timeline()

    this.tapCount += 1;
    if (this.tapCount >= 3) {
      this.catchfish();
    }

    tl.to(this.rod.rotation, {
      x: -0.8,
      duration: 0.5,
    });

    tl.to(this.rod.rotation, {
      x: -1.1,
      duration: 0.5,
      delay: 0.5,
    });

    tl.to(this.rod.rotation, {
      x: -1,
      duration: 0.5,
      delay: 0.5,
    });
  }

  catchfish() {
    if (!this.fish) return;
    if (!this.rod) return;
    const tl = gsap.timeline()

    gsap.to(this.fish.rotation, {
      y: Math.PI * 8 + Math.PI / 2,
      duration: 4,
    });

    gsap.to(this.rod.position, {
      x: 8,
      duration: 1,
    });

    tl.to(this.rod.rotation, {
      x: 0,
      duration: 0.5,
      delay: 2,
    })
    .to(this.fish.position, {
      y: 5,
      z: -30,
      duration: 0.5,
    })
    .to(this.fish.position, {
      y: 0,
      z: -30,
      duration: 0.3,
    });
  }


}

export const KlosterweiherView = ({ onNavigateHome }: ARViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRootRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<KlosterweiherARSession | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sessionRef.current?.stop();
    };
  }, []);

  const startAR = async () => {
    if (!containerRef.current || !overlayRootRef.current || isStarting || hasStarted) return;
    setIsStarting(true);
    setError(null);

    try {
      const session = new KlosterweiherARSession(
        containerRef.current,
        {
          useWebXR: true,
          domOverlayRoot: overlayRootRef.current,
          onError: (e) => console.error('AR init failed', e),
        }
      );

      await session.init(); // Must be called from user gesture to satisfy WebXR security
      sessionRef.current = session;
      setHasStarted(true);
    } catch (e: any) {
      const msg = e?.message || 'Failed to start AR';
      setError(msg);
      console.error('AR start failed', e);
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <>
      <ARComponentBase
        onNavigateHome={onNavigateHome}
        closeARViewKey="closeARView"
        containerRef={containerRef as React.RefObject<HTMLDivElement>}
        videoRef={null as any}
        overlayRootRef={overlayRootRef}
      />

      {!hasStarted && (
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
            <p style={{ margin: '0 0 12px 0', fontWeight: 700 }}>Start AR to scan the ground</p>
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
    </>
  );
};
