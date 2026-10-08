import { useRef, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { X, QrCode } from 'lucide-react';
import jsQR from 'jsqr';
import { useLanguage } from '../contexts/LanguageContext';

interface QRScannerProps {
  onClose: () => void;
  onScan: (arView: string) => void;
}

// Verfügbare AR-Views basierend auf QR-Code URLs
// 'schwarzes-tor' vor 'schwarzestor' prüfen, damit beide URL-Varianten erkannt werden
const VALID_AR_VIEWS = ['glockenspiel', 'bahnhof', 'phonomuseum', 'klosterweiher', 'schwarzes-tor', 'schwarzestor'];

export function QRScanner({ onClose, onScan }: QRScannerProps) {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [cameraError, setCameraError] = useState(false);

  // Starte Kamera und QR-Code Scanning
  useEffect(() => {
    const startCamera = async () => {
      try {
        // Nutze die Standard-Kamera ohne spezifische Auflösung für 1x Kamera
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment',
            // Keine width/height Constraints, damit die Standard-1x-Kamera verwendet wird
          } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          
          // Warte bis Video bereit ist
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            startScanning();
          };
        }
      } catch (err) {
        console.error('Kamera konnte nicht gestartet werden:', err);
        setCameraError(true);
      }
    };

    const startScanning = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (!video || !canvas) return;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const scan = () => {
        if (!isScanning || video.readyState !== video.HAVE_ENOUGH_DATA) {
          animationFrameRef.current = requestAnimationFrame(scan);
          return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          console.log('QR Code detected:', code.data);
          
          // Stop scanning immediately
          setIsScanning(false);
          
          // Stop camera
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
          }
          
          // Cancel animation frame
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
          
          // Check if it's a valid AR view, otherwise just pass the raw data
          const lowerData = code.data.toLowerCase();
          const arView = VALID_AR_VIEWS.find(view => lowerData.includes(view));
          
          if (arView) {
            console.log('Valid AR view found:', arView);
            onScan(arView);
          } else {
            console.log('Generic QR code, passing raw data');
            onScan(code.data);
          }
          return;
        }

        animationFrameRef.current = requestAnimationFrame(scan);
      };

      scan();
    };

    startCamera();

    return () => {
      setIsScanning(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [onScan]);

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4" style={{ paddingTop: 'max(16px, env(safe-area-inset-top, 0px))' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            aria-label={t('close')}
            className="ar-glass w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 pressable"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <div className="ar-glass flex-1 min-w-0 flex items-center gap-3 rounded-full pl-2 pr-4 py-2">
            <span className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
              <QrCode className="w-4 h-4 text-white" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-bold leading-tight truncate">{t('qrCodeScanner')}</h2>
              <p className="text-xs text-white/75 truncate">{t('qrCodeScanInstruction')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Video Scanner */}
      <div className="flex-1 relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {/* Hidden canvas for QR code processing */}
        <canvas
          ref={canvasRef}
          className="hidden"
        />

        {/* Sucher mit abgedunkelter Umgebung */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="relative w-[min(68vw,280px)] aspect-square rounded-[28px]"
            style={{ boxShadow: '0 0 0 100vmax rgba(5, 12, 7, 0.55)' }}
          >
            {(['top-0 left-0 border-t-4 border-l-4 rounded-tl-[28px]', 'top-0 right-0 border-t-4 border-r-4 rounded-tr-[28px]', 'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-[28px]', 'bottom-0 right-0 border-b-4 border-r-4 rounded-br-[28px]'] as const).map((pos) => (
              <span key={pos} className={`absolute w-12 h-12 border-white ${pos}`} />
            ))}
            {!cameraError && (
              <motion.span
                className="absolute left-5 right-5 h-0.5 rounded-full bg-gradient-to-r from-transparent via-green-300 to-transparent shadow-[0_0_12px_rgba(134,239,172,0.9)]"
                initial={{ top: '12%' }}
                animate={{ top: ['12%', '88%', '12%'] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
          </div>
        </div>

        {/* Kamera-Fehler */}
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center px-6">
            <div className="ar-glass rounded-[24px] p-6 text-center max-w-sm">
              <p className="font-bold mb-1.5">{t('qrCameraError')}</p>
              <p className="text-white/75 text-sm leading-relaxed">{t('qrCameraErrorHint')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Hinweis unten */}
      <div className="absolute bottom-0 left-0 right-0 px-6 pt-10 bg-gradient-to-t from-black/70 to-transparent" style={{ paddingBottom: 'max(28px, env(safe-area-inset-bottom, 0px))' }}>
        <p className="ar-glass mx-auto w-fit max-w-full rounded-full px-5 py-2.5 text-center text-sm font-semibold">
          {t('qrHoldToCamera')}
        </p>
      </div>
    </motion.div>
  );
}
