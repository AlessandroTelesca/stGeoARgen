import { useRef, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { X, QrCode } from 'lucide-react';
import jsQR from 'jsqr';

interface QRScannerProps {
  onClose: () => void;
  onScan: (arView: string) => void;
}

// Verfügbare AR-Views basierend auf QR-Code URLs
const VALID_AR_VIEWS = ['glockenspiel', 'phonomuseum', 'klosterweiher'];

export function QRScanner({ onClose, onScan }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [isScanning, setIsScanning] = useState(true);

  // Starte Kamera und QR-Code Scanning
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: 1280, height: 720 } 
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
          muted
          className="w-full h-full object-cover"
        />
        
        {/* Hidden canvas for QR code processing */}
        <canvas
          ref={canvasRef}
          className="hidden"
        />
        
        {/* Scanning Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-64 h-64">
            {/* Corner Decorations - Animated - z-10 damit sie über dem Rahmen liegen */}
            <motion.div 
              className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-primary rounded-tl-xl z-10"
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.8, 1, 0.8]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                ease: 'easeInOut',
                repeatType: 'loop'
              }}
            />
            <motion.div 
              className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-primary rounded-tr-xl z-10"
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.8, 1, 0.8]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                ease: 'easeInOut',
                repeatType: 'loop'
              }}
            />
            <motion.div 
              className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-primary rounded-bl-xl z-10"
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.8, 1, 0.8]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                ease: 'easeInOut',
                repeatType: 'loop'
              }}
            />
            <motion.div 
              className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-primary rounded-br-xl z-10"
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.8, 1, 0.8]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                ease: 'easeInOut',
                repeatType: 'loop'
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
