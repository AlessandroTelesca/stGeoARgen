import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Camera, ChevronsLeftRight } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { pickLang } from '../../types';
import { Feedback, GlassCard, ModuleHeading, ModuleScreen, ModuleText, PrimaryButton, SecondaryButton, type ModulePlayerProps } from '../ui';
import { FOCUS_RING, RangeSlider, aspectBoxStyle, useNaturalAspect } from './shared';

const FALLBACK_ASPECT = 4 / 3;
const KEY_STEP = 5;

/** Beschriftung eines Bilds, liegt als Chip über dem Bildbereich */
function LabelChip({ children, side }: { children: string; side: 'left' | 'right' }) {
  return (
    <span
      className={`absolute top-3 ${side === 'left' ? 'left-3' : 'right-3'} z-10 max-w-[45%] truncate rounded-full bg-black/55 backdrop-blur-sm px-3 py-1.5 text-[13px] font-bold text-white pointer-events-none`}
    >
      {children}
    </span>
  );
}

const imageClass = 'absolute inset-0 w-full h-full object-cover select-none pointer-events-none';

/** Zwei Bilder mit ziehbarer Trennlinie */
function CompareSlider({ before, after, beforeLabel, afterLabel, aspect, ariaLabel }: { before: string; after: string; beforeLabel: string; afterLabel: string; aspect: number; ariaLabel: string }) {
  const [pos, setPos] = useState(50);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const update = (clientX: number) => {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    setPos(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    update(e.clientX);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) update(e.clientX);
  };
  const endDrag = () => {
    dragging.current = false;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -KEY_STEP : e.key === 'ArrowRight' || e.key === 'ArrowUp' ? KEY_STEP : 0;
    if (step !== 0) setPos((p) => Math.min(100, Math.max(0, p + step)));
    else if (e.key === 'Home') setPos(0);
    else if (e.key === 'End') setPos(100);
    else return;
    e.preventDefault();
  };

  return (
    <div
      ref={boxRef}
      className="relative mx-auto overflow-hidden rounded-[20px] bg-white/5 touch-pan-y select-none cursor-ew-resize"
      style={aspectBoxStyle(aspect)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <img src={after} alt="" draggable={false} className={imageClass} />
      <img src={before} alt="" draggable={false} className={imageClass} style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
      <LabelChip side="left">{beforeLabel}</LabelChip>
      <LabelChip side="right">{afterLabel}</LabelChip>
      <div
        role="slider"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        aria-valuetext={`${Math.round(pos)} %`}
        onKeyDown={onKeyDown}
        className="group absolute inset-y-0 z-20 w-12 -translate-x-1/2 flex items-center justify-center focus-visible:outline-none"
        style={{ left: `${pos}%` }}
      >
        <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white shadow-lg" aria-hidden="true" />
        <span className="relative w-12 h-12 rounded-full bg-white text-primary shadow-lg flex items-center justify-center group-focus-visible:ring-4 group-focus-visible:ring-white/40">
          <ChevronsLeftRight className="w-6 h-6" />
        </span>
      </div>
    </div>
  );
}

/** Zwei Bilder übereinander, das historische Bild wird per Regler eingeblendet */
function FadeCompare({ before, after, beforeLabel, afterLabel, aspect, ariaLabel }: { before: string; after: string; beforeLabel: string; afterLabel: string; aspect: number; ariaLabel: string }) {
  const [value, setValue] = useState(100);
  return (
    <>
      <div className="relative mx-auto overflow-hidden rounded-[20px] bg-white/5" style={aspectBoxStyle(aspect)}>
        <img src={after} alt="" draggable={false} className={imageClass} />
        <img src={before} alt="" draggable={false} className={imageClass} style={{ opacity: value / 100 }} />
      </div>
      <div className="mt-4">
        <RangeSlider value={value} min={0} max={100} step={1} onChange={setValue} ariaLabel={ariaLabel} ariaValueText={`${value} %`} />
        <div className="mt-1 flex justify-between gap-4 text-[14px] font-bold text-white">
          <span className="truncate">{afterLabel}</span>
          <span className="truncate text-right">{beforeLabel}</span>
        </div>
      </div>
    </>
  );
}

type CameraState = 'idle' | 'starting' | 'live' | 'unavailable';

/** Historisches Foto halbtransparent über der Live-Kamera; Kamera erst nach Tipp anfragen */
function CameraCompare({ before, afterLabel, beforeLabel, aspect }: { before: string; afterLabel: string; beforeLabel: string; aspect: number }) {
  const { t } = useLanguage();
  const [state, setState] = useState<CameraState>('idle');
  const [opacity, setOpacity] = useState(50);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mounted = useRef(true);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stopStream();
    };
  }, []);

  useEffect(() => {
    if (state === 'live' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => undefined);
    }
  }, [state]);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('unavailable');
      return;
    }
    setState('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      if (!mounted.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      setState('live');
    } catch {
      if (mounted.current) setState('unavailable');
    }
  };

  const live = state === 'live';

  return (
    <>
      <div className="relative mx-auto overflow-hidden rounded-[20px] bg-white/5" style={aspectBoxStyle(aspect)}>
        {live && <video ref={videoRef} playsInline muted autoPlay className="absolute inset-0 w-full h-full object-cover" />}
        <img src={before} alt="" draggable={false} className={imageClass} style={{ opacity: live ? opacity / 100 : 1 }} />
        <LabelChip side="right">{beforeLabel}</LabelChip>
      </div>

      <div className="mt-4 space-y-3">
        {state === 'unavailable' && (
          <Feedback tone="info" title={t('modulePlayerCameraUnavailable')}>
            {t('modulePlayerCameraUnavailableText')}
          </Feedback>
        )}
        {(state === 'idle' || state === 'starting') && (
          <>
            <GlassCard>
              <ModuleText className="text-[15px]">{t('modulePlayerCameraHint')}</ModuleText>
            </GlassCard>
            <SecondaryButton onClick={start} disabled={state === 'starting'} className={`w-full ${FOCUS_RING}`}>
              <Camera className="w-5 h-5" />
              <span>{state === 'starting' ? t('modulePlayerCameraStarting') : t('modulePlayerCameraStart')}</span>
            </SecondaryButton>
          </>
        )}
        {live && (
          <>
            <p className="text-[15px] leading-relaxed text-white/90">{t('modulePlayerCameraHint')}</p>
            <div>
              <RangeSlider
                value={opacity}
                min={0}
                max={100}
                step={1}
                onChange={setOpacity}
                ariaLabel={t('modulePlayerCameraOpacity')}
                ariaValueText={`${opacity} %`}
              />
              <div className="mt-1 flex justify-between gap-4 text-[14px] font-bold text-white">
                <span className="truncate">{afterLabel}</span>
                <span className="truncate text-right">{beforeLabel}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

/** Vorher/Nachher: Schieberegler, Überblenden oder altes Foto über der Live-Kamera */
export function BeforeAfterPlayer({ module, lang, continueLabel, onContinue }: ModulePlayerProps<'before_after'>) {
  const { t } = useLanguage();
  const title = pickLang(lang, module.title_de, module.title_en);
  const beforeLabel = pickLang(lang, module.before_label_de, module.before_label_en);
  const afterLabel = pickLang(lang, module.after_label_de, module.after_label_en);
  const text = pickLang(lang, module.text_de, module.text_en);
  const aspect = useNaturalAspect(module.before_image) ?? FALLBACK_ASPECT;
  const after = module.after_image;

  return (
    <ModuleScreen footer={<PrimaryButton onClick={onContinue}>{continueLabel}</PrimaryButton>}>
      <ModuleHeading title={title} />

      {module.mode === 'slider' && after && (
        <CompareSlider
          before={module.before_image}
          after={after}
          beforeLabel={beforeLabel}
          afterLabel={afterLabel}
          aspect={aspect}
          ariaLabel={t('modulePlayerSliderLabel', { before: beforeLabel })}
        />
      )}
      {module.mode === 'fade' && after && (
        <FadeCompare
          before={module.before_image}
          after={after}
          beforeLabel={beforeLabel}
          afterLabel={afterLabel}
          aspect={aspect}
          ariaLabel={t('modulePlayerFadeLabel', { before: beforeLabel, after: afterLabel })}
        />
      )}
      {module.mode === 'camera' && (
        <CameraCompare before={module.before_image} beforeLabel={beforeLabel} afterLabel={afterLabel} aspect={aspect} />
      )}
      {/* Fehlt bei slider/fade das zweite Bild (sollte die Validierung verhindern), zeigt die Ansicht nur das alte Foto */}
      {module.mode !== 'camera' && !after && (
        <div className="relative mx-auto overflow-hidden rounded-[20px] bg-white/5" style={aspectBoxStyle(aspect)}>
          <img src={module.before_image} alt="" className={imageClass} />
          <LabelChip side="right">{beforeLabel}</LabelChip>
        </div>
      )}

      {text && <ModuleText className="mt-5">{text}</ModuleText>}
    </ModuleScreen>
  );
}
