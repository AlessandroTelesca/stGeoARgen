import { useEffect, useRef } from 'react';
import { ARComponentBase } from '../ARComponentBase';
import { initAR, ARSession } from '../../../ARbackend/ARVisualizer';

interface ARViewProps {
  onNavigateHome?: () => void;
}

export const PhonomuseumView = ({ onNavigateHome }: ARViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<ARSession | null>(null);

  useEffect(() => {
    if (!containerRef.current || !videoRef.current) return;

    initAR(containerRef.current, videoRef.current, {
      onError: (e) => console.error("AR init failed", e)
    }).then((session) => {
      sessionRef.current = session;
    });

    return () => {
      sessionRef.current?.stop();
    };
  }, []);

  return <ARComponentBase onNavigateHome={onNavigateHome} closeARViewKey="closePhonomuseumView" containerRef={containerRef as React.RefObject<HTMLDivElement>} videoRef={videoRef as React.RefObject<HTMLVideoElement>} />;
};