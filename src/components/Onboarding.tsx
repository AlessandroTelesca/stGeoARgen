import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft, Trophy } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface OnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function Onboarding({ onComplete, onSkip }: OnboardingProps) {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const steps = [
    {
      id: 1,
      title: t('onboardingStep1Title'),
      description: t('onboardingStep1Description'),
      georgiMessage: t('georgiOnboardingStep1'),
    },
    {
      id: 2,
      title: t('onboardingStep2Title'),
      description: t('onboardingStep2Description'),
      georgiMessage: t('georgiOnboardingStep2'),
    },
    {
      id: 3,
      title: t('onboardingStep3Title'),
      description: t('onboardingStep3Description'),
      georgiMessage: t('georgiOnboardingStep3'),
    },
    {
      id: 4,
      title: t('onboardingStep4Title'),
      description: t('onboardingStep4Description'),
      georgiMessage: t('georgiOnboardingStep4'),
    },
  ];
  const [direction, setDirection] = useState(0);

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

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-3xl max-w-md w-full flex flex-col overflow-hidden shadow-2xl max-h-[90vh]"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        {/* Skip Button */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={onSkip}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-full hover:bg-muted"
          >
            {t('skip')}
          </button>
        </div>

        {/* Content */}
        <div className="relative flex-1 flex flex-col overflow-y-auto min-h-0">
          {/* Animated Step Content */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="flex-1 flex flex-col items-center justify-start pt-8 px-8 pb-4 text-center"
            >
              {/* Logo */}
              <motion.div
                className="mb-6"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              >
                <div style={{ width: '80px', height: '80px', backgroundColor: '#0C690F', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(12,105,15,0.25)', margin: '0 auto' }}>
                  <img src="/Logo.svg" alt="St.GeoARgen" style={{ width: '48px', height: '48px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
                </div>
              </motion.div>

              {/* Georgi Speech Bubble */}
              <motion.div
                className="bg-primary/10 border-2 border-primary/20 rounded-2xl p-4 mb-6 relative max-w-xs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                {/* Speech bubble tail */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-primary/20" />
                <p className="text-sm text-foreground italic">
                  "{step.georgiMessage}"
                </p>
              </motion.div>

              {/* Text Content */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="max-w-md"
              >
                <h2 className="text-2xl font-bold mb-4">{step.title}</h2>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            </motion.div>
          </AnimatePresence>

          {/* Progress Indicators */}
          <div className="px-8 pb-4">
            <div className="flex gap-2 justify-center mb-6">
              {steps.map((_, index) => (
                <motion.div
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index === currentStep
                      ? 'w-8 bg-primary'
                      : index < currentStep
                      ? 'w-2 bg-primary/50'
                      : 'w-2 bg-muted'
                  }`}
                  initial={false}
                  animate={{
                    width: index === currentStep ? 32 : 8,
                  }}
                />
              ))}
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-3">
              {currentStep > 0 && (
                <button
                  onClick={handlePrevious}
                  className="flex-1 bg-muted hover:bg-muted/80 px-6 py-3 rounded-xl transition-colors"
                >
                  <div className="flex items-center justify-center gap-2">
                    <ChevronLeft className="w-5 h-5" />
                    <span>{t('back')}</span>
                  </div>
                </button>
              )}
              
              <button
                onClick={handleNext}
                className="flex-1 bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl transition-colors"
              >
                {isLastStep ? (
                  <div className="flex items-center justify-center gap-2">
                    <span>{t('letsGo')}</span>
                    <Trophy className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <span>{t('next')}</span>
                    <ChevronRight className="w-5 h-5" />
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}