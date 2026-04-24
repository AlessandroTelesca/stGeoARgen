import React, { useEffect, useMemo, useRef } from 'react';
import { Check, X } from 'lucide-react';
import * as Tone from 'tone';
import { ARComponentBase } from '../ARComponentBase';
import { ARProximityGate } from '../ARProximityGate';
import { GyroARVisualizer } from '../../../ARbackend/GyroARVisualizer';
import { AR_VIEW_STATION_MAP } from '../../../data/stationsConfig';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getPhonomuseumTexts } from '../../../i18n/stations/phonomuseum';

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
}

class PhonomuseumARSession extends GyroARVisualizer {
  public museumInteriorUrl = new URL('./models/museum_interior.glb', import.meta.url).href;
  // You can override methods or add custom functionality here
  // For example:
  // private initThree(): void {
  //   super.initThree();
  //   // Add custom Phonomuseum-specific 3D objects
  // }
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

const REQUIRED_CORRECT_ANSWERS = 2;
const YOUR_TURN_MIN_NOTES = 6;
const YOUR_TURN_MAX_NOTES = 8;
const QUIZ_UI_SAFE_VERTICAL_GAP = 88;
const COMPLETE_BUTTON_SAFE_GAP = 110;
const QUIZ_PANEL_GLASS_BACKGROUND = 'rgba(228, 232, 236, 0.24)';
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

    </ARProximityGate>
  );
};