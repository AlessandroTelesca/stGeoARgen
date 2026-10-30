import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Download, RefreshCw, RotateCcw, Share2 } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { PHOTO_ASPECT, PhotoFrameOverlay, composePhoto, photoDate, photoFileName } from '../../photoFrame';
import { pickLang } from '../../types';
import { Feedback, GlassCard, ModuleHeading, ModuleScreen, ModuleText, PrimaryButton, SecondaryButton, type ModulePlayerProps } from '../ui';
import { FOCUS_RING, aspectBoxStyle } from './shared';

type Step = 'intro' | 'starting' | 'live' | 'result' | 'unavailable';
type Facing = 'environment' | 'user';

interface Result {
  blob: Blob;
  url: string;
  file: File;
  canShare: boolean;
}

/** Fotomoment: Kamera starten, Foto mit Rahmen aufnehmen, teilen oder speichern – das Foto bleibt auf dem Gerät */
export function PhotoPlayer({ module, lang, continueLabel, onContinue, stationTitle }: ModulePlayerProps<'photo'>) {
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>('intro');
  const [facing, setFacing] = useState<Facing>(module.camera);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mounted = useRef(true);
  const resultUrl = useRef<string | null>(null);

  const title = pickLang(lang, module.title_de, module.title_en);
  const prompt = pickLang(lang, module.prompt_de, module.prompt_en);
  // Der Stationsname ist im Player nicht bekannt: ohne eigene Beschriftung steht die Modul-Überschrift im Rahmen
  const caption = pickLang(lang, module.caption_de, module.caption_en) ?? stationTitle ?? title ?? t('modulePhoto');
  const date = photoDate(lang);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stopStream();
      if (resultUrl.current) URL.revokeObjectURL(resultUrl.current);
    };
  }, [stopStream]);

  // Stream an das Video-Element hängen, sobald es sichtbar ist
  useEffect(() => {
    if (step === 'live' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => undefined);
    }
  }, [step, facing]);

  const startCamera = async (nextFacing: Facing) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStep('unavailable');
      return;
    }
    setStep((current) => (current === 'live' ? current : 'starting'));
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: nextFacing }, width: { ideal: 1920 }, height: { ideal: 1920 } },
        audio: false,
      });
      if (!mounted.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      setFacing(nextFacing);
      setStep('live');
    } catch {
      if (mounted.current) setStep('unavailable');
    }
  };

  const switchCamera = () => void startCamera(facing === 'user' ? 'environment' : 'user');

  const capture = async () => {
    const video = videoRef.current;
    if (!video || busy) return;
    setBusy(true);
    try {
      const blob = await composePhoto({ video, mirror: facing === 'user', frame: module.frame, caption, date });
      if (!mounted.current) return;
      if (!blob) {
        setStep('unavailable');
        return;
      }
      const file = new File([blob], photoFileName(), { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob);
      if (resultUrl.current) URL.revokeObjectURL(resultUrl.current);
      resultUrl.current = url;
      setResult({ blob, url, file, canShare: !!navigator.canShare?.({ files: [file] }) });
      stopStream();
      setStep('result');
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const share = async () => {
    if (!result) return;
    try {
      await navigator.share({ files: [result.file], title: caption });
    } catch {
      // Abbruch durch die Nutzer:innen ist kein Fehler
    }
  };

  const retake = () => {
    setResult(null);
    void startCamera(facing);
  };

  const privacy = <p className="text-center text-[14px] leading-relaxed text-white/75">{t('modulePhotoPrivacy')}</p>;
  const frameBox = 'relative mx-auto overflow-hidden rounded-[20px] bg-white/5 @container';

  if (step === 'result' && result) {
    return (
      <ModuleScreen
        footer={
          <>
            <SecondaryButton onClick={retake} className={FOCUS_RING}>
              <RotateCcw className="h-5 w-5" aria-hidden="true" />
              {t('modulePhotoRetake')}
            </SecondaryButton>
            <PrimaryButton onClick={onContinue}>{continueLabel}</PrimaryButton>
          </>
        }
      >
        <p className="sr-only" role="status">{t('modulePhotoTaken')}</p>
        <div className="mx-auto overflow-hidden rounded-[20px] bg-white/5" style={aspectBoxStyle(PHOTO_ASPECT, 52)}>
          <img src={result.url} alt={t('modulePhotoResultAlt')} className="h-full w-full object-cover" />
        </div>
        <div className="mt-4 flex gap-2.5">
          {result.canShare && (
            <SecondaryButton onClick={() => void share()} className={`flex-1 ${FOCUS_RING}`}>
              <Share2 className="h-5 w-5" aria-hidden="true" />
              {t('modulePhotoShare')}
            </SecondaryButton>
          )}
          <a
            href={result.url}
            download={result.file.name}
            className={`flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/12 px-4 font-semibold text-white transition-colors hover:bg-white/20 ${FOCUS_RING}`}
          >
            <Download className="h-5 w-5" aria-hidden="true" />
            {t('modulePhotoSave')}
          </a>
        </div>
        <div className="mt-4">{privacy}</div>
      </ModuleScreen>
    );
  }

  if (step === 'live') {
    return (
      <ModuleScreen footer={<SecondaryButton onClick={onContinue} className={`flex-1 ${FOCUS_RING}`}>{t('modulePhotoSkip')}</SecondaryButton>}>
        {prompt && <p className="mb-3 text-[15px] font-semibold leading-snug text-white/90">{prompt}</p>}
        <div className={frameBox} style={aspectBoxStyle(PHOTO_ASPECT, 52)}>
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`absolute inset-0 h-full w-full object-cover ${facing === 'user' ? '-scale-x-100' : ''}`}
          />
          <PhotoFrameOverlay frame={module.frame} caption={caption} date={date} />
        </div>
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center">
          <span />
          <button
            type="button"
            onClick={() => void capture()}
            disabled={busy}
            aria-label={t('modulePhotoShutter')}
            className={`flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white bg-white/25 pressable disabled:opacity-40 ${FOCUS_RING}`}
          >
            <span className="h-14 w-14 rounded-full bg-white" />
          </button>
          <button
            type="button"
            onClick={switchCamera}
            aria-label={t('modulePhotoSwitch')}
            className={`ml-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/12 border border-white/20 text-white transition-colors hover:bg-white/20 ${FOCUS_RING}`}
          >
            <RefreshCw className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </ModuleScreen>
    );
  }

  if (step === 'unavailable') {
    return (
      <ModuleScreen
        footer={
          <>
            <SecondaryButton onClick={() => void startCamera(facing)} className={FOCUS_RING}>
              <RefreshCw className="h-5 w-5" aria-hidden="true" />
              {t('modulePhotoTryAgain')}
            </SecondaryButton>
            <PrimaryButton onClick={onContinue}>{continueLabel}</PrimaryButton>
          </>
        }
      >
        <ModuleHeading title={title} />
        <Feedback tone="info" title={t('modulePlayerCameraUnavailable')}>
          {t('modulePhotoUnavailableText')}
        </Feedback>
      </ModuleScreen>
    );
  }

  const starting = step === 'starting';
  return (
    <ModuleScreen
      footer={
        <>
          <SecondaryButton onClick={onContinue} disabled={starting} className={FOCUS_RING}>
            {t('modulePhotoSkip')}
          </SecondaryButton>
          <PrimaryButton onClick={() => void startCamera(module.camera)} disabled={starting} className={FOCUS_RING}>
            <Camera className="h-5 w-5" aria-hidden="true" />
            {starting ? t('modulePlayerCameraStarting') : t('modulePlayerCameraStart')}
          </PrimaryButton>
        </>
      }
    >
      <ModuleHeading title={title} />
      <GlassCard className="mb-4">
        <ModuleText>{prompt}</ModuleText>
      </GlassCard>
      <div className={`${frameBox} max-w-[260px]`} style={{ aspectRatio: String(PHOTO_ASPECT) }}>
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-white/15 to-white/5">
          <Camera className="h-10 w-10 text-white/40" aria-hidden="true" />
        </div>
        <PhotoFrameOverlay frame={module.frame} caption={caption} date={date} />
      </div>
      <div className="mt-4">{privacy}</div>
    </ModuleScreen>
  );
}
