import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, Trophy, Map, ScanLine, Gift } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface OnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

const ease = [0.16, 1, 0.3, 1] as const;

export function Onboarding({ onComplete, onSkip }: OnboardingProps) {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);

  const steps = [
    { id: 1, title: t('onboardingStep1Title'), description: t('onboardingStep1Description'), georgiMessage: t('georgiOnboardingStep1'), Icon: null },
    { id: 2, title: t('onboardingStep2Title'), description: t('onboardingStep2Description'), georgiMessage: t('georgiOnboardingStep2'), Icon: Map },
    { id: 3, title: t('onboardingStep3Title'), description: t('onboardingStep3Description'), georgiMessage: t('georgiOnboardingStep3'), Icon: ScanLine },
    { id: 4, title: t('onboardingStep4Title'), description: t('onboardingStep4Description'), georgiMessage: t('georgiOnboardingStep4'), Icon: Gift },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setDirection(1);
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  };

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const StepIcon = step.Icon;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-900/55 backdrop-blur-sm sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <motion.div
        className="relative w-full sm:max-w-md h-[100dvh] sm:h-auto sm:max-h-[92dvh] bg-card sm:rounded-[32px] flex flex-col overflow-hidden shadow-2xl"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.5, ease }}
      >
        {/* Bühne */}
        <div
          className="brand-gradient relative flex-shrink-0 overflow-hidden"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <div className="topo-texture absolute inset-0" aria-hidden="true" />
          <div className="relative flex justify-between items-center px-5 pt-4">
            <span className="text-sm font-bold text-white/85 tabular-nums">
              {currentStep + 1} / {steps.length}
            </span>
            <button
              onClick={onSkip}
              className="text-sm font-semibold text-white bg-white/15 border border-white/20 hover:bg-white/25 transition-colors px-4 py-2 rounded-full"
            >
              {t('skip')}
            </button>
          </div>

          <div className="relative h-[clamp(176px,30dvh,260px)] flex items-center justify-center">
            <AnimatePresence mode="popLayout" initial={false} custom={direction}>
              <motion.div
                key={currentStep}
                custom={direction}
                initial={{ opacity: 0, scale: 0.8, x: direction * 60 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.85, x: direction * -60 }}
                transition={{ duration: 0.5, ease }}
                className="relative"
              >
                <span className="absolute inset-0 -m-6 rounded-full bg-white/10" aria-hidden="true" />
                <span className="absolute inset-0 -m-12 rounded-full bg-white/[0.06]" aria-hidden="true" />
                <span className="relative w-28 h-28 rounded-full bg-white flex items-center justify-center shadow-lg">
                  {StepIcon ? (
                    <StepIcon className="w-12 h-12 text-primary" strokeWidth={1.75} />
                  ) : (
                    <img src="/Logo.svg" alt="" className="w-16 h-16 object-contain" />
                  )}
                </span>
                {StepIcon && (
                  <span className="absolute -right-2 -bottom-1 w-11 h-11 rounded-full bg-primary border-[3px] border-white flex items-center justify-center shadow-md">
                    <img src="/Logo.svg" alt="" className="w-6 h-6 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
                  </span>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Inhalt */}
        <div className="relative flex-1 min-h-0 overflow-y-auto -mt-6 rounded-t-[28px] bg-card">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: direction * 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -24 }}
              transition={{ duration: 0.28, ease }}
              className="px-6 pt-7 pb-4 text-center"
            >
              <h2 id="onboarding-title" className="text-[26px] leading-tight font-extrabold tracking-tight">
                {step.title}
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed max-w-[34ch] mx-auto">
                {step.description}
              </p>

              {/* Georgi */}
              <div className="mt-6 flex items-start gap-3 text-left rounded-2xl bg-secondary px-4 py-3.5 max-w-sm mx-auto">
                <span className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <img src="/Logo.svg" alt="" className="w-5 h-5 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
                </span>
                <p className="text-sm leading-snug text-foreground pt-0.5">
                  <span className="block text-xs font-bold text-primary mb-0.5">Georgi</span>
                  {step.georgiMessage}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Fortschritt & Navigation */}
        <div
          className="flex-shrink-0 px-5 pt-3 bg-card"
          style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="flex gap-1.5 justify-center mb-4" aria-hidden="true">
            {steps.map((_, index) => (
              <motion.span
                key={index}
                className={`h-1.5 rounded-full ${index <= currentStep ? 'bg-primary' : 'bg-border-strong'}`}
                initial={false}
                animate={{ width: index === currentStep ? 28 : 8, opacity: index < currentStep ? 0.45 : 1 }}
                transition={{ duration: 0.35, ease }}
              />
            ))}
          </div>

          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="h-14 px-5 rounded-2xl bg-muted hover:bg-gray-200 font-semibold transition-colors flex items-center justify-center gap-1.5 pressable"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>{t('back')}</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="h-14 flex-1 rounded-2xl bg-primary hover:bg-primary-dark text-white font-bold shadow-primary transition-colors flex items-center justify-center gap-2 pressable whitespace-nowrap"
            >
              <span>{isLastStep ? t('letsGo') : t('next')}</span>
              {isLastStep ? <Trophy className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
