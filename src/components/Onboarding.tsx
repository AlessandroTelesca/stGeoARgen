import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft, Trophy } from 'lucide-react';
import { GeorgiAvatar } from './Georgi';

interface OnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

const steps = [
  {
    id: 1,
    title: 'Willkommen in St.Georgen!',
    description: 'Ich bin Georgi, dein Drachen-Guide. Gemeinsam entdecken wir St.Georgen auf spannenden Themenpfaden voller Geschichte, Kultur und Abenteuer!',
    georgiMessage: 'Hey! Bereit für eine unvergessliche Entdeckungsreise?',
  },
  {
    id: 2,
    title: 'Wähle deinen Themenpfad',
    description: 'Such dir einen Themenpfad aus, der dich interessiert. Jeder Pfad führt dich zu besonderen Orten in St.Georgen - ob historische Sehenswürdigkeiten, Naturerlebnisse oder kulturelle Highlights!',
    georgiMessage: 'Der touristische Themenpfad ist perfekt für den Start!',
  },
  {
    id: 3,
    title: 'Erlebe AR an den Stationen',
    description: 'Besuche die Stationen in beliebiger Reihenfolge. An jeder Station erwartet dich ein spannendes AR-Erlebnis - entdecke interaktive Inhalte, löse Quizfragen und sammle Punkte!',
    georgiMessage: 'Die nähesten Stationen werden dir immer zuerst angezeigt!',
  },
  {
    id: 4,
    title: 'Hole deine Belohnungen ab',
    description: 'Mit gesammelten Punkten schaltest du Gutscheine frei, die du in echten Lokalitäten in St.Georgen einlösen kannst - Cafés, Restaurants, Museen und mehr!',
    georgiMessage: 'Sammle fleissig Punkte und genieße tolle Belohnungen vor Ort!',
  },
];

export function Onboarding({ onComplete, onSkip }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
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
        className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl"
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
            Überspringen
          </button>
        </div>

        {/* Content */}
        <div className="relative h-[500px] flex flex-col">
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
              className="flex-1 flex flex-col items-center justify-center p-8 text-center"
            >
              {/* Georgi Avatar */}
              <motion.div
                className="mb-6"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              >
                <GeorgiAvatar size="xl" animated />
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
                    <span>Zurück</span>
                  </div>
                </button>
              )}
              
              <button
                onClick={handleNext}
                className="flex-1 bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl transition-colors"
              >
                {isLastStep ? (
                  <div className="flex items-center justify-center gap-2">
                    <span>Los geht's!</span>
                    <Trophy className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <span>Weiter</span>
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