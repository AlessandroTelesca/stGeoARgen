import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, Gift } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface ARProgressBarProps {
  progress: { current: number; total: number; points: number };
  stations: string[];
  onCompactChange?: (isCompact: boolean) => void;
}

/** Fortschritt und Stationsstatus für die ARProgressBar aus den App-Zählern. */
export function buildARProgress(completedStations: number, totalStations: number, totalPoints: number) {
  const progress = {
    current: completedStations + 1 > totalStations ? totalStations : completedStations + 1,
    total: totalStations || 1,
    points: totalPoints,
  };
  const stations = Array.from({ length: Math.max(progress.total, 1) }, (_, i) => {
    if (i < completedStations) return 'completed';
    if (i === completedStations && completedStations < progress.total) return 'current';
    return 'locked';
  });
  return { progress, stations };
}

export const ARProgressBar = ({ progress, stations, onCompactChange }: ARProgressBarProps) => {
  const { t } = useLanguage();
  const [isCompact, setIsCompact] = useState(false);
  const compactTimerRef = useRef<number | null>(null);

  const startCompactTimer = () => {
    if (compactTimerRef.current !== null) {
      window.clearTimeout(compactTimerRef.current);
    }

    compactTimerRef.current = window.setTimeout(() => {
      setIsCompact(true);
    }, 3000);
  };

  useEffect(() => {
    setIsCompact(false);
    startCompactTimer();
  }, [progress.current]);

  useEffect(() => {
    return () => {
      if (compactTimerRef.current !== null) {
        window.clearTimeout(compactTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    onCompactChange?.(isCompact);
  }, [isCompact, onCompactChange]);

  const completedIconSize = isCompact ? 14 : 22;
  const lockedIconSize = isCompact ? 12 : 18;
  const giftIconSize = isCompact ? 14 : 22;
  const lockedGiftIconSize = isCompact ? 13 : 20;
  const trophyIconSize = isCompact ? 12 : 16;

  const handleExpandTemporarily = () => {
    setIsCompact(false);
    startCompactTimer();
  };

  return (
    <div className="ar-bottom-bar">
      <motion.div
        className={`ar-progress-container ${isCompact ? 'ar-progress-container-compact' : ''}`}
        onClick={handleExpandTemporarily}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {/* Stations Row */}
        <div className="ar-stations-row">
          {stations.map((status, index) => {
            const isLastStation = index === stations.length - 1;
            return (
              <div key={index} className={`ar-station-wrapper ${index < stations.length - 1 ? 'ar-station-wrapper-flex' : ''}`}>
                {/* Station Circle */}
                <motion.div
                  className={`ar-station-circle ${
                    status === 'completed' ? 'ar-station-completed' :
                    status === 'current' ? 'ar-station-current' :
                    'ar-station-locked'
                  }`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                >
                  {status === 'completed' && !isLastStation && (
                    <svg width={completedIconSize} height={completedIconSize} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                  {status === 'completed' && isLastStation && (
                    <Gift style={{ width: `${giftIconSize}px`, height: `${giftIconSize}px`, color: 'white' }} />
                  )}
                  {status === 'current' && (
                    <div className="ar-station-current-dot" />
                  )}
                  {status === 'locked' && !isLastStation && (
                    <svg width={lockedIconSize} height={lockedIconSize} viewBox="0 0 24 24" fill="none" stroke="#9aa39a" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  )}
                  {status === 'locked' && isLastStation && (
                    <Gift style={{ width: `${lockedGiftIconSize}px`, height: `${lockedGiftIconSize}px`, color: '#9aa39a' }} />
                  )}
                </motion.div>

                {/* Connecting Line */}
                {index < stations.length - 1 && (
                  <div className={`ar-station-line ${
                    index < progress.current - 1 ? 'ar-station-line-completed' : 'ar-station-line-locked'
                  }`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Info Row */}
        <div className="ar-info-row">
          <span className="ar-station-text">
            {t('station')} {progress.current}/{progress.total}
          </span>
          <div className="ar-points-badge">
            <Trophy style={{ width: `${trophyIconSize}px`, height: `${trophyIconSize}px` }} />
            <span className="ar-points-text">{progress.points} {t('points')}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
