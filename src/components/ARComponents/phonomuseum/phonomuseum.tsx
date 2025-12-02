import { useEffect, useRef } from 'react';
import { initAR, ARSession } from '../../../ARbackend/ARVisualizer';

export const PhonomuseumView = () => {
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

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          overflow: 'hidden'
        }}
      />
      
      {/* Video background */}
      <video
        ref={videoRef}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
        playsInline
        muted
      />
    </div>
  );
};
