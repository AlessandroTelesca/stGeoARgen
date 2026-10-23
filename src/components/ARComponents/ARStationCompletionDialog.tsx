import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Home, Navigation, Clock, MapPin, Trophy, X, Flag } from 'lucide-react';
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

    const stats = [
        {
            Icon: Clock,
            value: formatDuration(durationSeconds),
            label: t('duration'),
            highlight: false,
        },
        {
            Icon: CheckCircle2,
            value: `${completedCount}/${totalStations}`,
            label: remainingStations > 0 ? `noch ${remainingStations}` : t('allFinished'),
            highlight: false,
        },
        {
            Icon: remainingStations > 0 ? MapPin : Flag,
            value: remainingStations > 0 ? formatDistance(distanceToNextStation) : '✓',
            label: remainingStations > 0 ? t('nextStationLabel') : t('pathCompletedLabel'),
            highlight: remainingStations === 0,
        },
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        className="ar-completion-backdrop fixed inset-0 z-[11100] bg-gray-900/70 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    />

                    <motion.div
                        className="fixed inset-0 z-[11110] flex items-end sm:items-center justify-center p-4"
                        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))' }}
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 30, opacity: 0 }}
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="station-complete-title"
                            className="relative w-full max-w-[440px] max-h-[92dvh] overflow-y-auto rounded-[32px] bg-card shadow-2xl"
                        >
                            {onClose && (
                                <button
                                    onClick={onClose}
                                    className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-white/15 border border-white/20 text-white flex items-center justify-center hover:bg-white/25 transition-colors"
                                    aria-label="Schließen"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}

                            {/* Kopf */}
                            <div className="brand-gradient relative overflow-hidden px-6 pt-8 pb-12 text-center text-white">
                                <div className="topo-texture absolute inset-0" aria-hidden="true" />
                                <motion.span
                                    className="relative mx-auto mb-4 flex w-20 h-20 items-center justify-center rounded-full bg-white text-primary shadow-lg"
                                    initial={{ scale: 0, rotate: -20 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ delay: 0.15, type: 'spring', damping: 13, stiffness: 220 }}
                                >
                                    <span className="absolute -inset-2.5 rounded-full border-2 border-white/30" aria-hidden="true" />
                                    <CheckCircle2 className="w-10 h-10" strokeWidth={2.25} />
                                </motion.span>
                                <h2 id="station-complete-title" className="relative text-2xl font-extrabold tracking-tight">
                                    {t('stationCompletedTitle')}
                                </h2>
                                <p className="relative mt-1 text-sm text-white/85">{stationTitle}</p>
                            </div>

                            <div className="relative -mt-6 rounded-t-[28px] bg-card px-5 pt-5 pb-5">
                                {/* Punkte */}
                                <motion.div
                                    className="mb-4 flex items-center justify-center gap-2 rounded-2xl bg-gold-soft px-4 py-3"
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.3, type: 'spring', stiffness: 260, damping: 16 }}
                                >
                                    <Trophy className="w-5 h-5 text-gold" />
                                    <span className="text-lg font-extrabold text-gold-foreground tabular-nums">
                                        +{stationPoints} {t('points')} {t('earned')}!
                                    </span>
                                </motion.div>

                                {/* Kennzahlen */}
                                <div className="mb-5 grid grid-cols-3 divide-x divide-border rounded-2xl border border-border">
                                    {stats.map(({ Icon, value, label, highlight }) => (
                                        <div key={label} className="px-2 py-3 text-center">
                                            <Icon className={`mx-auto mb-1 w-5 h-5 ${highlight ? 'text-primary' : 'text-muted-foreground'}`} />
                                            <div className="text-sm font-bold tabular-nums">{value}</div>
                                            <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Aktionen */}
                                <div className="flex flex-col gap-2.5">
                                    {remainingStations > 0 && (
                                        <button
                                            onClick={onNavigateToNextStation}
                                            className="w-full min-h-[54px] rounded-2xl bg-primary hover:bg-primary-dark text-white font-bold flex items-center justify-center gap-2 shadow-primary transition-colors pressable"
                                        >
                                            <Navigation className="w-[18px] h-[18px]" />
                                            {t('navigateToNextStation')}
                                        </button>
                                    )}
                                    <button
                                        onClick={onNavigateHome}
                                        className="w-full min-h-[50px] rounded-2xl border border-border bg-card font-semibold text-foreground flex items-center justify-center gap-2 hover:bg-muted transition-colors"
                                    >
                                        <Home className="w-[18px] h-[18px]" />
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
