import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'motion/react';
import { Home, User, Settings, Trophy, LogOut, Menu, Gift } from 'lucide-react';
import { GeogiAvatar } from '../../Geogi';

/**
 * ARView Component
 * 
 * Eine eigenständige AR-Komponente, die einen 3D-Würfel in einem AR-Space anzeigt.
 * Die Komponente öffnet die Kamera und rendert einen rotierenden Würfel mit Three.js.
 * 
 * Features:
 * - Kamera-Stream als Hintergrund
 * - 3D-Würfel mit Rotation
 * - Vollbild-AR-Erlebnis
 * - UI mit Home-Button, Progress-Bar und Profil-Dropdown
 */

interface ARViewProps {
  onNavigateHome?: () => void;
}

export const ARView = ({ onNavigateHome }: ARViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const cubeRef = useRef<THREE.Mesh | null>(null);
  const animationIdRef = useRef<number | null>(null);
  
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [progress, setProgress] = useState({ current: 2, total: 5, points: 150 }); // Mock data - 5 Stationen
  
  // Station status: completed, current, locked
  const stations = Array.from({ length: progress.total }, (_, i) => {
    if (i < progress.current - 1) return 'completed';
    if (i === progress.current - 1) return 'current';
    return 'locked';
  });

  useEffect(() => {
    if (!containerRef.current || !videoRef.current) return;

    // Kamera-Stream initialisieren
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (error) {
        console.error('Fehler beim Zugriff auf die Kamera:', error);
      }
    };

    // Three.js Scene initialisieren
    const initThreeJS = () => {
      if (!containerRef.current) return;

      // Scene erstellen
      const scene = new THREE.Scene();
      sceneRef.current = scene;

      // Kamera erstellen
      const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      camera.position.z = 5;
      cameraRef.current = camera;

      // Renderer erstellen
      const renderer = new THREE.WebGLRenderer({ 
        alpha: true,
        antialias: true 
      });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      
      // Canvas styling für korrektes Layering
      renderer.domElement.style.position = 'absolute';
      renderer.domElement.style.top = '0';
      renderer.domElement.style.left = '0';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.zIndex = '10';
      renderer.domElement.style.pointerEvents = 'none';
      
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // Würfel erstellen
      const geometry = new THREE.BoxGeometry(2, 2, 2);
      const material = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        wireframe: false,
        transparent: true,
        opacity: 0.8
      });
      
      // Kanten hinzufügen für bessere Sichtbarkeit
      const edges = new THREE.EdgesGeometry(geometry);
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
      const wireframe = new THREE.LineSegments(edges, lineMaterial);
      
      const cube = new THREE.Mesh(geometry, material);
      cube.add(wireframe);
      scene.add(cube);
      cubeRef.current = cube;

      // Licht hinzufügen
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(5, 5, 5);
      scene.add(directionalLight);
    };

    // Animation Loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      if (cubeRef.current) {
        cubeRef.current.rotation.x += 0.01;
        cubeRef.current.rotation.y += 0.01;
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    // Window Resize Handler
    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };

    // Initialisierung
    initCamera();
    initThreeJS();
    animate();

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      // Animation stoppen
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }

      // Kamera-Stream stoppen
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }

      // Three.js Resources freigeben
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }

      if (cubeRef.current) {
        cubeRef.current.geometry.dispose();
        if (Array.isArray(cubeRef.current.material)) {
          cubeRef.current.material.forEach(material => material.dispose());
        } else {
          cubeRef.current.material.dispose();
        }
      }

      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleNavigateHome = () => {
    if (onNavigateHome) {
      onNavigateHome();
    } else if ((window as any).closeARView) {
      (window as any).closeARView();
    }
  };

  const percentage = (progress.current / progress.total) * 100;

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#000',
        zIndex: 9999
      }}
    >
      {/* Video-Hintergrund für Kamera-Stream */}
      <video
        ref={videoRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0
        }}
        playsInline
        muted
      />
      
      {/* Three.js Canvas wird hier durch den Renderer eingefügt */}
      
      {/* UI Overlay */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 20,
          pointerEvents: 'none'
        }}
      >
        {/* Top Bar - nur Home Button und Profil */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: '16px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            pointerEvents: 'auto'
          }}
        >
          {/* Home Button */}
          <motion.button
            onClick={handleNavigateHome}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer'
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Home style={{ width: '28px', height: '28px', color: '#000' }} />
          </motion.button>

          {/* Profile Button */}
          <motion.button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '28px',
              border: 'none',
              cursor: 'pointer'
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <GeogiAvatar size="sm" />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#000' }}>Max</div>
              <div style={{ fontSize: '11px', color: '#666' }}>Max@gmail.com</div>
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>123 👑</div>
            <motion.div
              animate={{ rotate: profileMenuOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </motion.div>
          </motion.button>
        </div>

        {/* Bottom Bar - Progress Stations */}
        <div 
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '16px',
            right: '16px',
            pointerEvents: 'auto'
          }}
        >
          <motion.div 
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              borderRadius: '20px',
              padding: '20px 16px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* Stations Row */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              gap: '8px',
              marginBottom: '12px'
            }}>
              {stations.map((status, index) => {
                const isLastStation = index === stations.length - 1;
                return (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', flex: index < stations.length - 1 ? 1 : 'initial' }}>
                    {/* Station Circle */}
                    <motion.div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 
                          status === 'completed' ? '#10b981' :
                          status === 'current' ? '#10b981' :
                          '#e5e7eb',
                        boxShadow: status === 'current' ? '0 0 0 3px rgba(16, 185, 129, 0.3)' : 'none',
                        position: 'relative'
                      }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3 + index * 0.05 }}
                    >
                      {status === 'completed' && !isLastStation && (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                      {status === 'completed' && isLastStation && (
                        <Gift style={{ width: '22px', height: '22px', color: 'white' }} />
                      )}
                      {status === 'current' && (
                        <div style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '50%',
                          backgroundColor: 'white'
                        }} />
                      )}
                      {status === 'locked' && !isLastStation && (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                      )}
                      {status === 'locked' && isLastStation && (
                        <Gift style={{ width: '20px', height: '20px', color: '#9ca3af' }} />
                      )}
                    </motion.div>
                    
                    {/* Connecting Line */}
                    {index < stations.length - 1 && (
                      <div style={{
                        flex: 1,
                        height: '4px',
                        marginLeft: '6px',
                        marginRight: '6px',
                        backgroundColor: index < progress.current - 1 ? '#10b981' : '#e5e7eb',
                        borderRadius: '2px'
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Info Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#333' }}>
                Station {progress.current}/{progress.total}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981' }}>
                <Trophy style={{ width: '16px', height: '16px' }} />
                <span style={{ fontSize: '13px', fontWeight: 700 }}>{progress.points} Punkte</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Profile Dropdown Menu */}
        <AnimatePresence>
          {profileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  pointerEvents: 'auto'
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setProfileMenuOpen(false)}
              />

              {/* Menu Panel */}
              <motion.div
                style={{
                  position: 'absolute',
                  top: '88px',
                  right: '16px',
                  width: '280px',
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: '20px',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
                  overflow: 'hidden',
                  pointerEvents: 'auto'
                }}
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              >
                {/* Menu Items */}
                <div style={{ padding: '8px' }}>
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '12px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      backgroundColor: '#f0fdf4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <User style={{ width: '20px', height: '20px', color: '#10b981' }} />
                    </div>
                    <span style={{ fontWeight: 500, color: '#1f2937', fontSize: '15px' }}>Profil</span>
                  </button>

                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '12px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      backgroundColor: '#f0fdf4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Settings style={{ width: '20px', height: '20px', color: '#10b981' }} />
                    </div>
                    <span style={{ fontWeight: 500, color: '#1f2937', fontSize: '15px' }}>Einstellungen</span>
                  </button>

                  <div style={{ margin: '8px 0', borderTop: '1px solid #e5e7eb' }} />

                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '12px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      backgroundColor: '#fee2e2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <LogOut style={{ width: '20px', height: '20px', color: '#dc2626' }} />
                    </div>
                    <span style={{ fontWeight: 500, color: '#dc2626', fontSize: '15px' }}>Abmelden</span>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ARView;
