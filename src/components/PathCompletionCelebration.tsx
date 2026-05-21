import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, MapPin, Zap, Home, Gift } from 'lucide-react';

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

const COLORS = ['#0C690F', '#4ade80', '#fbbf24', '#60a5fa', '#f472b6', '#34d399'];

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
    onNavigateHome,
    onNavigateToRewards,
}: PathCompletionCelebrationProps) {
    const [particles] = useState<Particle[]>(() => generateParticles(40));
    const [showSummary, setShowSummary] = useState(false);
    const totalPoints = earnedStationPoints + bonusPoints;

    useEffect(() => {
        if (isOpen) {
            setShowSummary(false);
            const timer = setTimeout(() => setShowSummary(true), 1200);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        overflowY: 'auto',
                        backgroundColor: 'white',
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {/* Confetti */}
                    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
                        {particles.map((p) => (
                            <motion.div
                                key={p.id}
                                style={{
                                    position: 'absolute',
                                    top: '-20px',
                                    left: `${p.x}%`,
                                    width: `${p.size}px`,
                                    height: `${p.size}px`,
                                    backgroundColor: p.color,
                                    borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                                }}
                                animate={{
                                    y: ['0vh', '110vh'],
                                    rotate: [p.rotation, p.rotation + 360 * (Math.random() > 0.5 ? 1 : -1)],
                                    opacity: [1, 1, 0.5, 0],
                                }}
                                transition={{
                                    duration: p.duration,
                                    delay: p.delay,
                                    ease: 'easeIn',
                                }}
                            />
                        ))}
                    </div>

                    {/* Content */}
                    <div
                        style={{
                            position: 'relative',
                            zIndex: 10,
                            maxWidth: '440px',
                            margin: '0 auto',
                            padding: '0 20px 40px',
                        }}
                    >
                        {/* Logo + Hero */}
                        <div style={{ textAlign: 'center', paddingTop: '60px', paddingBottom: '32px' }}>
                            <motion.div
                                initial={{ scale: 0, rotate: -30 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ delay: 0.2, type: 'spring', damping: 12, stiffness: 200 }}
                                style={{
                                    width: '96px',
                                    height: '96px',
                                    backgroundColor: '#0C690F',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 24px',
                                    boxShadow: '0 4px 24px rgba(12,105,15,0.25)',
                                }}
                            >
                                <img
                                    src="/Logo.svg"
                                    alt="St.GeoARgen"
                                    style={{ width: '56px', height: '56px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
                                />
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                            >
                                <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#0C690F', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700 }}>
                                    Pfad abgeschlossen!
                                </p>
                                <h1 style={{ margin: '0 0 12px', fontSize: '26px', fontWeight: 800, color: '#111827', lineHeight: 1.2 }}>
                                    {pathTitle}
                                </h1>
                                {pathDescription && (
                                    <p style={{ margin: 0, fontSize: '14px', color: '#6b7280', lineHeight: 1.5 }}>
                                        {pathDescription}
                                    </p>
                                )}
                            </motion.div>

                            {/* Stars */}
                            <motion.div
                                style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}
                            >
                                {[0, 1, 2].map((i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.7 + i * 0.15, type: 'spring', stiffness: 300 }}
                                    >
                                        <Star style={{ width: '28px', height: '28px', fill: '#fbbf24', color: '#fbbf24' }} />
                                    </motion.div>
                                ))}
                            </motion.div>
                        </div>

                        {/* Points Card */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.8, type: 'spring', damping: 20 }}
                            style={{
                                backgroundColor: '#f0fdf4',
                                borderRadius: '20px',
                                padding: '20px',
                                border: '1px solid #bbf7d0',
                                marginBottom: '16px',
                            }}
                        >
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#6b7280' }}>Stationen</p>
                                    <p style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#111827' }}>{earnedStationPoints}</p>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>Punkte</p>
                                </div>
                                <div style={{ textAlign: 'center', borderLeft: '1px solid #bbf7d0' }}>
                                    <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#6b7280' }}>Pfad-Bonus</p>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                        <Zap style={{ width: '18px', height: '18px', color: '#f59e0b' }} />
                                        <p style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#0C690F' }}>+{bonusPoints}</p>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>Bonus</p>
                                </div>
                            </div>

                            {/* Total */}
                            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #bbf7d0', textAlign: 'center' }}>
                                <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#6b7280' }}>Gesamt verdient</p>
                                <motion.p
                                    initial={{ scale: 0.5 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 1.0, type: 'spring', stiffness: 300 }}
                                    style={{ margin: 0, fontSize: '40px', fontWeight: 900, color: '#0C690F' }}
                                >
                                    {totalPoints} <span style={{ fontSize: '20px', fontWeight: 600, color: '#6b7280' }}>Punkte</span>
                                </motion.p>
                            </div>
                        </motion.div>

                        {/* Station Summary */}
                        <AnimatePresence>
                            {showSummary && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ type: 'spring', damping: 20 }}
                                    style={{
                                        backgroundColor: 'white',
                                        borderRadius: '20px',
                                        padding: '16px 20px',
                                        border: '1px solid #e5e7eb',
                                        marginBottom: '16px',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                                    }}
                                >
                                    <h3 style={{ margin: '0 0 12px', color: '#374151', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <MapPin style={{ width: '16px', height: '16px', color: '#0C690F' }} />
                                        Besuchte Stationen
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {stations.map((station, index) => (
                                            <motion.div
                                                key={index}
                                                initial={{ opacity: 0, x: -16 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    backgroundColor: '#f9fafb',
                                                    borderRadius: '10px',
                                                    padding: '10px 12px',
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div
                                                        style={{
                                                            width: '24px',
                                                            height: '24px',
                                                            backgroundColor: '#dcfce7',
                                                            borderRadius: '50%',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        <span style={{ color: '#0C690F', fontSize: '13px', fontWeight: 700 }}>✓</span>
                                                    </div>
                                                    <span style={{ color: '#374151', fontSize: '14px', fontWeight: 500 }}>{station.title}</span>
                                                </div>
                                                <span style={{ color: '#0C690F', fontSize: '13px', fontWeight: 700 }}>+{station.points}</span>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Buttons */}
                        <AnimatePresence>
                            {showSummary && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
                                >
                                    {onNavigateToRewards && (
                                        <button
                                            onClick={onNavigateToRewards}
                                            style={{
                                                width: '100%',
                                                backgroundColor: '#0C690F',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '16px',
                                                padding: '16px 20px',
                                                fontSize: '16px',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                boxShadow: '0 4px 20px rgba(12,105,15,0.25)',
                                            }}
                                        >
                                            <Gift style={{ width: '20px', height: '20px' }} />
                                            Gutschein einlösen
                                        </button>
                                    )}
                                    <button
                                        onClick={onNavigateHome}
                                        style={{
                                            width: '100%',
                                            backgroundColor: 'white',
                                            color: '#374151',
                                            border: '1.5px solid #e5e7eb',
                                            borderRadius: '16px',
                                            padding: '14px 20px',
                                            fontSize: '15px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                        }}
                                    >
                                        <Home style={{ width: '18px', height: '18px' }} />
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
