import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, MapPin, Zap, Home, Gift, X } from 'lucide-react';
import { asset } from '../lib/asset';

interface StationSummary {
    title: string;
    points: number;
}

interface PathCompletionCelebrationProps {
    isOpen: boolean;
    pathTitle: string;
    pathDescription?: string;
    stations: StationSummary[];
    earnedStationPoints: number;
    bonusPoints: number;
    onClose: () => void;
    onNavigateHome: () => void;
    onNavigateToRewards?: () => void;
}

// Confetti particle
interface Particle {
    id: number;
    x: number;
    color: string;
    delay: number;
    duration: number;
    size: number;
    rotation: number;
}

const COLORS = ['#0C690F', '#4ade80', '#fbbf24', '#f59e0b', '#12a617', '#ffffff'];

function generateParticles(count: number): Particle[] {
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 0.8,
        duration: 1.5 + Math.random() * 1.5,
        size: 6 + Math.random() * 10,
        rotation: Math.random() * 360,
    }));
}

export function PathCompletionCelebration({
    isOpen,
    pathTitle,
    pathDescription,
    stations,
    earnedStationPoints,
    bonusPoints,
    onClose,
    onNavigateHome,
    onNavigateToRewards,
}: PathCompletionCelebrationProps) {
    const [particles] = useState<Particle[]>(() => generateParticles(44));
    const [showSummary, setShowSummary] = useState(false);
    const totalPoints = earnedStationPoints + bonusPoints;

    useEffect(() => {
        if (isOpen) {
            setShowSummary(false);
            const timer = setTimeout(() => setShowSummary(true), 1100);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const ease = [0.16, 1, 0.3, 1] as const;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-[9999] overflow-y-auto bg-background"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="celebration-title"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {/* Konfetti */}
                    <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden" aria-hidden="true">
                        {particles.map((p) => (
                            <motion.span
                                key={p.id}
                                className="absolute -top-5"
                                style={{
                                    left: `${p.x}%`,
                                    width: `${p.size}px`,
                                    height: `${p.size * (p.id % 2 ? 1 : 0.5)}px`,
                                    backgroundColor: p.color,
                                    borderRadius: p.id % 3 === 0 ? '50%' : '2px',
                                }}
                                animate={{
                                    y: ['0vh', '110vh'],
                                    rotate: [p.rotation, p.rotation + (p.id % 2 ? 360 : -360)],
                                    opacity: [1, 1, 0.6, 0],
                                }}
                                transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
                            />
                        ))}
                    </div>

                    {/* Hero */}
                    <div className="brand-gradient relative overflow-hidden text-white" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
                        <div className="topo-texture absolute inset-0" aria-hidden="true" />
                        <button
                            onClick={onClose}
                            className="absolute right-4 z-[2] w-11 h-11 rounded-full bg-white/15 border border-white/20 flex items-center justify-center hover:bg-white/25 transition-colors"
                            style={{ top: 'max(16px, env(safe-area-inset-top, 0px))' }}
                            aria-label="Schließen"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="relative max-w-md mx-auto px-6 pt-16 pb-16 text-center">
                            <motion.span
                                className="relative mx-auto mb-6 w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-lg"
                                initial={{ scale: 0, rotate: -30 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ delay: 0.15, type: 'spring', damping: 12, stiffness: 200 }}
                            >
                                <span className="absolute -inset-3 rounded-full border-2 border-white/25" aria-hidden="true" />
                                <img src={asset('/Logo.svg')} alt="" className="w-14 h-14 object-contain" />
                            </motion.span>
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.35, duration: 0.5, ease }}
                            >
                                <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 px-3 py-1 text-sm font-bold">
                                    <Star className="w-3.5 h-3.5 text-gold-bright" fill="currentColor" />
                                    Pfad abgeschlossen!
                                </p>
                                <h1 id="celebration-title" className="mt-3 text-[32px] leading-[1.1] font-extrabold tracking-tight">
                                    {pathTitle}
                                </h1>
                                {pathDescription && (
                                    <p className="mt-2 text-sm text-white/80 leading-relaxed">{pathDescription}</p>
                                )}
                            </motion.div>
                            <div className="mt-6 flex justify-center gap-2" aria-hidden="true">
                                {[0, 1, 2].map((i) => (
                                    <motion.span
                                        key={i}
                                        initial={{ scale: 0, rotate: -40 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ delay: 0.6 + i * 0.12, type: 'spring', stiffness: 260, damping: 12 }}
                                    >
                                        <Star className={`text-gold-bright drop-shadow ${i === 1 ? 'w-10 h-10 -mt-2' : 'w-8 h-8'}`} fill="currentColor" />
                                    </motion.span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="relative z-[2] -mt-8 max-w-md mx-auto px-5" style={{ paddingBottom: 'max(32px, env(safe-area-inset-bottom, 0px))' }}>
                        {/* Punkte */}
                        <motion.div
                            className="surface-card overflow-hidden shadow-lg"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7, duration: 0.55, ease }}
                        >
                            <div className="grid grid-cols-2 divide-x divide-border">
                                <div className="p-5 text-center">
                                    <p className="text-xs font-semibold text-muted-foreground flex items-center justify-center gap-1"><MapPin className="w-3.5 h-3.5" />Stationen</p>
                                    <p className="mt-1 text-3xl font-extrabold tabular-nums">{earnedStationPoints}</p>
                                    <p className="text-xs text-muted-foreground">Punkte</p>
                                </div>
                                <div className="p-5 text-center">
                                    <p className="text-xs font-semibold text-muted-foreground flex items-center justify-center gap-1"><Zap className="w-3.5 h-3.5" />Pfad-Bonus</p>
                                    <p className="mt-1 text-3xl font-extrabold tabular-nums text-primary">+{bonusPoints}</p>
                                    <p className="text-xs text-muted-foreground">Bonus</p>
                                </div>
                            </div>
                            <div className="bg-gold-soft px-5 py-4 text-center">
                                <p className="text-xs font-bold text-gold-foreground/80">Gesamt verdient</p>
                                <motion.p
                                    className="text-4xl font-extrabold tabular-nums text-gold-foreground"
                                    initial={{ scale: 0.6 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.95, type: 'spring', stiffness: 220, damping: 14 }}
                                >
                                    {totalPoints} <span className="text-lg font-bold">Punkte</span>
                                </motion.p>
                            </div>
                        </motion.div>

                        {/* Stationen */}
                        <AnimatePresence>
                            {showSummary && (
                                <motion.section
                                    className="mt-6"
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.45, ease }}
                                >
                                    <h3 className="text-lg font-bold tracking-tight mb-3">Besuchte Stationen</h3>
                                    <ol className="surface-card divide-y divide-border">
                                        {stations.map((station, index) => (
                                            <motion.li
                                                key={`${station.title}-${index}`}
                                                className="flex items-center gap-3 px-4 py-3"
                                                initial={{ opacity: 0, x: -12 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.08 }}
                                            >
                                                <span className="w-8 h-8 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center flex-shrink-0">{index + 1}</span>
                                                <span className="flex-1 min-w-0 font-semibold truncate">{station.title}</span>
                                                <span className="text-sm font-bold text-primary tabular-nums">+{station.points}</span>
                                            </motion.li>
                                        ))}
                                    </ol>
                                </motion.section>
                            )}
                        </AnimatePresence>

                        {/* Aktionen */}
                        <AnimatePresence>
                            {showSummary && (
                                <motion.div
                                    className="mt-6 space-y-2.5"
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.25, duration: 0.45, ease }}
                                >
                                    {onNavigateToRewards && (
                                        <button
                                            onClick={onNavigateToRewards}
                                            className="w-full min-h-[56px] rounded-2xl bg-primary hover:bg-primary-dark text-white font-bold flex items-center justify-center gap-2 shadow-primary transition-colors pressable"
                                        >
                                            <Gift className="w-5 h-5" />
                                            Gutschein einlösen
                                        </button>
                                    )}
                                    <button
                                        onClick={onNavigateHome}
                                        className="w-full min-h-[52px] rounded-2xl border border-border bg-card font-semibold flex items-center justify-center gap-2 hover:bg-muted transition-colors"
                                    >
                                        <Home className="w-4 h-4" />
                                        Zurück zur Startseite
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
