import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Home, Navigation, Clock, MapPin, Trophy, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface ARStationCompletionDialogProps {
    isOpen: boolean;
    stationTitle: string;
    stationPoints: number;
    /** Aufenthaltsdauer in Sekunden */
    durationSeconds: number;
    /** Verbleibende Stationen im Pfad (ohne aktuelle) */
    remainingStations: number;
    /** Gesamtanzahl Stationen im Pfad */
    totalStations: number;
    /** Distanz zur nächsten Station in Metern (null wenn unbekannt) */
    distanceToNextStation: number | null;
    onNavigateHome: () => void;
    onNavigateToNextStation: () => void;
    onClose?: () => void;
}

function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s} Sek.`;
    if (s === 0) return `${m} Min.`;
    return `${m} Min. ${s} Sek.`;
}

function formatDistance(meters: number | null): string {
    if (meters === null) return '–';
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
}

export const ARStationCompletionDialog = ({
    isOpen,
    stationTitle,
    stationPoints,
    durationSeconds,
    remainingStations,
    totalStations,
    distanceToNextStation,
    onNavigateHome,
    onNavigateToNextStation,
    onClose,
}: ARStationCompletionDialogProps) => {
    const { t } = useLanguage();
    const completedCount = totalStations - remainingStations;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="ar-completion-backdrop"
                        style={{
                            position: 'fixed',
                            inset: 0,
                            backgroundColor: 'rgba(0,0,0,0.75)',
                            zIndex: 200,
                            backdropFilter: 'blur(4px)',
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    />

                    {/* Dialog */}
                    <motion.div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 210,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '16px',
                        }}
                        initial={{ y: 20, opacity: 0, scale: 0.98 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 20, opacity: 0, scale: 0.98 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                    >
                        <div
                            style={{
                                maxWidth: '440px',
                                width: '100%',
                                maxHeight: '92vh',
                                backgroundColor: '#fff',
                                borderRadius: '24px',
                                overflowY: 'auto',
                                boxShadow: '0 -4px 40px rgba(0,0,0,0.3)',
                                position: 'relative',
                            }}
                        >
                            {/* Close Button */}
                            {onClose && (
                                <button
                                    onClick={onClose}
                                    style={{
                                        position: 'absolute',
                                        top: '12px',
                                        right: '12px',
                                        zIndex: 10001,
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '8px',
                                        transition: 'background-color 0.2s',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                    aria-label="Schließen"
                                >
                                    <X style={{ width: '20px', height: '20px', color: '#6b7280' }} />
                                </button>
                            )}

                            {/* Green success header */}
                            <div
                                style={{
                                    background: 'linear-gradient(135deg, #0C690F, #094d0b)',
                                    padding: '24px 24px 20px',
                                    textAlign: 'center',
                                    color: 'white',
                                }}
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.2, type: 'spring', damping: 15 }}
                                    style={{
                                        width: '72px',
                                        height: '72px',
                                        backgroundColor: 'rgba(255,255,255,0.25)',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto 12px',
                                        border: '3px solid rgba(255,255,255,0.5)',
                                    }}
                                >
                                    <CheckCircle2 style={{ width: '40px', height: '40px', color: 'white' }} />
                                </motion.div>
                                <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 700 }}>
                                    {t('stationCompletedTitle')}
                                </h2>
                                <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
                                    {stationTitle}
                                </p>
                            </div>

                            {/* Stats */}
                            <div style={{ padding: '16px 20px 0' }}>
                                {/* Points earned */}
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        backgroundColor: '#fef9c3',
                                        border: '1px solid #fde047',
                                        borderRadius: '12px',
                                        padding: '10px 16px',
                                        marginBottom: '12px',
                                    }}
                                >
                                    <Trophy style={{ width: '20px', height: '20px', color: '#ca8a04' }} />
                                    <span style={{ fontWeight: 700, fontSize: '18px', color: '#854d0e' }}>
                                        +{stationPoints} {t('points')} {t('earned')}!
                                    </span>
                                </div>

                                {/* 3-column stats */}
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr 1fr',
                                        gap: '8px',
                                        marginBottom: '20px',
                                    }}
                                >
                                    {/* Time spent */}
                                    <div
                                        style={{
                                            backgroundColor: '#f8fafc',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '12px',
                                            padding: '12px 8px',
                                            textAlign: 'center',
                                        }}
                                    >
                                        <Clock style={{ width: '20px', height: '20px', color: '#64748b', margin: '0 auto 4px' }} />
                                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                                            {formatDuration(durationSeconds)}
                                        </div>
                                        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                                            {t('duration')}
                                        </div>
                                    </div>

                                    {/* Remaining stations */}
                                    <div
                                        style={{
                                            backgroundColor: '#f8fafc',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '12px',
                                            padding: '12px 8px',
                                            textAlign: 'center',
                                        }}
                                    >
                                        <CheckCircle2 style={{ width: '20px', height: '20px', color: '#64748b', margin: '0 auto 4px' }} />
                                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                                            {completedCount}/{totalStations}
                                        </div>
                                        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                                            {remainingStations > 0 ? `noch ${remainingStations}` : t('allFinished')}
                                        </div>
                                    </div>

                                    {/* Distance to next */}
                                    <div
                                        style={{
                                            backgroundColor: remainingStations > 0 ? '#f8fafc' : '#f0fdf4',
                                            border: `1px solid ${remainingStations > 0 ? '#e2e8f0' : '#bbf7d0'}`,
                                            borderRadius: '12px',
                                            padding: '12px 8px',
                                            textAlign: 'center',
                                        }}
                                    >
                                        <MapPin style={{ width: '20px', height: '20px', color: remainingStations > 0 ? '#6b7280' : '#0C690F', margin: '0 auto 4px' }} />
                                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                                            {remainingStations > 0 ? formatDistance(distanceToNextStation) : '🎉'}
                                        </div>
                                        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                                            {remainingStations > 0 ? t('nextStationLabel') : t('pathCompletedLabel')}
                                        </div>
                                    </div>
                                </div>

                                {/* Buttons */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '8px' }}>
                                    {/* Primary: Navigate to next station */}
                                    {remainingStations > 0 && (
                                        <button
                                            onClick={onNavigateToNextStation}
                                            style={{
                                                width: '100%',
                                                backgroundColor: '#0C690F',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '14px',
                                                padding: '15px 20px',
                                                fontSize: '15px',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                transition: 'background-color 0.2s',
                                            }}
                                            onTouchStart={(e) => (e.currentTarget.style.backgroundColor = '#094d0b')}
                                            onTouchEnd={(e) => (e.currentTarget.style.backgroundColor = '#0C690F')}
                                        >
                                            <Navigation style={{ width: '18px', height: '18px' }} />
                                            {t('navigateToNextStation')}
                                        </button>
                                    )}

                                    {/* Secondary: Back to home */}
                                    <button
                                        onClick={onNavigateHome}
                                        style={{
                                            width: '100%',
                                            backgroundColor: 'transparent',
                                            color: '#64748b',
                                            border: '2px solid #e2e8f0',
                                            borderRadius: '14px',
                                            padding: '13px 20px',
                                            fontSize: '15px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            transition: 'border-color 0.2s, background-color 0.2s',
                                        }}
                                        onTouchStart={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                                        onTouchEnd={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                    >
                                        <Home style={{ width: '18px', height: '18px' }} />
                                        {t('backToHome')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
