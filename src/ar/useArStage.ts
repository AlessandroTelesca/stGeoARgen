import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { ArStageError, ArStageSession, type ArStageSessionOptions } from './ArStageSession';
import { DragInput, OrientationInput } from './inputs';
import { requestMotionPermission } from './motionPermission';

/** So lange wartet der Lagesensor auf den ersten Messwert, bevor auf Ziehen umgestellt wird */
const ORIENTATION_DATA_TIMEOUT_MS = 1000;

export type UseArStageOptions = Omit<ArStageSessionOptions, 'input'> & {
  /** false → start() tut nichts, eine laufende Session wird abgebaut */
  enabled: boolean;
  mode: 'orientation' | 'drag';
  /** Nur mit mode 'drag': start() läuft direkt nach dem Mount (Lagesensor braucht eine Tipp-Geste) */
  autoStart?: boolean;
  /** true → keine Trägheit beim Ziehen */
  reducedMotion?: boolean;
};

export interface UseArStageResult {
  session: ArStageSession | null;
  status: 'idle' | 'starting' | 'running' | 'error';
  /** Fehlercode ('camera-denied' | 'camera-unavailable' | 'texture-failed') oder Meldung; kann auch bei 'running' gesetzt sein, wenn ein späterer Bildwechsel fehlschlug */
  error?: string;
  /**
   * Startet Session und Eingabe. Bei mode 'orientation' MUSS start() direkt im Tipp-Handler aufgerufen
   * werden: die Bewegungsfreigabe ist der erste await (iOS).
   */
  start: () => Promise<void>;
  /** true, wenn statt des Lagesensors das Ziehen benutzt wird (Freigabe verweigert, nicht unterstützt oder keine Messwerte) */
  fellBackToDrag: boolean;
}

/** React-Hook um ArStageSession: Session und Eingabe entstehen in start() und werden beim Unmount freigegeben */
export function useArStage(containerRef: RefObject<HTMLElement | null>, opts: UseArStageOptions): UseArStageResult {
  const [session, setSession] = useState<ArStageSession | null>(null);
  const [status, setStatus] = useState<UseArStageResult['status']>('idle');
  const [error, setError] = useState<string | undefined>(undefined);
  const [fellBackToDrag, setFellBackToDrag] = useState(false);

  const optsRef = useRef(opts);
  optsRef.current = opts;
  const sessionRef = useRef<ArStageSession | null>(null);
  const startingRef = useRef(false);
  const mountedRef = useRef(true);
  const timerRef = useRef<number | null>(null);
  const appliedRef = useRef({ background: opts.background, panoramaUrl: opts.panoramaUrl ?? null });

  const teardown = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    sessionRef.current?.dispose();
    sessionRef.current = null;
    setSession(null);
    setStatus('idle');
  }, []);

  const start = useCallback(async (): Promise<void> => {
    const current = optsRef.current;
    const container = containerRef.current;
    if (!current.enabled || !container || startingRef.current || sessionRef.current) return;
    startingRef.current = true;
    setStatus('starting');
    setError(undefined);

    let created: ArStageSession | null = null;
    try {
      let useOrientation = current.mode === 'orientation';
      if (useOrientation) {
        // Muss der erste await sein (iOS verlangt die Tipp-Geste)
        const permission = await requestMotionPermission();
        if (permission !== 'granted') {
          useOrientation = false;
          if (mountedRef.current) setFellBackToDrag(true);
        }
      }
      if (!mountedRef.current) return;

      const reducedMotion = current.reducedMotion ?? false;
      const orientationInput = useOrientation ? new OrientationInput() : null;
      created = new ArStageSession(container, {
        background: current.background,
        panoramaUrl: current.panoramaUrl,
        renderMode: current.renderMode,
        fov: current.fov,
        input: orientationInput ?? new DragInput({ reducedMotion }),
      });
      await created.start();
      if (!mountedRef.current) {
        created.dispose();
        created = null;
        return;
      }

      sessionRef.current = created;
      appliedRef.current = { background: current.background, panoramaUrl: current.panoramaUrl ?? null };
      setSession(created);
      setStatus('running');

      if (orientationInput) {
        const running = created;
        timerRef.current = window.setTimeout(() => {
          timerRef.current = null;
          if (sessionRef.current !== running || orientationInput.hasData()) return;
          running.setInput(new DragInput({ reducedMotion: optsRef.current.reducedMotion ?? false }));
          setFellBackToDrag(true);
        }, ORIENTATION_DATA_TIMEOUT_MS);
      }
    } catch (err) {
      created?.dispose();
      if (!mountedRef.current) return;
      setError(err instanceof ArStageError ? err.code : err instanceof Error ? err.message : String(err));
      setStatus('error');
    } finally {
      startingRef.current = false;
    }
  }, [containerRef]);

  // Aufräumen beim Unmount (mountedRef wird bei erneutem Mount, z. B. StrictMode, zurückgesetzt)
  useEffect(() => {
    mountedRef.current = true;
    // Nach einem simulierten Unmount (StrictMode) zeigt der State sonst auf eine freigegebene Session
    if (!sessionRef.current) setSession(null);
    return () => {
      mountedRef.current = false;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      sessionRef.current?.dispose();
      sessionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!opts.enabled && sessionRef.current) teardown();
  }, [opts.enabled, teardown]);

  useEffect(() => {
    if (opts.enabled && opts.autoStart && opts.mode === 'drag') void start();
  }, [opts.enabled, opts.autoStart, opts.mode, start]);

  // Anderes Bild bzw. anderer Hintergrund: in der laufenden Session austauschen statt neu aufbauen
  const url = opts.panoramaUrl ?? null;
  useEffect(() => {
    const running = sessionRef.current;
    if (!running) return;
    const applied = appliedRef.current;
    if (applied.background === opts.background && applied.panoramaUrl === url) return;
    const sameBackground = applied.background === opts.background;
    appliedRef.current = { background: opts.background, panoramaUrl: url };
    const change =
      sameBackground && opts.background === 'panorama' ? running.setPanorama(url) : running.setBackground(opts.background, url);
    change.catch((err: unknown) => {
      if (mountedRef.current) setError(err instanceof ArStageError ? err.code : err instanceof Error ? err.message : String(err));
    });
  }, [session, opts.background, url]);

  return { session, status, error, start, fellBackToDrag };
}
