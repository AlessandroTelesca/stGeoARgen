import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getSchwarzesTorTexts } from '../../../i18n/stations/schwarzesTor';
import { MobileOnlyNotice } from '../MobileOnlyNotice';

type SchwarzesTorViewProps = {
  onNavigateHome?: () => void;
};

export const SchwarzesTorView = ({ onNavigateHome }: SchwarzesTorViewProps) => {
  const { language } = useLanguage();
  const texts = getSchwarzesTorTexts(language);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isNotMobile = !isIOS && !isAndroid;

  if (isNotMobile) {
    return <MobileOnlyNotice />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-8 flex items-center justify-center">
      <div className="w-full max-w-xl bg-white/10 border border-white/20 rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
        <h1 className="text-2xl sm:text-3xl font-bold mb-3">{texts.stationName}</h1>
        <p className="text-sm sm:text-base text-white/85 leading-relaxed mb-6">{texts.longDescription}</p>
        <button
          onClick={onNavigateHome}
          className="inline-flex items-center justify-center rounded-xl bg-white text-slate-900 px-5 py-3 font-semibold hover:bg-white/90 transition-colors"
        >
          {texts.backButtonLabel}
        </button>
      </div>
    </div>
  );
};

export default SchwarzesTorView;