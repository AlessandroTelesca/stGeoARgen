import React, { useEffect, useMemo, useRef } from 'react';
import { Check, Music2, Play, Trash2, Undo2, Volume2, X } from 'lucide-react';
import * as THREE from 'three';
import * as Tone from 'tone';
import { ARComponentBase } from '../ARComponentBase';
import { ARProximityGate } from '../ARProximityGate';
import { GyroARVisualizer } from '../../../ARbackend/GyroARVisualizer';
import { AR_VIEW_STATION_MAP } from '../../../data/stationsConfig';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getPhonomuseumTexts } from '../../../i18n/stations/phonomuseum';
import { MobileOnlyNotice } from '../MobileOnlyNotice';

interface ARViewProps {
  onNavigateHome?: () => void;
  username?: string | null;
  onLogin?: () => void;
  onLogout?: () => void;
  onNavigateProfile?: () => void;
  onRegister?: () => void;
  completedStations?: number;
  totalStations?: number;
  totalPoints?: number;
  currentStationPoints?: number;
  onCompleteStation?: (stationId: number) => void;
  isCurrentStationCompleted?: boolean;
  isGuestMode?: boolean;
}

class PhonomuseumARSession extends GyroARVisualizer {
  private readonly panoramaUrl = '/images/360/phonomuseum.jpg';

  private loadPanoramaTexture(url: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      new THREE.TextureLoader().load(
        url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.generateMipmaps = false;
          resolve(texture);
        },
        undefined,
        (error) => reject(error)
      );
    });
  }

  async init(): Promise<void> {
    await super.init();

    try {
      this.setPanoramaBackground(await this.loadPanoramaTexture(this.panoramaUrl));
    } catch (err) {
      console.error('[PhonomuseumARSession] Failed to load panorama texture', err);
    }

    if (this.camera) {
      this.camera.position.set(0, 0, 0);
      this.camera.lookAt(0, 0, -1);
    }
  }
}

type QuizPhase = 'question' | 'feedback' | 'reveal' | 'yourTurn' | 'summary';
type SoundType = 'phonograph' | 'gramophone' | 'plattenspieler';

type MelodyStep = {
  midi: number;
  duration: string;
  velocity?: number;
  rest?: boolean;
};

type TonePlayableInstrument = {
  triggerAttackRelease: (note: string, duration: string, time: number, velocity?: number) => unknown;
  dispose: () => void;
};

const PHONOMUSEUM_SOUND_SCENES: Record<
  SoundType,
  {
    createInstrument: () => TonePlayableInstrument;
    melody: MelodyStep[];
  }
> = {
  phonograph: {
    createInstrument: () => {
      const output = new Tone.Gain(0.2).toDestination();

      const primarySynth = new Tone.MonoSynth({
        oscillator: { type: 'square' },
        envelope: { attack: 0.018, decay: 0.14, sustain: 0.12, release: 0.2 },
        filterEnvelope: { attack: 0.006, decay: 0.11, sustain: 0.16, release: 0.15, baseFrequency: 260, octaves: 1.1 },
        filter: { Q: 4.8, type: 'lowpass', rolloff: -24 },
        portamento: 0.045,
      });
      const resonanceSynth = new Tone.AMSynth({
        harmonicity: 1.35,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.015, decay: 0.14, sustain: 0.14, release: 0.18 },
        modulation: { type: 'triangle' },
        modulationEnvelope: { attack: 0.01, decay: 0.08, sustain: 0.09, release: 0.14 },
      });
      const wowFlutter = new Tone.Vibrato(4.2, 0.12);
      const saturation = new Tone.Distortion(0.1);
      const highpass = new Tone.Filter({ frequency: 190, type: 'highpass', rolloff: -24, Q: 0.8 });
      const lowpass = new Tone.Filter({ frequency: 2550, type: 'lowpass', rolloff: -24, Q: 1.15 });
      const bitDepth = new Tone.BitCrusher(7);
      const compressor = new Tone.Compressor(-25, 3.8);

      const bedNoise = new Tone.Noise('brown');
      const bedNoiseFilter = new Tone.Filter({ frequency: 1700, type: 'lowpass', Q: 0.7 });
      const bedNoiseGain = new Tone.Gain(0.018);
      const crackle = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.0005, decay: 0.025, sustain: 0, release: 0.02 },
      });
      const crackleFilter = new Tone.Filter({ frequency: 3400, type: 'highpass', Q: 0.9 });
      const crackleGain = new Tone.Gain(0.045);

      primarySynth.connect(wowFlutter);
      resonanceSynth.connect(wowFlutter);
      wowFlutter.connect(saturation);
      saturation.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(bitDepth);
      bitDepth.connect(compressor);
      compressor.connect(output);

      bedNoise.connect(bedNoiseFilter);
      bedNoiseFilter.connect(bedNoiseGain);
      bedNoiseGain.connect(output);
      bedNoise.start();

      crackle.connect(crackleFilter);
      crackleFilter.connect(crackleGain);
      crackleGain.connect(output);

      return {
        triggerAttackRelease: (note: string, duration: string, time: number, velocity = 0.8) => {
          primarySynth.triggerAttackRelease(note, duration, time, velocity);
          const lowerResonanceNote = Tone.Frequency(note).transpose(-12).toNote();
          resonanceSynth.triggerAttackRelease(lowerResonanceNote, duration, time, velocity * 0.46);
          crackle.triggerAttackRelease('32n', time, velocity * 0.28);
        },
        dispose: () => {
          primarySynth.dispose();
          resonanceSynth.dispose();
          wowFlutter.dispose();
          saturation.dispose();
          highpass.dispose();
          lowpass.dispose();
          bitDepth.dispose();
          compressor.dispose();
          bedNoise.dispose();
          bedNoiseFilter.dispose();
          bedNoiseGain.dispose();
          crackle.dispose();
          crackleFilter.dispose();
          crackleGain.dispose();
          output.dispose();
        },
      };
    },
    melody: [
      { midi: 60, duration: '8n', velocity: 0.76 },
      { midi: 62, duration: '8n', velocity: 0.76 },
      { midi: 64, duration: '8n', velocity: 0.76 },
      { midi: 65, duration: '8n', velocity: 0.76 },
      { midi: 67, duration: '8n', velocity: 0.8 },
      { midi: 67, duration: '8n', velocity: 0.8 },
      { midi: 69, duration: '8n', velocity: 0.8 },
      { midi: 69, duration: '8n', velocity: 0.8 },
      { midi: 67, duration: '4n', velocity: 0.82 },
    ],
  },
  gramophone: {
    createInstrument: () => {
      const output = new Tone.Gain(0.95).toDestination();

      const leadSynth = new Tone.DuoSynth({
        harmonicity: 1.5,
        vibratoRate: 5.1,
        vibratoAmount: 0.035,
        voice0: {
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.012, decay: 0.11, sustain: 0.16, release: 0.2 },
          filterEnvelope: { attack: 0.004, decay: 0.08, sustain: 0.2, release: 0.1, baseFrequency: 460, octaves: 1.3 },
        },
        voice1: {
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 0.01, decay: 0.09, sustain: 0.11, release: 0.16 },
          filterEnvelope: { attack: 0.004, decay: 0.08, sustain: 0.15, release: 0.1, baseFrequency: 520, octaves: 1.1 },
        },
      });
      const wowFlutter = new Tone.Vibrato(5.4, 0.055);
      const highpass = new Tone.Filter({ frequency: 145, type: 'highpass', rolloff: -24, Q: 0.7 });
      const midBand = new Tone.Filter({ frequency: 1850, type: 'bandpass', Q: 1.3 });
      const lowpass = new Tone.Filter({ frequency: 4100, type: 'lowpass', rolloff: -24, Q: 0.8 });
      const saturation = new Tone.Distortion(0.08);
      const compressor = new Tone.Compressor(-22, 2.7);

      const surfaceNoise = new Tone.Noise('pink');
      const surfaceNoiseFilter = new Tone.Filter({ frequency: 2500, type: 'highpass', Q: 0.6 });
      const surfaceNoiseGain = new Tone.Gain(0.013);

      leadSynth.connect(wowFlutter);
      wowFlutter.connect(highpass);
      highpass.connect(midBand);
      midBand.connect(lowpass);
      lowpass.connect(saturation);
      saturation.connect(compressor);
      compressor.connect(output);

      surfaceNoise.connect(surfaceNoiseFilter);
      surfaceNoiseFilter.connect(surfaceNoiseGain);
      surfaceNoiseGain.connect(output);
      surfaceNoise.start();

      return {
        triggerAttackRelease: (note: string, duration: string, time: number, velocity = 0.8) => {
          leadSynth.triggerAttackRelease(note, duration, time, velocity);
        },
        dispose: () => {
          leadSynth.dispose();
          wowFlutter.dispose();
          highpass.dispose();
          midBand.dispose();
          lowpass.dispose();
          saturation.dispose();
          compressor.dispose();
          surfaceNoise.dispose();
          surfaceNoiseFilter.dispose();
          surfaceNoiseGain.dispose();
          output.dispose();
        },
      };
    },
    melody: [
      { midi: 60, duration: '8n', velocity: 0.76 },
      { midi: 62, duration: '8n', velocity: 0.76 },
      { midi: 64, duration: '8n', velocity: 0.76 },
      { midi: 65, duration: '8n', velocity: 0.76 },
      { midi: 67, duration: '8n', velocity: 0.8 },
      { midi: 67, duration: '8n', velocity: 0.8 },
      { midi: 69, duration: '8n', velocity: 0.8 },
      { midi: 69, duration: '8n', velocity: 0.8 },
      { midi: 67, duration: '4n', velocity: 0.82 },
    ],
  },
  plattenspieler: {
    createInstrument: () => {
      const output = new Tone.Gain(0.98).toDestination();

      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.005, decay: 0.13, sustain: 0.2, release: 0.26 },
      });
      const wowFlutter = new Tone.Vibrato(5.9, 0.018);
      const chorus = new Tone.Chorus({ frequency: 0.28, delayTime: 2.6, depth: 0.08, spread: 120 });
      const highpass = new Tone.Filter({ frequency: 34, type: 'highpass', rolloff: -24, Q: 0.6 });
      const lowpass = new Tone.Filter({ frequency: 12800, type: 'lowpass', rolloff: -12, Q: 0.5 });
      const saturation = new Tone.Distortion(0.025);
      const compressor = new Tone.Compressor(-19, 2.1);

      const rumbleNoise = new Tone.Noise('brown');
      const rumbleFilter = new Tone.Filter({ frequency: 85, type: 'lowpass', Q: 0.6 });
      const rumbleGain = new Tone.Gain(0.012);
      const vinylNoise = new Tone.Noise('white');
      const vinylNoiseFilter = new Tone.Filter({ frequency: 5200, type: 'highpass', Q: 0.7 });
      const vinylNoiseGain = new Tone.Gain(0.0035);

      synth.connect(wowFlutter);
      wowFlutter.connect(chorus);
      chorus.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(saturation);
      saturation.connect(compressor);
      compressor.connect(output);

      rumbleNoise.connect(rumbleFilter);
      rumbleFilter.connect(rumbleGain);
      rumbleGain.connect(output);
      rumbleNoise.start();

      vinylNoise.connect(vinylNoiseFilter);
      vinylNoiseFilter.connect(vinylNoiseGain);
      vinylNoiseGain.connect(output);
      vinylNoise.start();

      chorus.start();

      return {
        triggerAttackRelease: synth.triggerAttackRelease.bind(synth),
        dispose: () => {
          synth.dispose();
          wowFlutter.dispose();
          chorus.dispose();
          highpass.dispose();
          lowpass.dispose();
          saturation.dispose();
          compressor.dispose();
          rumbleNoise.dispose();
          rumbleFilter.dispose();
          rumbleGain.dispose();
          vinylNoise.dispose();
          vinylNoiseFilter.dispose();
          vinylNoiseGain.dispose();
          output.dispose();
        },
      };
    },
    melody: [
      { midi: 60, duration: '8n', velocity: 0.76 },
      { midi: 62, duration: '8n', velocity: 0.76 },
      { midi: 64, duration: '8n', velocity: 0.76 },
      { midi: 65, duration: '8n', velocity: 0.76 },
      { midi: 67, duration: '8n', velocity: 0.8 },
      { midi: 67, duration: '8n', velocity: 0.8 },
      { midi: 69, duration: '8n', velocity: 0.8 },
      { midi: 69, duration: '8n', velocity: 0.8 },
      { midi: 67, duration: '4n', velocity: 0.82 },
    ],
  },
};

const YOUR_TURN_MIN_NOTES = 6;
const YOUR_TURN_MAX_NOTES = 8;
const QUIZ_UI_SAFE_VERTICAL_GAP = 88;

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
const COMPLETE_BUTTON_SAFE_GAP = 110;
const QUIZ_PANEL_GLASS_BACKGROUND = 'rgba(228, 232, 236, 0.24)';
const QUIZ_PANEL_INNER_PADDING = '14px';
const YOUR_TURN_NOTE_OPTIONS: Array<{ label: string; midi: number }> = [
  { label: 'C4', midi: 60 },
  { label: 'D4', midi: 62 },
  { label: 'E4', midi: 64 },
  { label: 'F4', midi: 65 },
  { label: 'G4', midi: 67 },
  { label: 'A4', midi: 69 },
  { label: 'B4', midi: 71 },
  { label: 'C5', midi: 72 },
];

export const PhonomuseumView = ({ onNavigateHome, username, onLogin, onLogout, onNavigateProfile, onRegister, completedStations, totalStations, totalPoints, currentStationPoints = 0, onCompleteStation, isCurrentStationCompleted = false, isGuestMode = false }: ARViewProps) => {
  const { language } = useLanguage();
  const phonomuseumTexts = getPhonomuseumTexts(language);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isNotMobile = !isIOS && !isAndroid;
  const mediumLessonCopy = phonomuseumTexts.mediumLesson;
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<PhonomuseumARSession | null>(null);
  const activeToneInstrumentRef = useRef<TonePlayableInstrument | null>(null);
  const toneCleanupTimeoutRef = useRef<number | null>(null);
  const [isAuthorized, setIsAuthorized] = React.useState(false);
  const [hasStarted, setHasStarted] = React.useState(false);
  const [isStarting, setIsStarting] = React.useState(false);
  const [startError, setStartError] = React.useState<string | null>(null);
  const [showIntro, setShowIntro] = React.useState(true);
  const [phase, setPhase] = React.useState<QuizPhase>('question');
  const questions = phonomuseumTexts.questions;
  const totalQuestions = questions.length;
  const [shuffledQuestionOrder, setShuffledQuestionOrder] = React.useState<number[]>(() =>
    shuffleArray(questions.map((_, i) => i))
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
  const [selectedAnswerIndex, setSelectedAnswerIndex] = React.useState<number | null>(null);
  const [wrongAnswerSelections, setWrongAnswerSelections] = React.useState<Array<number[]>>(() =>
    questions.map(() => [])
  );
  const [questionResults, setQuestionResults] = React.useState<Array<boolean | null>>(() =>
    questions.map(() => null)
  );
  const [correctAnswers, setCorrectAnswers] = React.useState(0);
  const [lastAnswerCorrect, setLastAnswerCorrect] = React.useState<boolean | null>(null);
  const [showMediumLesson, setShowMediumLesson] = React.useState(true);
  const [mediumLessonQuestionIndex, setMediumLessonQuestionIndex] = React.useState(0);
  const [mediumLessonSelectedAnswer, setMediumLessonSelectedAnswer] = React.useState<SoundType | null>(null);
  const [mediumLessonLastCorrect, setMediumLessonLastCorrect] = React.useState<boolean | null>(null);
  const [mediumLessonWrongSelections, setMediumLessonWrongSelections] = React.useState<Array<SoundType[]>>(() =>
    mediumLessonCopy.questions.map(() => [])
  );
  const [mediumLessonResults, setMediumLessonResults] = React.useState<Array<boolean | null>>(() =>
    mediumLessonCopy.questions.map(() => null)
  );
  const [mediumLessonFinished, setMediumLessonFinished] = React.useState(false);
  const [revealRotation, setRevealRotation] = React.useState({ x: -16, y: 24 });
  const [showDragInstruction, setShowDragInstruction] = React.useState(false);
  const [dragsSinceReveal, setDragsSinceReveal] = React.useState(0);
  const [hideQuizSummary, setHideQuizSummary] = React.useState(false);
  const [yourTurnMelody, setYourTurnMelody] = React.useState<number[]>([]);
  const [hasPlayedYourTurnMelody, setHasPlayedYourTurnMelody] = React.useState(false);
  const [activeSoundButtonId, setActiveSoundButtonId] = React.useState<string | null>(null);
  const soundIndicatorTimeoutRef = useRef<number | null>(null);
  const dragStateRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startRotX: -16,
    startRotY: 24,
    counted: false,
  });

  if (isNotMobile) {
    return <MobileOnlyNotice />;
  }

  const currentQuestion = questions[shuffledQuestionOrder[currentQuestionIndex] ?? currentQuestionIndex];
  const currentMediumLessonQuestion = mediumLessonCopy.questions[mediumLessonQuestionIndex];
  const melodyEditLabel = language === 'de' ? 'Bearbeiten' : 'Edit melody';
  const hasPassedQuiz = isCurrentStationCompleted || phase === 'summary';
  const yourTurnMelodyValid = yourTurnMelody.length >= YOUR_TURN_MIN_NOTES && yourTurnMelody.length <= YOUR_TURN_MAX_NOTES;
  const showStationCompleteButton =
    !showIntro &&
    !showMediumLesson &&
    ((phase === 'summary' && !hideQuizSummary) || phase === 'yourTurn');
  const quizPanelMaxHeight = `calc(100vh - ${QUIZ_UI_SAFE_VERTICAL_GAP * 2 + (showStationCompleteButton ? COMPLETE_BUTTON_SAFE_GAP : 0)}px)`;

  const yourTurnMelodyDisplay = useMemo(() => {
    const noteMap = new Map<number, string>(YOUR_TURN_NOTE_OPTIONS.map((option) => [option.midi, option.label]));
    return yourTurnMelody.map((midi) => noteMap.get(midi) ?? Tone.Frequency(midi, 'midi').toNote()).join(' - ');
  }, [yourTurnMelody]);

  const yourTurnNotesCountText = useMemo(() => {
    return phonomuseumTexts.yourTurn.notesCountLabel.replace('{count}', String(yourTurnMelody.length));
  }, [phonomuseumTexts.yourTurn.notesCountLabel, yourTurnMelody.length]);

  const mediumLessonCorrectCount = useMemo(
    () => mediumLessonResults.filter((result) => result === true).length,
    [mediumLessonResults]
  );

  const mediumLessonScoreText = useMemo(() => {
    return mediumLessonCopy.resultBody
      .replace('{correct}', String(mediumLessonCorrectCount))
      .replace('{total}', String(mediumLessonCopy.questions.length));
  }, [mediumLessonCopy, mediumLessonCorrectCount]);

  const scoreText = useMemo(() => {
    return phonomuseumTexts.finishScore
      .replace('{correct}', String(correctAnswers))
      .replace('{total}', String(totalQuestions));
  }, [correctAnswers, phonomuseumTexts.finishScore, totalQuestions]);

  const playMelodyByMedium = async (soundType: SoundType, melody: MelodyStep[], sourceButtonId?: string) => {
    try {
      await Tone.start();

      if (toneCleanupTimeoutRef.current !== null) {
        window.clearTimeout(toneCleanupTimeoutRef.current);
      }

      activeToneInstrumentRef.current?.dispose();

      const selectedPattern = PHONOMUSEUM_SOUND_SCENES[soundType];
      const instrument = selectedPattern.createInstrument();
      activeToneInstrumentRef.current = instrument;

      const startTime = Tone.now() + 0.05;
      let elapsedSeconds = 0;

      melody.forEach((step) => {
        const stepDurationSeconds = Tone.Time(step.duration).toSeconds();

        if (!step.rest) {
          const note = Tone.Frequency(step.midi, 'midi').toNote();
          instrument.triggerAttackRelease(note, step.duration, startTime + elapsedSeconds, step.velocity ?? 0.8);
        }

        elapsedSeconds += stepDurationSeconds;
      });

      if (soundIndicatorTimeoutRef.current !== null) {
        window.clearTimeout(soundIndicatorTimeoutRef.current);
      }

      setActiveSoundButtonId(sourceButtonId ?? null);

      toneCleanupTimeoutRef.current = window.setTimeout(() => {
        instrument.dispose();
        if (activeToneInstrumentRef.current === instrument) {
          activeToneInstrumentRef.current = null;
        }
      }, Math.ceil((elapsedSeconds + 0.6) * 1000));

      soundIndicatorTimeoutRef.current = window.setTimeout(() => {
        setActiveSoundButtonId((current) => (current === (sourceButtonId ?? null) ? null : current));
      }, Math.ceil((elapsedSeconds + 0.35) * 1000));
    } catch (error) {
      console.error('[PhonomuseumView] Tone playback failed:', error);
    }
  };

  const playQuestionSound = async (soundType: SoundType, sourceButtonId?: string) => {
    await playMelodyByMedium(soundType, PHONOMUSEUM_SOUND_SCENES[soundType].melody, sourceButtonId);
  };

  const playYourTurnMelody = async (soundType: SoundType, sourceButtonId?: string) => {
    if (!yourTurnMelodyValid) {
      return;
    }

    const melody = yourTurnMelody.map((midi) => ({ midi, duration: '8n', velocity: 0.8 }));
    await playMelodyByMedium(soundType, melody, sourceButtonId);
    setHasPlayedYourTurnMelody(true);
  };

  const playClickedYourTurnNote = async (midi: number, sourceButtonId?: string) => {
    await playMelodyByMedium('plattenspieler', [{ midi, duration: '8n', velocity: 0.82 }], sourceButtonId);
  };

  const addNoteToYourTurnMelody = (midi: number) => {
    if (yourTurnMelody.length >= YOUR_TURN_MAX_NOTES) {
      return;
    }

    void playClickedYourTurnNote(midi, `note-${midi}`);

    setYourTurnMelody((prev) => {
      if (prev.length >= YOUR_TURN_MAX_NOTES) {
        return prev;
      }

      return [...prev, midi];
    });
  };

  const removeLastYourTurnNote = () => {
    setYourTurnMelody((prev) => prev.slice(0, -1));
  };

  const clearYourTurnMelody = () => {
    setYourTurnMelody([]);
    setHasPlayedYourTurnMelody(false);
  };

  const handleAnswerSelection = (answerIndex: number) => {
    if (phase !== 'question') return;

    const currentWrongSelections = wrongAnswerSelections[currentQuestionIndex] ?? [];
    if (currentWrongSelections.includes(answerIndex)) return;

    const isCorrect = answerIndex === currentQuestion.correctIndex;

    if (!isCorrect) {
      setWrongAnswerSelections((prev) => {
        const next = [...prev];
        const existing = next[currentQuestionIndex] ?? [];
        if (!existing.includes(answerIndex)) {
          next[currentQuestionIndex] = [...existing, answerIndex];
        }
        return next;
      });
      return;
    }

    setSelectedAnswerIndex(answerIndex);
    setLastAnswerCorrect(true);
    setQuestionResults((prev) => {
      const next = [...prev];
      next[currentQuestionIndex] = true;
      setCorrectAnswers(next.filter((value) => value === true).length);
      return next;
    });
    setPhase('feedback');
  };

  const handleContinueFromReveal = () => {
    const isLastQuestion = currentQuestionIndex >= totalQuestions - 1;

    if (isLastQuestion) {
      setPhase('yourTurn');
      return;
    }

    setCurrentQuestionIndex((prev) => prev + 1);
    setSelectedAnswerIndex(null);
    setLastAnswerCorrect(null);
    setPhase('question');
  };

  const handleMediumLessonAnswerSelection = (answer: SoundType) => {
    if (showIntro || !showMediumLesson || mediumLessonFinished || mediumLessonSelectedAnswer !== null) {
      return;
    }

    const currentWrongSelections = mediumLessonWrongSelections[mediumLessonQuestionIndex] ?? [];
    if (currentWrongSelections.includes(answer)) {
      return;
    }

    const isCorrect = answer === currentMediumLessonQuestion.correct;

    if (!isCorrect) {
      setMediumLessonWrongSelections((prev) => {
        const next = [...prev];
        const existing = next[mediumLessonQuestionIndex] ?? [];
        if (!existing.includes(answer)) {
          next[mediumLessonQuestionIndex] = [...existing, answer];
        }
        return next;
      });
      return;
    }

    setMediumLessonSelectedAnswer(answer);
    setMediumLessonLastCorrect(isCorrect);
    setMediumLessonResults((prev) => {
      const next = [...prev];
      next[mediumLessonQuestionIndex] = isCorrect;
      return next;
    });
  };

  const handleContinueMediumLesson = () => {
    const isLastLessonQuestion = mediumLessonQuestionIndex >= mediumLessonCopy.questions.length - 1;

    if (isLastLessonQuestion) {
      setMediumLessonFinished(true);
      return;
    }

    setMediumLessonQuestionIndex((prev) => prev + 1);
    setMediumLessonSelectedAnswer(null);
    setMediumLessonLastCorrect(null);
  };

  const resetMediumLesson = () => {
    setShowMediumLesson(true);
    setMediumLessonQuestionIndex(0);
    setMediumLessonSelectedAnswer(null);
    setMediumLessonLastCorrect(null);
    setMediumLessonWrongSelections(mediumLessonCopy.questions.map(() => []));
    setMediumLessonResults(mediumLessonCopy.questions.map(() => null));
    setMediumLessonFinished(false);
  };

  const startCubeDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    dragStateRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      startRotX: revealRotation.x,
      startRotY: revealRotation.y,
      counted: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveCubeDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.active) return;
    const deltaX = event.clientX - dragStateRef.current.startX;
    const deltaY = event.clientY - dragStateRef.current.startY;

    const nextY = dragStateRef.current.startRotY + deltaX * 0.35;
    const nextXRaw = dragStateRef.current.startRotX + deltaY * 0.28;
    const nextX = Math.max(-40, Math.min(40, nextXRaw));

    if (!dragStateRef.current.counted && (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8)) {
      dragStateRef.current.counted = true;
      setDragsSinceReveal((prev) => {
        const next = prev + 1;
        if (next >= 3) {
          setShowDragInstruction(false);
        }
        return next;
      });
    }

    setRevealRotation({ x: nextX, y: nextY });
  };

  const endCubeDrag = () => {
    dragStateRef.current.active = false;
  };

  const startARSession = async () => {
    if (!isAuthorized || !containerRef.current || !videoRef.current || isStarting || hasStarted) {
      return;
    }

    setIsStarting(true);
    setStartError(null);

    try {
      console.log('[PhonomuseumView] Initializing AR session...');
      const session = new PhonomuseumARSession(
        containerRef.current,
        videoRef.current,
        {
          onError: (e) => console.error('AR init failed', e)
        }
      );

      await session.init();
      console.log('[PhonomuseumView] AR session initialized');
      
      sessionRef.current = session;
      setHasStarted(true);
    } catch (err: any) {
      const message = err?.message || phonomuseumTexts.arStartErrorFallback;
      setStartError(message);
      console.error('[PhonomuseumView] AR init error:', err);
    } finally {
      setIsStarting(false);
    }
  };

  useEffect(() => {
    if (phase !== 'reveal') return;
    setRevealRotation({ x: -16, y: 24 });
    setDragsSinceReveal(0);
    setShowDragInstruction(true);
  }, [phase, currentQuestionIndex]);

  useEffect(() => {
    setShuffledQuestionOrder(shuffleArray(questions.map((_, i) => i)));
    setCurrentQuestionIndex(0);
    setSelectedAnswerIndex(null);
    setWrongAnswerSelections(questions.map(() => []));
    setQuestionResults(questions.map(() => null));
    setCorrectAnswers(0);
    setLastAnswerCorrect(null);
    resetMediumLesson();
    setPhase('question');
    setShowIntro(true);
    setHideQuizSummary(false);
    setYourTurnMelody([]);
    setHasPlayedYourTurnMelody(false);
  }, [language]);

  useEffect(() => {
    return () => {
      console.log('[PhonomuseumView] Cleaning up AR session');
      sessionRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (soundIndicatorTimeoutRef.current !== null) {
        window.clearTimeout(soundIndicatorTimeoutRef.current);
      }

      if (toneCleanupTimeoutRef.current !== null) {
        window.clearTimeout(toneCleanupTimeoutRef.current);
      }

      activeToneInstrumentRef.current?.dispose();
      activeToneInstrumentRef.current = null;
    };
  }, []);

  const soundIndicator = (buttonId: string) => {
    if (activeSoundButtonId !== buttonId) {
      return null;
    }

    return (
      <span
        style={{
          position: 'absolute',
          top: '6px',
          right: '8px',
          display: 'inline-flex',
          gap: '2px',
          alignItems: 'flex-end',
          pointerEvents: 'none',
        }}
      >
        {[0, 1, 2].map((index) => (
          <span
            key={`sound-bar-${buttonId}-${index}`}
            style={{
              width: '3px',
              height: '10px',
              borderRadius: '999px',
              background: 'currentColor',
              transformOrigin: 'center bottom',
              animation: `phonoSoundBars 0.6s ease-in-out ${index * 0.1}s infinite`,
            }}
          />
        ))}
      </span>
    );
  };

  // Wrap with Proximity Gate - checks if user is within 100m of station
  return (
    <ARProximityGate
      stationId={AR_VIEW_STATION_MAP['phonomuseum']}
      stationName={phonomuseumTexts.stationName}
      onNavigateBack={onNavigateHome}
      onAccessGranted={() => setIsAuthorized(true)}
    >
      <>
        <style>{`
          @keyframes phonoSoundBars {
            0%, 100% { transform: scaleY(0.45); opacity: 0.65; }
            50% { transform: scaleY(1); opacity: 1; }
          }
        `}</style>

        <ARComponentBase
          onNavigateHome={onNavigateHome}
          closeARViewKey="closePhonomuseumView"
          containerRef={containerRef as React.RefObject<HTMLDivElement>}
          videoRef={videoRef as React.RefObject<HTMLVideoElement>}
          username={username}
          onLogin={onLogin}
          onLogout={onLogout}
          onNavigateProfile={onNavigateProfile}
          onRegister={onRegister}
          completedStations={completedStations}
          totalStations={totalStations}
          totalPoints={totalPoints}
          currentStationId={3}
          currentStationTitle={phonomuseumTexts.stationName}
          currentStationPoints={currentStationPoints}
          onCompleteStation={onCompleteStation}
          isCurrentStationCompleted={isCurrentStationCompleted}
          ignoreCompleteTimer={true}
          onCompleteInitiated={() => setHideQuizSummary(true)}
          showCompleteButton={showStationCompleteButton}
          isGuestMode={isGuestMode}
        />

        {isAuthorized && !hasStarted && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 10005,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              pointerEvents: 'auto',
              background: 'linear-gradient(to bottom, rgba(16,24,32,0.75), rgba(16,24,32,0.45))',
            }}
          >
            <div
              style={{
                width: 'min(460px, 100%)',
                borderRadius: '16px',
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.2)',
                padding: '20px',
                textAlign: 'center',
              }}
            >
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '10px', color: 'var(--color-white)' }}>
                {phonomuseumTexts.arStartTitle}
              </h2>
              <p style={{ marginBottom: '14px', color: 'var(--color-white)', opacity: 0.95 }}>
                {phonomuseumTexts.arStartDescription}
              </p>
              {startError && (
                <p style={{ marginBottom: '12px', color: '#ffd3d3', fontWeight: 700 }}>
                  {startError}
                </p>
              )}
              <button
                onClick={() => {
                  void startARSession();
                }}
                disabled={isStarting}
                style={{
                  width: '100%',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  background: 'var(--color-primary)',
                  color: 'var(--color-white)',
                  fontWeight: 700,
                  cursor: isStarting ? 'default' : 'pointer',
                  opacity: isStarting ? 0.75 : 1,
                }}
              >
                {isStarting ? phonomuseumTexts.arStartingButton : phonomuseumTexts.arStartButton}
              </button>
            </div>
          </div>
        )}

        {hasStarted && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10003,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: `${QUIZ_UI_SAFE_VERTICAL_GAP}px`,
            paddingBottom: `${QUIZ_UI_SAFE_VERTICAL_GAP + (showStationCompleteButton ? COMPLETE_BUTTON_SAFE_GAP : 0)}px`,
            paddingLeft: '20px',
            paddingRight: '20px',
          }}
        >
          {!hideQuizSummary && showIntro && (
            <div
              style={{
                pointerEvents: 'auto',
                width: 'min(520px, 100%)',
                maxHeight: quizPanelMaxHeight,
                overflowY: 'auto',
                padding: QUIZ_PANEL_INNER_PADDING,
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.35)',
                background: QUIZ_PANEL_GLASS_BACKGROUND,
                backdropFilter: 'blur(6px) grayscale(16%)',
                WebkitBackdropFilter: 'blur(6px) grayscale(16%)',
                color: 'var(--color-gray-900)',
                textAlign: 'center',
              }}
            >
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '10px', color: 'var(--color-white)', textShadow: '0 2px 8px rgba(0,0,0,0.75)' }}>{phonomuseumTexts.quizIntroTitle}</h2>
              <p style={{ fontSize: '0.95rem', lineHeight: 1.5, color: 'var(--color-white)', textShadow: '0 2px 8px rgba(0,0,0,0.75)' }}>{phonomuseumTexts.quizIntroDescription}</p>
              <button
                onClick={() => setShowIntro(false)}
                style={{
                  marginTop: '16px',
                  width: '100%',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  background: 'var(--color-primary)',
                  color: 'var(--color-white)',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {phonomuseumTexts.quizIntroStart}
              </button>
            </div>
          )}

          {!hideQuizSummary && !showIntro && showMediumLesson && (
            <div
              style={{
                pointerEvents: 'auto',
                width: 'min(560px, 100%)',
                maxHeight: quizPanelMaxHeight,
                overflowY: 'auto',
                overflowX: 'hidden',
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
                padding: QUIZ_PANEL_INNER_PADDING,
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.35)',
                background: QUIZ_PANEL_GLASS_BACKGROUND,
                backdropFilter: 'blur(6px) grayscale(16%)',
                WebkitBackdropFilter: 'blur(6px) grayscale(16%)',
                color: 'var(--color-gray-900)',
              }}
            >
              {!mediumLessonFinished && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', fontSize: '0.86rem', opacity: 0.95, color: 'var(--color-white)', textShadow: '0 2px 6px rgba(0,0,0,0.75)' }}>
                    <span>{`${mediumLessonQuestionIndex + 1}/${mediumLessonCopy.questions.length}`}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {mediumLessonResults.map((result, index) => {
                        if (result === true) {
                          return (
                            <span
                              key={`lesson-icon-${index}`}
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                background: 'var(--color-primary)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                              }}
                            >
                              <Check size={14} color="var(--color-white)" strokeWidth={3} />
                            </span>
                          );
                        }

                        if (result === false) {
                          return (
                            <span
                              key={`lesson-icon-${index}`}
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                background: 'var(--color-danger)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                              }}
                            >
                              <X size={14} color="var(--color-white)" strokeWidth={3} />
                            </span>
                          );
                        }

                        return (
                          <span
                            key={`lesson-icon-${index}`}
                            style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              background: 'var(--color-gray-400)',
                              display: 'inline-block',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <h3 style={{ fontWeight: 800, marginBottom: '6px', color: 'var(--color-white)', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                    {mediumLessonCopy.title}
                  </h3>
                  <p style={{ marginBottom: '12px', fontSize: '0.9rem', color: 'var(--color-white)', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                    {mediumLessonCopy.subtitle}
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px', marginBottom: '12px' }}>
                    {(Object.keys(mediumLessonCopy.mediumNames) as SoundType[]).map((soundType) => (
                      <button
                        key={`lesson-play-${soundType}`}
                        onClick={() => playQuestionSound(soundType, `lesson-play-${soundType}`)}
                        style={{
                          position: 'relative',
                          border: '1px solid var(--color-green-300)',
                          borderRadius: '10px',
                          background: 'var(--color-primary-light)',
                          color: 'var(--color-primary)',
                          padding: '8px 10px',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <Play size={14} />
                          {`${mediumLessonCopy.playLabel}: ${mediumLessonCopy.mediumNames[soundType]}`}
                        </span>
                        {soundIndicator(`lesson-play-${soundType}`)}
                      </button>
                    ))}
                  </div>

                  <p style={{ marginBottom: '8px', fontWeight: 700, color: 'var(--color-white)', textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}>
                    {currentMediumLessonQuestion.prompt}
                  </p>
                  <p style={{ marginBottom: '10px', fontSize: '0.86rem', color: 'var(--color-white)', textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}>
                    {mediumLessonCopy.answerLabel}
                  </p>

                  <div style={{ display: 'grid', gap: '8px' }}>
                    {(Object.keys(mediumLessonCopy.mediumNames) as SoundType[]).map((soundType) => {
                      const isWrongSelection = (mediumLessonWrongSelections[mediumLessonQuestionIndex] ?? []).includes(soundType);
                      const isSelected = mediumLessonSelectedAnswer === soundType;
                      const hasAnswered = mediumLessonSelectedAnswer !== null;
                      const isCorrectChoice = soundType === currentMediumLessonQuestion.correct;

                      return (
                        <button
                          key={`lesson-answer-${soundType}`}
                          onClick={() => handleMediumLessonAnswerSelection(soundType)}
                          disabled={isWrongSelection || hasAnswered}
                          style={{
                            border: isWrongSelection
                              ? '1px solid var(--color-danger)'
                              : isSelected
                                ? '1px solid var(--color-primary)'
                                : '1px solid var(--color-gray-200)',
                            borderRadius: '12px',
                            background: isWrongSelection
                              ? '#ffe8e8'
                              : isSelected
                                ? 'var(--color-primary-light)'
                                : 'var(--color-white)',
                            color: isWrongSelection ? 'var(--color-danger)' : 'var(--color-gray-900)',
                            padding: '10px 12px',
                            textAlign: 'left',
                            fontWeight: 700,
                            cursor: isWrongSelection || hasAnswered ? 'default' : 'pointer',
                          }}
                        >
                          {mediumLessonCopy.mediumNames[soundType]}
                        </button>
                      );
                    })}
                  </div>

                  {mediumLessonSelectedAnswer !== null && (
                    <>
                      <p style={{ marginTop: '12px', marginBottom: '8px', color: mediumLessonLastCorrect ? 'var(--color-green-200)' : '#ffd3d3', textShadow: '0 2px 8px rgba(0,0,0,0.85)', fontWeight: 700 }}>
                        {mediumLessonLastCorrect ? phonomuseumTexts.feedbackCorrectTitle : phonomuseumTexts.feedbackWrongTitle}
                      </p>
                      <p style={{ marginBottom: '12px', color: 'var(--color-white)', textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}>
                        {currentMediumLessonQuestion.explanation}
                      </p>
                      <button
                        onClick={handleContinueMediumLesson}
                        style={{
                          width: '100%',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '10px 12px',
                          background: 'var(--color-primary)',
                          color: 'var(--color-white)',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {mediumLessonCopy.continueLabel}
                      </button>
                    </>
                  )}
                </>
              )}

              {mediumLessonFinished && (
                <>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '10px', color: 'var(--color-white)', textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}>
                    {mediumLessonCopy.resultTitle}
                  </h3>
                  <p style={{ marginBottom: '12px', color: 'var(--color-white)', textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}>
                    {mediumLessonScoreText}
                  </p>

                  <div style={{ display: 'grid', gap: '8px' }}>
                    <button
                      onClick={resetMediumLesson}
                      style={{
                        width: '100%',
                        border: '1px solid var(--color-white)',
                        borderRadius: '12px',
                        padding: '10px 12px',
                        background: 'rgba(255,255,255,0.1)',
                        color: 'var(--color-white)',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {mediumLessonCopy.retryLabel}
                    </button>

                    <button
                      onClick={() => setShowMediumLesson(false)}
                      style={{
                        width: '100%',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '10px 12px',
                        background: 'var(--color-primary)',
                        color: 'var(--color-white)',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {mediumLessonCopy.startMainQuizLabel}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {!hideQuizSummary && !showIntro && !showMediumLesson && phase !== 'summary' && (
            <div
              style={{
                pointerEvents: 'auto',
                width: 'min(560px, 100%)',
                maxHeight: quizPanelMaxHeight,
                overflowY: 'auto',
                overflowX: 'hidden',
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
                padding: QUIZ_PANEL_INNER_PADDING,
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.35)',
                background: QUIZ_PANEL_GLASS_BACKGROUND,
                backdropFilter: 'blur(6px) grayscale(16%)',
                WebkitBackdropFilter: 'blur(6px) grayscale(16%)',
                color: 'var(--color-gray-900)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', fontSize: '0.86rem', opacity: 0.95, color: 'var(--color-white)', textShadow: '0 2px 6px rgba(0,0,0,0.75)' }}>
                <span>{`${currentQuestionIndex + 1}/${totalQuestions}`}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {questionResults.map((result, index) => {
                    if (result === true) {
                      return (
                        <span
                          key={`q-icon-${index}`}
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            background: 'var(--color-primary)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                          }}
                        >
                          <Check size={14} color="var(--color-white)" strokeWidth={3} />
                        </span>
                      );
                    }

                    if (result === false) {
                      return (
                        <span
                          key={`q-icon-${index}`}
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            background: 'var(--color-danger)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                          }}
                        >
                          <X size={14} color="var(--color-white)" strokeWidth={3} />
                        </span>
                      );
                    }

                    return (
                      <span
                        key={`q-icon-${index}`}
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: 'var(--color-gray-400)',
                          display: 'inline-block',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {phase === 'question' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                    <div
                      style={{
                        width: '148px',
                        height: '148px',
                        borderRadius: '22px',
                        background: 'linear-gradient(145deg, var(--color-green-300), var(--color-primary))',
                        boxShadow: 'inset -8px -8px 16px rgba(0,0,0,0.28), inset 8px 8px 16px rgba(255,255,255,0.18), 0 12px 28px rgba(0,0,0,0.38)',
                        transform: 'perspective(420px) rotateX(16deg) rotateY(-18deg)',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: '5rem', fontWeight: 900, lineHeight: 1, color: 'var(--color-white)', textShadow: '0 5px 10px rgba(0,0,0,0.4)' }}>?</span>
                    </div>
                  </div>

                  <div
                    style={{
                      marginBottom: '14px',
                      borderRadius: '12px',
                      padding: '14px 14px 12px',
                      background: 'rgba(10, 14, 22, 0.52)',
                      border: '1px solid rgba(255,255,255,0.32)',
                    }}
                  >
                    <h3 style={{ fontWeight: 800, marginBottom: '8px', color: 'var(--color-white)', textShadow: '0 2px 8px rgba(0,0,0,0.8)', fontSize: '1.02rem' }}>
                      {currentQuestion.prompt || phonomuseumTexts.quizSoundPrompt}
                    </h3>
                    <p style={{ marginBottom: 0, fontSize: '0.9rem', color: 'var(--color-white)', textShadow: '0 2px 8px rgba(0,0,0,0.8)', opacity: 0.92 }}>
                      {phonomuseumTexts.quizSoundPrompt}
                    </p>
                  </div>

                  <button
                    onClick={() => playQuestionSound(currentQuestion.soundType, `main-question-${currentQuestionIndex}`)}
                    style={{
                      position: 'relative',
                      width: '100%',
                      marginBottom: '12px',
                      border: '1px solid var(--color-green-300)',
                      borderRadius: '12px',
                      background: 'var(--color-primary-light)',
                      color: 'var(--color-primary)',
                      padding: '10px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <Volume2 size={16} />
                      {phonomuseumTexts.playSound}
                    </span>
                    {soundIndicator(`main-question-${currentQuestionIndex}`)}
                  </button>

                  <div style={{ display: 'grid', gap: '8px' }}>
                    {currentQuestion.options.map((option, index) => (
                      (() => {
                        const isWrongSelection = (wrongAnswerSelections[currentQuestionIndex] ?? []).includes(index);
                        const isSelectedCorrect = selectedAnswerIndex === index;

                        return (
                          <button
                            key={`${option}-${index}`}
                            onClick={() => handleAnswerSelection(index)}
                            disabled={isWrongSelection}
                            style={{
                              border: isWrongSelection
                                ? '1px solid var(--color-danger)'
                                : isSelectedCorrect
                                  ? '1px solid var(--color-primary)'
                                  : '1px solid var(--color-gray-200)',
                              borderRadius: '12px',
                              background: isWrongSelection
                                ? '#ffe8e8'
                                : isSelectedCorrect
                                  ? 'var(--color-primary-light)'
                                  : 'var(--color-white)',
                              color: isWrongSelection
                                ? 'var(--color-danger)'
                                : 'var(--color-gray-900)',
                              padding: '10px 12px',
                              textAlign: 'left',
                              fontWeight: 600,
                              cursor: isWrongSelection ? 'not-allowed' : 'pointer',
                              opacity: isWrongSelection ? 0.9 : 1,
                            }}
                          >
                            {option}
                          </button>
                        );
                      })()
                    ))}
                  </div>
                </>
              )}

              {phase === 'feedback' && (
                <>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '8px', color: lastAnswerCorrect ? 'var(--color-green-200)' : '#ffd3d3', textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}>
                    {lastAnswerCorrect ? phonomuseumTexts.feedbackCorrectTitle : phonomuseumTexts.feedbackWrongTitle}
                  </h3>
                  <p style={{ marginBottom: '8px', color: 'var(--color-white)', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                    {lastAnswerCorrect ? phonomuseumTexts.feedbackCorrectBody : phonomuseumTexts.feedbackWrongBody}
                  </p>
                  {lastAnswerCorrect && (
                    <p
                      style={{
                        marginBottom: '12px',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: 'rgba(12, 16, 24, 0.5)',
                        color: 'var(--color-white)',
                        fontSize: '0.92rem',
                        lineHeight: 1.45,
                        textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                      }}
                    >
                      {currentQuestion.soundExplanation}
                    </p>
                  )}
                  {!lastAnswerCorrect && (
                    <p style={{ marginBottom: '12px', color: 'var(--color-white)', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                      {`${phonomuseumTexts.selectAnswer}: ${currentQuestion.options[currentQuestion.correctIndex]}`}
                    </p>
                  )}
                  <button
                    onClick={() => setPhase('reveal')}
                    style={{
                      width: '100%',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '10px 12px',
                      background: 'var(--color-primary)',
                      color: 'var(--color-white)',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {phonomuseumTexts.revealInstrument}
                  </button>
                </>
              )}

              {phase === 'reveal' && (
                <>
                  <h3 style={{ fontSize: '1.08rem', fontWeight: 700, marginBottom: '12px', color: 'var(--color-white)', textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}>{currentQuestion.instrumentName}</h3>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px', position: 'relative' }}>
                    <div
                      onPointerDown={startCubeDrag}
                      onPointerMove={moveCubeDrag}
                      onPointerUp={endCubeDrag}
                      onPointerCancel={endCubeDrag}
                      style={{
                        width: '192px',
                        height: '192px',
                        borderRadius: '24px',
                        background: 'linear-gradient(145deg, var(--color-green-200), var(--color-primary-lighter))',
                        boxShadow: 'inset -8px -8px 14px rgba(0,0,0,0.26), inset 8px 8px 14px rgba(255,255,255,0.2), 0 14px 24px rgba(0,0,0,0.33)',
                        transform: `perspective(760px) rotateX(${revealRotation.x}deg) rotateY(${revealRotation.y}deg)`,
                        cursor: 'grab',
                        touchAction: 'none',
                      }}
                    />

                    {showDragInstruction && dragsSinceReveal < 3 && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          pointerEvents: 'none',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                      >
                        <img
                          src="/dragAnimation.gif"
                          alt={phonomuseumTexts.dragInstruction}
                          style={{ width: '255px', height: '255px', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.35))' }}
                        />
                        <p style={{ margin: '-28px 0 0 0', fontSize: '14px', fontWeight: 500, color: 'var(--color-white)', textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}>
                          {phonomuseumTexts.dragInstruction}
                        </p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleContinueFromReveal}
                    style={{
                      width: '100%',
                      marginTop: '48px',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '10px 12px',
                      background: 'var(--color-primary)',
                      color: 'var(--color-white)',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {phonomuseumTexts.continueButton}
                  </button>
                </>
              )}

              {phase === 'yourTurn' && (
                <>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '8px', color: 'var(--color-white)', textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}>
                    {phonomuseumTexts.yourTurn.title}
                  </h3>
                  <p style={{ marginBottom: '10px', color: 'var(--color-white)', textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}>
                    {phonomuseumTexts.yourTurn.subtitle}
                  </p>

                  <p style={{ marginBottom: '6px', fontWeight: 700, color: 'var(--color-white)', textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}>
                    {phonomuseumTexts.yourTurn.melodyLabel}
                  </p>
                  <div
                    style={{
                      marginBottom: '8px',
                      minHeight: '54px',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.4)',
                      background: 'rgba(12, 16, 24, 0.5)',
                      padding: '10px 12px',
                      color: 'var(--color-white)',
                      textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {yourTurnMelody.length > 0 ? yourTurnMelodyDisplay : phonomuseumTexts.yourTurn.melodyHint}
                  </div>
                  <p style={{ marginBottom: '10px', fontSize: '0.86rem', color: yourTurnMelodyValid ? 'var(--color-green-200)' : '#ffd3d3', textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}>
                    {yourTurnNotesCountText}
                  </p>

                  <p style={{ marginBottom: '8px', fontWeight: 800, color: 'var(--color-white)', textShadow: '0 2px 8px rgba(0,0,0,0.85)', fontSize: '0.96rem', letterSpacing: '0.2px' }}>
                    {phonomuseumTexts.yourTurn.composeLabel}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '8px', marginBottom: '10px' }}>
                    {YOUR_TURN_NOTE_OPTIONS.map((noteOption) => (
                      <button
                        key={`your-turn-note-${noteOption.label}`}
                        onClick={() => addNoteToYourTurnMelody(noteOption.midi)}
                        disabled={yourTurnMelody.length >= YOUR_TURN_MAX_NOTES}
                        style={{
                          position: 'relative',
                          border: '1px solid var(--color-gray-200)',
                          borderRadius: '10px',
                          background: 'var(--color-white)',
                          color: 'var(--color-gray-900)',
                          padding: '8px 10px',
                          fontWeight: 700,
                          cursor: yourTurnMelody.length >= YOUR_TURN_MAX_NOTES ? 'default' : 'pointer',
                          opacity: yourTurnMelody.length >= YOUR_TURN_MAX_NOTES ? 0.65 : 1,
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <Music2 size={14} />
                          {noteOption.label}
                        </span>
                        {soundIndicator(`note-${noteOption.midi}`)}
                      </button>
                    ))}
                  </div>

                  <div style={{ marginBottom: '6px', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.3px', color: 'rgba(255,255,255,0.88)', textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}>
                    {melodyEditLabel}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', marginBottom: '12px' }}>
                    <button
                      onClick={removeLastYourTurnNote}
                      disabled={yourTurnMelody.length === 0}
                      style={{
                        border: '1px solid var(--color-white)',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,0.1)',
                        color: 'var(--color-white)',
                        padding: '9px 10px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: yourTurnMelody.length === 0 ? 'default' : 'pointer',
                        opacity: yourTurnMelody.length === 0 ? 0.6 : 1,
                      }}
                    >
                      <Undo2 size={15} />
                      {phonomuseumTexts.yourTurn.removeLastLabel}
                    </button>
                    <button
                      onClick={clearYourTurnMelody}
                      disabled={yourTurnMelody.length === 0}
                      style={{
                        border: '1px solid var(--color-white)',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,0.1)',
                        color: 'var(--color-white)',
                        padding: '9px 10px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: yourTurnMelody.length === 0 ? 'default' : 'pointer',
                        opacity: yourTurnMelody.length === 0 ? 0.6 : 1,
                      }}
                    >
                      <Trash2 size={15} />
                      {phonomuseumTexts.yourTurn.clearLabel}
                    </button>
                  </div>

                  <p style={{ marginBottom: '8px', fontWeight: 700, color: 'var(--color-white)', textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}>
                    {phonomuseumTexts.yourTurn.playByMediumLabel}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px', marginBottom: '10px' }}>
                    {(Object.keys(mediumLessonCopy.mediumNames) as SoundType[]).map((soundType) => (
                      <button
                        key={`your-turn-play-${soundType}`}
                        onClick={() => playYourTurnMelody(soundType, `your-turn-play-${soundType}`)}
                        disabled={!yourTurnMelodyValid}
                        style={{
                          position: 'relative',
                          border: '1px solid var(--color-green-300)',
                          borderRadius: '10px',
                          background: 'var(--color-primary-light)',
                          color: 'var(--color-primary)',
                          padding: '8px 10px',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          cursor: !yourTurnMelodyValid ? 'default' : 'pointer',
                          opacity: !yourTurnMelodyValid ? 0.6 : 1,
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <Play size={14} />
                          {mediumLessonCopy.mediumNames[soundType]}
                        </span>
                        {soundIndicator(`your-turn-play-${soundType}`)}
                      </button>
                    ))}
                  </div>

                  {hasPlayedYourTurnMelody && (
                    <p style={{ marginBottom: '10px', color: 'var(--color-green-200)', textShadow: '0 2px 8px rgba(0,0,0,0.85)', fontWeight: 700 }}>
                      {phonomuseumTexts.yourTurn.playedBadge}
                    </p>
                  )}

                  {!hasPlayedYourTurnMelody && yourTurnMelodyValid && (
                    <p style={{ marginBottom: '10px', color: 'rgba(255,255,255,0.92)', textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}>
                      {phonomuseumTexts.yourTurn.requiredPlayHint}
                    </p>
                  )}

                </>
              )}
            </div>
          )}

          {!hideQuizSummary && !showIntro && phase === 'summary' && (
            <div
              style={{
                pointerEvents: 'auto',
                width: 'min(560px, 100%)',
                maxHeight: quizPanelMaxHeight,
                overflowY: 'auto',
                overflowX: 'hidden',
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
                padding: QUIZ_PANEL_INNER_PADDING,
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.35)',
                background: QUIZ_PANEL_GLASS_BACKGROUND,
                backdropFilter: 'blur(6px) grayscale(16%)',
                WebkitBackdropFilter: 'blur(6px) grayscale(16%)',
                color: 'var(--color-gray-900)',
                textAlign: 'center',
              }}
            >
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '10px', color: 'var(--color-white)', textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}>{phonomuseumTexts.finishTitle}</h3>
              <p style={{ marginBottom: '8px', color: hasPassedQuiz ? 'var(--color-green-200)' : '#ffd3d3', textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}>
                {hasPassedQuiz ? phonomuseumTexts.finishSuccess : phonomuseumTexts.finishFailure}
              </p>
              <p style={{ marginBottom: '14px', color: 'var(--color-white)', textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}>{scoreText}</p>

              {!hasPassedQuiz && (
                <button
                  onClick={() => {
                    setCurrentQuestionIndex(0);
                    setSelectedAnswerIndex(null);
                    setWrongAnswerSelections(questions.map(() => []));
                    setQuestionResults(questions.map(() => null));
                    setCorrectAnswers(0);
                    setLastAnswerCorrect(null);
                    setYourTurnMelody([]);
                    setHasPlayedYourTurnMelody(false);
                    setPhase('question');
                  }}
                  style={{
                    width: '100%',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    background: 'var(--color-primary)',
                    color: 'var(--color-white)',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {phonomuseumTexts.quizIntroStart}
                </button>
              )}

            </div>
          )}
        </div>
        )}
      </>
    </ARProximityGate>
  );
};