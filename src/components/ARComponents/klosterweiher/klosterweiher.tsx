import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ARComponentBase } from '../ARComponentBase';
import { ARVisualizer } from '../../../ARbackend/ARVisualizer';
import gsap from 'gsap';


interface ARViewProps {
  onNavigateHome?: () => void;
}

class KlosterweiherARSession extends ARVisualizer {
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

    // Add rod model
    this.loadGLTFModel(this.rodUrl, {
      position: new THREE.Vector3(5.5, -6, -6),
      rotation: new THREE.Euler(-1, 0, 0),
      scale: 1.2,
    }).then((model) => {
      this.rod = model || null;
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

  protected handlePointer(clientX: number, clientY: number): void {
    // Rotate the rod when tapped
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<KlosterweiherARSession | null>(null);

  useEffect(() => {
    if (!containerRef.current || !videoRef.current) return;

    const session = new KlosterweiherARSession(
      containerRef.current,
      videoRef.current,
      {
        onError: (e) => console.error("AR init failed", e)
      }
    );
    
    session.init().then(() => {
      sessionRef.current = session;
    });

    return () => {
      sessionRef.current?.stop();
    };
  }, []);

  return <ARComponentBase onNavigateHome={onNavigateHome} closeARViewKey="closeARView" containerRef={containerRef as React.RefObject<HTMLDivElement>} videoRef={videoRef as React.RefObject<HTMLVideoElement>} />;
};
