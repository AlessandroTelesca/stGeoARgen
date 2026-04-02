import { motion } from 'motion/react';
import { Trophy, Gift } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface ARProgressBarProps {
  progress: { current: number; total: number; points: number };
  stations: string[];
}

export const ARProgressBar = ({ progress, stations }: ARProgressBarProps) => {
  const { t } = useLanguage();
  return (
    <div className="ar-bottom-bar">
      <motion.div
        className="ar-progress-container"
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
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                  {status === 'completed' && isLastStation && (
                    <Gift style={{ width: '22px', height: '22px', color: 'white' }} />
                  )}
                  {status === 'current' && (
                    <div className="ar-station-current-dot" />
                  )}
                  {status === 'locked' && !isLastStation && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  )}
                  {status === 'locked' && isLastStation && (
                    <Gift style={{ width: '20px', height: '20px', color: '#9ca3af' }} />
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
            <Trophy style={{ width: '16px', height: '16px' }} />
            <span className="ar-points-text">{progress.points} {t('points')}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
