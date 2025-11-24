import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, QrCode, Camera, CheckCircle, AlertCircle } from 'lucide-react';

interface QRScannerProps {
  onClose: () => void;
  onScan: (pathId: string, stationId: number) => void;
  paths: Array<{
    id: string;
    title: string;
    stations: Array<{
      id: number;
      title: string;
    }>;
  }>;
}

export function QRScanner({ onClose, onScan, paths }: QRScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Simuliere QR-Code Scanner
  const startScanning = async () => {
    try {
      setError(null);
      setScanning(true);
      
      // In einer echten App würde hier die Kamera gestartet
      // const stream = await navigator.mediaDevices.getUserMedia({ 
      //   video: { facingMode: 'environment' } 
      // });
      // if (videoRef.current) {
      //   videoRef.current.srcObject = stream;
      //   streamRef.current = stream;
      // }
      
    } catch (err) {
      setError('Kamera konnte nicht gestartet werden');
      setScanning(false);
    }
  };

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  const handleManualInput = () => {
    setError(null);
    
    // Format: PATHID-STATIONID (z.B. "historic-1" oder "nature-3")
    const parts = manualInput.trim().split('-');
    
    if (parts.length !== 2) {
      setError('Ungültiges Format. Bitte Format verwenden: PFAD-STATION (z.B. historic-1)');
      return;
    }

    const pathId = parts[0];
    const stationId = parseInt(parts[1]);

    if (isNaN(stationId)) {
      setError('Stations-ID muss eine Zahl sein');
      return;
    }

    // Validiere ob Pfad und Station existieren
    const path = paths.find(p => p.id === pathId);
    if (!path) {
      setError(`Pfad "${pathId}" wurde nicht gefunden`);
      return;
    }

    const station = path.stations.find(s => s.id === stationId);
    if (!station) {
      setError(`Station ${stationId} wurde im Pfad "${path.title}" nicht gefunden`);
      return;
    }

    // Erfolg!
    setSuccess(true);
    setTimeout(() => {
      onScan(pathId, stationId);
    }, 1000);
  };

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-3xl max-w-md w-full overflow-hidden"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-muted p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-black/5 rounded-xl flex items-center justify-center">
              <QrCode className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold">QR-Code Scanner</h2>
              <p className="text-sm text-muted-foreground">Station direkt aufrufen</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                className="text-center py-8"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-12 h-12 text-primary" />
                </div>
                <h3 className="font-bold mb-2">Station gefunden!</h3>
                <p className="text-sm text-muted-foreground">
                  Du wirst zur Station weitergeleitet...
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="scanner"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Scanner Bereich */}
                <div className="mb-6">
                  <div className="relative aspect-square bg-muted rounded-2xl overflow-hidden mb-4">
                    {scanning ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Scanning Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-64 h-64 border-4 border-primary rounded-2xl relative">
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-xl" />
                            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-xl" />
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-xl" />
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-xl" />
                            
                            <motion.div
                              className="absolute left-0 right-0 h-1 bg-primary"
                              animate={{ top: ['0%', '100%'] }}
                              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                        <Camera className="w-16 h-16 text-muted-foreground mb-4" />
                        <p className="text-sm text-muted-foreground mb-4">
                          Halte den QR-Code vor die Kamera, um eine Station zu öffnen
                        </p>
                        <button
                          onClick={startScanning}
                          className="bg-primary text-white px-6 py-3 rounded-xl hover:bg-primary-dark transition-colors"
                        >
                          Kamera starten
                        </button>
                      </div>
                    )}
                  </div>

                  {scanning && (
                    <button
                      onClick={stopScanning}
                      className="w-full bg-destructive/10 text-destructive px-6 py-3 rounded-xl hover:bg-destructive/20 transition-colors"
                    >
                      Scanner stoppen
                    </button>
                  )}
                </div>

                {/* Separator */}
                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-4 text-sm text-muted-foreground">
                      oder manuell eingeben
                    </span>
                  </div>
                </div>

                {/* Manual Input */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Stations-Code eingeben
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={manualInput}
                        onChange={(e) => {
                          setManualInput(e.target.value);
                          setError(null);
                        }}
                        placeholder="z.B. historic-1"
                        className="flex-1 px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleManualInput();
                          }
                        }}
                      />
                      <button
                        onClick={handleManualInput}
                        className="bg-primary text-white px-6 py-3 rounded-xl hover:bg-primary-dark transition-colors"
                      >
                        Öffnen
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Format: pfad-station (z.B. historic-1, nature-2, modern-3)
                    </p>
                  </div>

                  {error && (
                    <motion.div
                      className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-destructive">{error}</p>
                    </motion.div>
                  )}

                  {/* Available Codes Info */}
                  <details className="bg-muted/50 rounded-xl p-4">
                    <summary className="text-sm font-medium cursor-pointer">
                      Verfügbare Stations-Codes anzeigen
                    </summary>
                    <div className="mt-4 space-y-3">
                      {paths.map(path => (
                        <div key={path.id}>
                          <p className="text-xs font-semibold text-muted-foreground mb-2">
                            {path.title}:
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {path.stations.map(station => (
                              <button
                                key={station.id}
                                onClick={() => {
                                  setManualInput(`${path.id}-${station.id}`);
                                  setError(null);
                                }}
                                className="text-xs bg-white border border-border rounded-lg px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                              >
                                <span className="font-mono text-primary">
                                  {path.id}-{station.id}
                                </span>
                                <br />
                                <span className="text-muted-foreground">
                                  {station.title}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
