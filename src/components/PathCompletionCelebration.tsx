import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Star, MapPin, Clock, Zap, Home, ChevronRight } from 'lucide-react';

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

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

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
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {/* Gradient Background */}
                    <div
                        style={{
                            minHeight: '100%',
                            background: 'linear-gradient(160deg, #064e3b 0%, #065f46 30%, #047857 60%, #059669 100%)',
                            position: 'relative',
                            overflow: 'hidden',
                            paddingBottom: '40px',
                        }}
                    >
                        {/* Confetti */}
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
                                    zIndex: 1,
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

                        {/* Content */}
                        <div
                            style={{
                                position: 'relative',
                                zIndex: 10,
                                maxWidth: '440px',
                                margin: '0 auto',
                                padding: '0 20px',
                            }}
                        >
                            {/* Hero Section */}
                            <div style={{ textAlign: 'center', paddingTop: '60px', paddingBottom: '32px' }}>
                                {/* Trophy Animation */}
                                <motion.div
                                    initial={{ scale: 0, rotate: -30 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ delay: 0.2, type: 'spring', damping: 12, stiffness: 200 }}
                                    style={{
                                        width: '120px',
                                        height: '120px',
                                        backgroundColor: 'rgba(255,255,255,0.15)',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto 24px',
                                        border: '3px solid rgba(255,255,255,0.3)',
                                        boxShadow: '0 0 60px rgba(251,191,36,0.4)',
                                    }}
                                >
                                    <Trophy style={{ width: '64px', height: '64px', color: '#fbbf24' }} />
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                >
                                    <p style={{ margin: '0 0 8px', fontSize: '14px', color: 'rgba(255,255,255,0.7)', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600 }}>
                                        Pfad abgeschlossen!
                                    </p>
                                    <h1 style={{ margin: '0 0 12px', fontSize: '28px', fontWeight: 800, color: 'white', lineHeight: 1.2 }}>
                                        {pathTitle}
                                    </h1>
                                    {pathDescription && (
                                        <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
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
                                    backgroundColor: 'rgba(255,255,255,0.15)',
                                    backdropFilter: 'blur(12px)',
                                    borderRadius: '20px',
                                    padding: '20px',
                                    border: '1px solid rgba(255,255,255,0.25)',
                                    marginBottom: '16px',
                                }}
                            >
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Stationen</p>
                                        <p style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: 'white' }}>{earnedStationPoints}</p>
                                        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Punkte gesammelt</p>
                                    </div>
                                    <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.2)' }}>
                                        <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Pfad-Bonus</p>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                            <Zap style={{ width: '18px', height: '18px', color: '#fbbf24' }} />
                                            <p style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#fbbf24' }}>+{bonusPoints}</p>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Abschluss-Bonus</p>
                                    </div>
                                </div>

                                {/* Total */}
                                <div
                                    style={{
                                        marginTop: '16px',
                                        paddingTop: '16px',
                                        borderTop: '1px solid rgba(255,255,255,0.2)',
                                        textAlign: 'center',
                                    }}
                                >
                                    <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Gesamt verdient</p>
                                    <motion.p
                                        initial={{ scale: 0.5 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 1.0, type: 'spring', stiffness: 300 }}
                                        style={{ margin: 0, fontSize: '40px', fontWeight: 900, color: 'white' }}
                                    >
                                        {totalPoints} <span style={{ fontSize: '20px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Punkte</span>
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
                                            backgroundColor: 'rgba(255,255,255,0.1)',
                                            backdropFilter: 'blur(8px)',
                                            borderRadius: '20px',
                                            padding: '16px 20px',
                                            border: '1px solid rgba(255,255,255,0.15)',
                                            marginBottom: '16px',
                                        }}
                                    >
                                        <h3 style={{ margin: '0 0 12px', color: 'white', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <MapPin style={{ width: '16px', height: '16px', color: 'rgba(255,255,255,0.7)' }} />
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
                                                        backgroundColor: 'rgba(255,255,255,0.1)',
                                                        borderRadius: '10px',
                                                        padding: '10px 12px',
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div
                                                            style={{
                                                                width: '24px',
                                                                height: '24px',
                                                                backgroundColor: '#22c55e',
                                                                borderRadius: '50%',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                flexShrink: 0,
                                                            }}
                                                        >
                                                            <span style={{ color: 'white', fontSize: '12px', fontWeight: 700 }}>✓</span>
                                                        </div>
                                                        <span style={{ color: 'white', fontSize: '14px', fontWeight: 500 }}>{station.title}</span>
                                                    </div>
                                                    <span style={{ color: '#fbbf24', fontSize: '13px', fontWeight: 700 }}>+{station.points}</span>
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
                                        <button
                                            onClick={onNavigateHome}
                                            style={{
                                                width: '100%',
                                                backgroundColor: 'white',
                                                color: '#065f46',
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
                                                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                                            }}
                                        >
                                            <Home style={{ width: '20px', height: '20px' }} />
                                            Zurück zur Startseite
                                        </button>

                                        <button
                                            onClick={onClose}
                                            style={{
                                                width: '100%',
                                                backgroundColor: 'rgba(255,255,255,0.15)',
                                                color: 'white',
                                                border: '2px solid rgba(255,255,255,0.3)',
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
                                            Zusammenfassung schließen
                                            <ChevronRight style={{ width: '18px', height: '18px' }} />
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
