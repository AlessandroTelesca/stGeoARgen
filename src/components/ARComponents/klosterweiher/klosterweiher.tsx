import { useEffect, useRef } from 'react';
import { ARComponentBase } from '../ARComponentBase';
import { ARVisualizer } from '../../../ARbackend/ARVisualizer';

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
