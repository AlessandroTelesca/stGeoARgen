import { useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, QrCode } from 'lucide-react';

interface QRScannerProps {
  onClose: () => void;
  onScan: (arView: string) => void;
}

// Verfügbare AR-Views basierend auf QR-Code URLs
const VALID_AR_VIEWS = ['glockenspiel', 'phonomuseum', 'klosterweiher'];

export function QRScanner({ onClose, onScan }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Starte Kamera sofort beim Öffnen
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
        }
      } catch (err) {
        console.error('Kamera konnte nicht gestartet werden:', err);
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Simuliere QR-Code Scan (später durch echte Library ersetzen)
  useEffect(() => {
    // TODO: Hier QR-Code Scanner Library integrieren (z.B. jsQR oder html5-qrcode)
    // Beispiel: Wenn QR-Code mit Text "glockenspiel" gescannt wird:
    // const scannedText = ... // Von QR-Code Scanner
    // if (VALID_AR_VIEWS.includes(scannedText)) {
    //   onScan(scannedText);
    // }
  }, [onScan]);

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X className="w-7 h-7 text-white" />
          </button>
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">QR-Code Scanner</h2>
              <p className="text-sm text-white/80">Scanne einen QR-Code</p>
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
          className="w-full h-full object-cover"
        />
        
        {/* Scanning Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-64 h-64 border-4 border-white/80 rounded-2xl relative">
            {/* Corner Decorations - Animated - z-10 damit sie über dem Rahmen liegen */}
            <motion.div 
              className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-xl z-10"
              animate={{ 
                scale: [1, 1.15, 1],
                opacity: [1, 0.7, 1]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div 
              className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-xl z-10"
              animate={{ 
                scale: [1, 1.15, 1],
                opacity: [1, 0.7, 1]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            />
            <motion.div 
              className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-xl z-10"
              animate={{ 
                scale: [1, 1.15, 1],
                opacity: [1, 0.7, 1]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            />
            <motion.div 
              className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-xl z-10"
              animate={{ 
                scale: [1, 1.15, 1],
                opacity: [1, 0.7, 1]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
            />
            
            {/* Scanning Line with Glow Effect */}
            <motion.div
              className="absolute left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(var(--primary),0.8)]"
              style={{
                boxShadow: '0 0 20px rgba(124, 58, 237, 0.8), 0 0 40px rgba(124, 58, 237, 0.4)'
              }}
              animate={{ 
                top: ['0%', '100%', '100%', '0%'],
                opacity: [0, 1, 1, 0]
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity, 
                ease: 'easeInOut',
                times: [0, 0.1, 0.9, 1]
              }}
            />
            
            {/* Scanning Gradient Overlay */}
            <motion.div
              className="absolute left-0 right-0 h-24 bg-gradient-to-b from-primary/30 to-transparent blur-sm"
              animate={{ 
                top: ['0%', '100%', '100%', '0%']
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity, 
                ease: 'easeInOut',
                times: [0, 0.1, 0.9, 1]
              }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
        <p className="text-white text-center text-sm">
          Halte den QR-Code vor die Kamera
        </p>
      </div>
    </motion.div>
  );
}
