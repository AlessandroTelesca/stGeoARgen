import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CircleHelp, Clock, Compass, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getUnsavedGuard } from '../../lib/unsavedChanges';
import { asset } from '../../lib/asset';
import type { CustomPath, CustomStation } from '../../services/api';
import { ease } from './adminUi';
import { buildTourPlan, isSameRoute, routeForStep, type TourPlan, type TourRoute } from './adminTourSteps';

/**
 * Geführte Einführung in die Stationsverwaltung: Willkommensdialog beim ersten Besuch, danach
 * Schritt für Schritt über Übersicht, Pfadseite und Editor. Die Tour zeigt nur – sie öffnet keine
 * Dialoge, speichert nichts und lässt die hervorgehobenen Elemente nicht anklicken.
 */

const TOUR_SEEN_KEY = 'st-geoargen-admin-tour-seen';

function readTourSeen(): boolean {
  try {
    return localStorage.getItem(TOUR_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function markTourSeen(): void {
  try {
    localStorage.setItem(TOUR_SEEN_KEY, '1');
  } catch {
    // Privater Modus o. ä.: dann erscheint der Willkommensdialog eben noch einmal
  }
}

// ─── Geometrie ─────────────────────────────────────────────────────────────

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Unter dieser Breite erscheint die Erklärkarte als Bottom-Sheet */
const MOBILE_MAX = 640;
/** Platz unter dem fest stehenden App-Header (64 px) */
const HEADER_SPACE = 76;
/** Abstand Karte ↔ Aussparung und Karte ↔ Bildschirmrand */
const GAP = 14;
const EDGE = 16;
const DIM = 'color-mix(in srgb, var(--color-gray-900) 55%, transparent)';

const holePadding = (mobile: boolean) => (mobile ? 6 : 8);

function padBox(box: Box, pad: number): Box {
  return { top: box.top - pad, left: box.left - pad, width: box.width + pad * 2, height: box.height + pad * 2 };
}

function toBox(rect: DOMRect): Box {
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
}

const sameBox = (a: Box, b: Box) =>
  Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5 && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5;

/** Erstes sichtbares Element zum Selektor (Seitenleiste auf dem Handy, Vorschau unter 1024 px … sind ausgeblendet) */
function findVisible(selector: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(selector)) {
    if (el.getClientRects().length === 0) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) continue;
    if (getComputedStyle(el).visibility === 'hidden') continue;
    return el;
  }
  return null;
}

/** Klebt das Element (oder ein Vorfahr) am Bildschirm? Dann hilft Scrollen nicht. */
function isPinned(el: HTMLElement): boolean {
  for (let node: HTMLElement | null = el; node && node !== document.body; node = node.parentElement) {
    const position = getComputedStyle(node).position;
    if (position === 'fixed' || position === 'sticky') return true;
  }
  return false;
}

/** Die Aktionsleiste des Editors klebt unten und würde Ziele darunter verdecken */
function bottomObstruction(el: HTMLElement): number {
  const bar = document.querySelector<HTMLElement>('[data-tour="editor-actions"]');
  if (!bar || bar.contains(el)) return 0;
  const rect = bar.getBoundingClientRect();
  return rect.height > 0 ? Math.max(0, window.innerHeight - rect.top) : 0;
}

/** Position der Erklärkarte (Desktop/Tablet): dort, wo neben der Aussparung Platz ist, nie außerhalb des Bildschirms */
function placeCard(hole: Box | null, width: number, height: number, vw: number, vh: number): { top: number; left: number; fits: boolean } {
  const clampX = (x: number) => Math.max(EDGE, Math.min(x, vw - width - EDGE));
  const clampY = (y: number) => Math.max(EDGE, Math.min(y, vh - height - EDGE));
  if (!hole) return { top: clampY((vh - height) / 2), left: clampX((vw - width) / 2), fits: true };
  const bottom = hole.top + hole.height;
  const right = hole.left + hole.width;
  const centerX = clampX(hole.left + hole.width / 2 - width / 2);
  const centerY = clampY(hole.top + hole.height / 2 - height / 2);
  const options: Record<'below' | 'above' | 'right' | 'left', { top: number; left: number } | null> = {
    below: bottom + GAP + height <= vh - EDGE ? { top: bottom + GAP, left: centerX } : null,
    above: hole.top - GAP - height >= EDGE ? { top: hole.top - GAP - height, left: centerX } : null,
    right: right + GAP + width <= vw - EDGE ? { top: centerY, left: right + GAP } : null,
    left: hole.left - GAP - width >= EDGE ? { top: centerY, left: hole.left - GAP - width } : null,
  };
  // Hohe Ziele (Seitenleiste, Vorschau) lieber seitlich, flache lieber darunter
  const order = hole.height > vh * 0.45 ? (['right', 'left', 'below', 'above'] as const) : (['below', 'above', 'right', 'left'] as const);
  for (const side of order) {
    const option = options[side];
    if (option) return { ...option, fits: true };
  }
  // Nirgends ganz frei: die Stelle nehmen, an der die Karte am wenigsten vom Ziel verdeckt
  const fallbacks = [
    { top: clampY(bottom + GAP), left: centerX },
    { top: clampY(hole.top - GAP - height), left: centerX },
    { top: centerY, left: clampX(right + GAP) },
    { top: centerY, left: clampX(hole.left - GAP - width) },
  ];
  const overlap = (p: { top: number; left: number }) =>
    Math.max(0, Math.min(p.left + width, right) - Math.max(p.left, hole.left)) * Math.max(0, Math.min(p.top + height, bottom) - Math.max(p.top, hole.top));
  const best = fallbacks.reduce((a, b) => (overlap(b) < overlap(a) ? b : a));
  return { ...best, fits: false };
}

/**
 * Ziel sanft in den sichtbaren Bereich holen – so, dass daneben bzw. darunter Platz für die Karte bleibt.
 * Gibt zurück, ob gescrollt wurde.
 */
function scrollTargetIntoView(el: HTMLElement, card: { width: number; height: number }, reduceMotion: boolean): boolean {
  if (isPinned(el)) return false;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const mobile = vw < MOBILE_MAX;
  const pad = holePadding(mobile);
  const rect = el.getBoundingClientRect();
  const bandTop = HEADER_SPACE + pad;
  const bandBottom = vh - bottomObstruction(el) - pad - (mobile ? card.height + 12 : EDGE);
  const band = bandBottom - bandTop;

  const inBand = rect.top >= bandTop && rect.bottom <= bandBottom;
  if (inBand && (mobile || placeCard(padBox(toBox(rect), pad), card.width, card.height, vw, vh).fits)) return false;

  // Desktop: Platz für die Karte darunter lassen (sie darf über der Aktionsleiste liegen, das Ziel nicht)
  const maxTopWithCard = Math.min(bandBottom - rect.height, vh - EDGE - card.height - GAP - pad - rect.height);
  let desiredTop: number;
  if (mobile) desiredTop = rect.height <= band ? bandTop + (band - rect.height) / 2 : bandTop;
  else if (maxTopWithCard >= bandTop) desiredTop = bandTop + (maxTopWithCard - bandTop) / 2;
  else if (rect.height <= band) desiredTop = bandTop + (band - rect.height) / 2;
  else desiredTop = bandTop;

  const delta = rect.top - desiredTop;
  if (Math.abs(delta) < 2) return false;
  window.scrollTo({ top: window.scrollY + delta, behavior: reduceMotion ? 'instant' : 'smooth' });
  return true;
}

/**
 * Wartet, bis das Ziel still steht (Scrollen, Einblend-Animationen der Seite) – höchstens ~1,2 s.
 * Nach einem Scrollbefehl erst kurz warten: sanftes Scrollen beginnt ein, zwei Frames später.
 */
function waitUntilSettled(el: HTMLElement, scrolled: boolean, isCancelled: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    const started = performance.now();
    const minWait = scrolled ? 160 : 0;
    let last = toBox(el.getBoundingClientRect());
    let stableFrames = 0;
    const check = () => {
      if (isCancelled()) return resolve();
      const now = performance.now();
      const rect = toBox(el.getBoundingClientRect());
      stableFrames = sameBox(rect, last) ? stableFrames + 1 : 0;
      last = rect;
      if ((stableFrames >= 4 && now - started >= minWait) || now - started > 1200) return resolve();
      requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  });
}

/** Annäherung an --ease-out-expo für die gleitende Aussparung */
const easeOutExpo = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const MORPH_MS = 300;

function lerpBox(from: Box, to: Box, p: number): Box {
  const mix = (a: number, b: number) => a + (b - a) * p;
  return { top: mix(from.top, to.top), left: mix(from.left, to.left), width: mix(from.width, to.width), height: mix(from.height, to.height) };
}

// ─── Hook ──────────────────────────────────────────────────────────────────

interface UseAdminTourOptions {
  /** Angemeldet und Inhalte geladen */
  ready: boolean;
  paths: CustomPath[];
  stationsByPath: Map<string, CustomStation[]>;
  /** Aktuelle Seite der Verwaltung */
  route: { kind: string; pathId?: string; stationId?: number };
  /** Navigation ohne Rückfrage (die Tour startet nur ohne ungespeicherte Änderungen) */
  onNavigate: (route: TourRoute) => void;
}

interface TourState {
  plan: TourPlan;
  index: number;
  /** Laufrichtung – fehlt ein Ziel, geht es in dieser Richtung weiter */
  direction: 1 | -1;
}

/** Steuerung der Einführung: `start` für den Hilfe-Knopf, `element` gehört einmal in die Seite */
export function useAdminTour({ ready, paths, stationsByPath, route, onNavigate }: UseAdminTourOptions) {
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [unsavedOpen, setUnsavedOpen] = useState(false);
  const [tour, setTour] = useState<TourState | null>(null);
  const tourRef = useRef(tour);
  tourRef.current = tour;

  // Erster Besuch nach dem Login: Willkommensdialog
  const welcomeChecked = useRef(false);
  useEffect(() => {
    if (!ready || welcomeChecked.current) return;
    welcomeChecked.current = true;
    if (!readTourSeen()) setWelcomeOpen(true);
  }, [ready]);

  const start = useCallback(() => {
    setWelcomeOpen(false);
    if (getUnsavedGuard()) {
      setUnsavedOpen(true);
      return;
    }
    setTour({ plan: buildTourPlan(paths, stationsByPath), index: 0, direction: 1 });
  }, [paths, stationsByPath]);

  const end = useCallback(() => {
    markTourSeen();
    setTour(null);
    // Zum Schluss dorthin, wo die Tour wieder startet
    window.setTimeout(() => document.querySelector<HTMLElement>('[data-tour="help"]')?.focus({ preventScroll: true }), 0);
  }, []);

  const later = useCallback(() => {
    markTourSeen();
    setWelcomeOpen(false);
  }, []);

  const next = useCallback(() => {
    const current = tourRef.current;
    if (!current) return;
    if (current.index >= current.plan.steps.length - 1) end();
    else setTour({ ...current, index: current.index + 1, direction: 1 });
  }, [end]);

  const back = useCallback(() => {
    const current = tourRef.current;
    if (!current || current.index === 0) return;
    setTour({ ...current, index: current.index - 1, direction: -1 });
  }, []);

  /** Ziel fehlt (oder ist auf dieser Breite unsichtbar): Schritt aus dem Plan nehmen und weitergehen */
  const skip = useCallback(() => {
    const current = tourRef.current;
    if (!current) return;
    const steps = current.plan.steps.filter((_, i) => i !== current.index);
    const forward = current.direction === 1 || current.index === 0;
    const index = forward ? current.index : current.index - 1;
    if (steps.length === 0 || index >= steps.length) {
      end();
      return;
    }
    setTour({ plan: { ...current.plan, steps }, index, direction: forward ? 1 : -1 });
  }, [end]);

  const element = (
    <>
      <WelcomeDialog open={welcomeOpen} onStart={start} onLater={later} />
      <UnsavedDialog open={unsavedOpen} onClose={() => setUnsavedOpen(false)} />
      {createPortal(
        <AnimatePresence>
          {tour && (
            <TourOverlay
              key="admin-tour"
              tour={tour}
              route={route}
              onNavigate={onNavigate}
              onNext={next}
              onBack={back}
              onSkip={skip}
              onClose={end}
            />
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );

  return { start, element };
}

// ─── Hilfe-Knopf ───────────────────────────────────────────────────────────

/** Startet die Einführung jederzeit neu (Kopfzeile der Verwaltung) */
export function AdminTourButton({ onClick }: { onClick: () => void }) {
  const { t } = useLanguage();
  return (
    <button
      type="button"
      onClick={onClick}
      data-tour="help"
      aria-label={t('adminTourStart')}
      className="flex-shrink-0 inline-flex items-center justify-center gap-1.5 h-10 min-w-10 px-2.5 sm:px-3 rounded-full text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      <CircleHelp className="w-4 h-4" />
      <span className="hidden sm:inline">{t('adminTourButton')}</span>
    </button>
  );
}

// ─── Overlay mit Aussparung und Erklärkarte ────────────────────────────────

interface TourOverlayProps {
  tour: TourState;
  route: UseAdminTourOptions['route'];
  onNavigate: (route: TourRoute) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onClose: () => void;
}

function TourOverlay({ tour, route, onNavigate, onNext, onBack, onSkip, onClose }: TourOverlayProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const { plan, index } = tour;
  const step = plan.steps[index];

  /** Element, um das die Aussparung liegt (beim Wechsel noch das alte, bis das neue gefunden ist) */
  const [tracked, setTracked] = useState<HTMLElement | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  /** Schritt, dessen Karte gerade steht (null: Tour sucht/scrollt noch) */
  const [shownStepId, setShownStepId] = useState<string | null>(null);
  const [usedAlt, setUsedAlt] = useState(false);
  /** Aussparung gleitet vom alten zum neuen Ziel (nur nach einem Schrittwechsel; beim Scrollen folgt sie direkt) */
  const [morph, setMorph] = useState<{ from: Box; at: number } | null>(null);
  const [, setFrame] = useState(0);
  const [cardSize, setCardSize] = useState({ width: 384, height: 260 });

  const cardRef = useRef<HTMLDivElement>(null);
  const routeRef = useRef(route);
  routeRef.current = route;
  const cardSizeRef = useRef(cardSize);
  cardSizeRef.current = cardSize;
  /** Zuletzt gezeichnete Aussparung – Startpunkt für das nächste Gleiten */
  const drawnRef = useRef<Box | null>(null);
  const callbacks = useRef({ onNavigate, onSkip });
  callbacks.current = { onNavigate, onSkip };

  const shown = shownStepId === step.id;

  // Schritt auflösen: Seite ansteuern, Ziel suchen (max. ~1,5 s nach einem Seitenwechsel), hinscrollen, zeigen
  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    const glideFromHere = () => {
      if (!reduceMotion && drawnRef.current) setMorph({ from: drawnRef.current, at: performance.now() });
    };
    setShownStepId(null);
    const required = routeForStep(step, plan);
    const needsNavigation = required !== null && !isSameRoute(required, routeRef.current);
    if (needsNavigation && required) {
      glideFromHere();
      setTracked(null);
      callbacks.current.onNavigate(required);
    }
    const started = performance.now();
    const timeout = needsNavigation ? 1500 : 400;

    const show = async (el: HTMLElement | null, alt: boolean) => {
      if (el) {
        const scrolled = scrollTargetIntoView(el, cardSizeRef.current, reduceMotion);
        await waitUntilSettled(el, scrolled, () => cancelled);
        if (cancelled) return;
      }
      glideFromHere();
      setTracked(el);
      setUsedAlt(alt);
      setShownStepId(step.id);
    };

    const poll = () => {
      if (cancelled) return;
      const timedOut = performance.now() - started > timeout;
      // Seitenwechsel noch nicht angekommen
      if (required && !isSameRoute(required, routeRef.current)) {
        if (timedOut) callbacks.current.onSkip();
        else frame = requestAnimationFrame(poll);
        return;
      }
      if (!step.target) {
        void show(null, false);
        return;
      }
      const el = findVisible(step.target);
      if (el) {
        void show(el, false);
        return;
      }
      const altEl = step.alt ? findVisible(step.alt.target) : null;
      if (altEl) {
        void show(altEl, true);
        return;
      }
      if (timedOut) callbacks.current.onSkip();
      else frame = requestAnimationFrame(poll);
    };
    frame = requestAnimationFrame(poll);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
    // Bewusst nur beim Schrittwechsel; Route und Rückrufe kommen über Refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, step.id]);

  // Gleiten: bis zum Ende jeden Frame neu zeichnen
  useEffect(() => {
    if (!morph) return;
    let frame = 0;
    const loop = () => {
      if (performance.now() - morph.at >= MORPH_MS) {
        setMorph(null);
        return;
      }
      setFrame((n) => n + 1);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [morph]);

  // Aussparung folgt dem Ziel bei Scroll, Größenänderung und Umbrüchen
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      setViewport((prev) => (prev.width === window.innerWidth && prev.height === window.innerHeight ? prev : { width: window.innerWidth, height: window.innerHeight }));
      if (!tracked || !tracked.isConnected) {
        setBox(null);
        return;
      }
      const next = toBox(tracked.getBoundingClientRect());
      setBox((prev) => (prev && sameBox(prev, next) ? prev : next));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', schedule, { capture: true, passive: true });
    window.addEventListener('resize', schedule);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    if (tracked) observer?.observe(tracked);
    observer?.observe(document.body);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule, { capture: true });
      window.removeEventListener('resize', schedule);
      observer?.disconnect();
    };
  }, [tracked]);

  // Kartengröße für die Platzierung (vor dem Zeichnen messen, damit nichts springt)
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    setCardSize((prev) => (Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1 ? prev : { width, height }));
  });

  // Tastatur: → / Enter weiter, ← zurück, Esc beendet; Tab bleibt in der Karte
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      const card = cardRef.current;
      if (e.key === 'Tab') {
        e.preventDefault();
        if (!card) return;
        const focusable = [...card.querySelectorAll<HTMLElement>('button:not([disabled])')];
        if (focusable.length === 0) return;
        const position = focusable.indexOf(document.activeElement as HTMLElement);
        const nextIndex = position === -1 ? (e.shiftKey ? focusable.length - 1 : 0) : (position + (e.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
        focusable[nextIndex].focus();
        return;
      }
      if (!shown) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        onNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onBack();
      } else if (e.key === 'Enter') {
        // Enter auf einem Knopf der Karte löst dessen eigenen Klick aus
        const target = e.target as HTMLElement | null;
        if (target && card?.contains(target) && target.closest('button')) return;
        e.preventDefault();
        onNext();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [shown, onNext, onBack, onClose]);

  const mobile = viewport.width < MOBILE_MAX;
  const hole = tracked && box ? padBox(box, holePadding(mobile)) : null;
  // Ohne Ziel schrumpft die Aussparung auf einen Punkt in der Mitte: alles abgedunkelt
  const center: Box = { top: viewport.height / 2, left: viewport.width / 2, width: 0, height: 0 };
  const target = hole ?? center;
  const drawn = morph ? lerpBox(morph.from, target, easeOutExpo((performance.now() - morph.at) / MORPH_MS)) : target;
  drawnRef.current = drawn;
  const ring = drawn.width > 1 && drawn.height > 1;

  // Handy: Bottom-Sheet – liegt das Ziel unten (Aktionsleiste), rückt die Karte nach oben
  const dockTop = mobile && hole !== null
    && hole.top + hole.height > viewport.height - cardSize.height - 8
    && hole.top > cardSize.height + 20;
  const placement = mobile ? null : placeCard(hole, cardSize.width, cardSize.height, viewport.width, viewport.height);

  return (
    <motion.div
      className="fixed inset-0 z-[75]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.24, ease }}
    >
      {/* Abdunklung mit Aussparung; fängt alle Klicks ab (Tippen daneben beendet die Tour nicht) */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          data-tour-spotlight=""
          className="absolute pointer-events-none"
          style={{
            top: drawn.top,
            left: drawn.left,
            width: drawn.width,
            height: drawn.height,
            borderRadius: Math.min(24, drawn.height / 2),
            boxShadow: `0 0 0 ${ring ? 2 : 0}px var(--primary), 0 0 0 200vmax ${DIM}`,
          }}
        />
      </div>

      <AnimatePresence mode="wait">
        {shown && (
          <TourCard
            key={step.id}
            ref={cardRef}
            titleKey={usedAlt && step.alt ? step.alt.titleKey : step.titleKey}
            textKey={usedAlt && step.alt ? step.alt.textKey : step.textKey}
            index={index}
            total={plan.steps.length}
            layout={mobile ? (dockTop ? 'top' : 'sheet') : 'float'}
            position={placement}
            onNext={onNext}
            onBack={onBack}
            onClose={onClose}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface TourCardProps {
  titleKey: string;
  textKey: string;
  index: number;
  total: number;
  /** float: neben dem Ziel (ab 640 px); sheet: Bottom-Sheet; top: oben angedockt (Ziel liegt unten) */
  layout: 'float' | 'sheet' | 'top';
  position: { top: number; left: number } | null;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
}

/** Erklärkarte eines Schritts – eigene Komponente, damit der Fokus nach dem Einblenden auf „Weiter“ springt */
const TourCard = forwardRef<HTMLDivElement, TourCardProps>(function TourCard(
  { titleKey, textKey, index, total, layout, position, onNext, onBack, onClose },
  ref
) {
  const { t } = useLanguage();
  const nextRef = useRef<HTMLButtonElement>(null);
  const isLast = index === total - 1;

  useEffect(() => {
    nextRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-tour-title"
      aria-describedby="admin-tour-text"
      className={`fixed z-[1] bg-card border border-border shadow-2xl ${layout === 'float'
        ? 'w-[min(24rem,calc(100vw-2rem))] rounded-[20px] p-5'
        : layout === 'top'
          ? 'inset-x-3 rounded-[24px] p-5'
          : 'inset-x-0 bottom-0 rounded-t-[28px] px-5 pt-3 max-h-[75dvh] overflow-y-auto'}`}
      style={layout === 'float' && position
        ? { top: position.top, left: position.left }
        : layout === 'top'
          ? { top: 'max(12px, env(safe-area-inset-top, 0px))' }
          : { paddingBottom: 'max(20px, env(safe-area-inset-bottom, 0px))' }}
      initial={{ opacity: 0, y: layout === 'sheet' ? 24 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ duration: 0.28, ease }}
    >
      {layout === 'sheet' && <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border-strong" aria-hidden="true" />}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-muted-foreground tabular-nums whitespace-nowrap">
          {t('adminTourStepCount', { n: index + 1, total })}
        </span>
        <span className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden" aria-hidden="true">
          <span className="block h-full rounded-full bg-primary" style={{ width: `${((index + 1) / total) * 100}%` }} />
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('adminTourClose')}
          className="-my-2 -mr-2 w-11 h-11 flex-shrink-0 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <h2 id="admin-tour-title" className="mt-2 text-lg font-bold tracking-tight">{t(titleKey)}</h2>
      <p id="admin-tour-text" className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{t(textKey)}</p>
      <div className="mt-5 flex items-center gap-2.5">
        {index > 0 && (
          <button
            type="button"
            onClick={onBack}
            className="min-h-[52px] px-4 rounded-2xl font-semibold text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('adminTourBack')}
          </button>
        )}
        <button
          ref={nextRef}
          type="button"
          onClick={onNext}
          className="flex-1 min-h-[52px] px-5 rounded-2xl bg-primary hover:bg-primary-dark text-white font-bold flex items-center justify-center gap-2 shadow-primary transition-colors pressable"
        >
          {isLast ? t('adminTourDone') : t('adminTourNext')}
          {isLast ? <Check className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
        </button>
      </div>
    </motion.div>
  );
});

// ─── Dialoge (Optik wie ConfirmDialog) ─────────────────────────────────────

function DialogShell({ open, id, onDismiss, dismissLabel, children }: { open: boolean; id: string; onDismiss: () => void; dismissLabel: string; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[75] flex items-end sm:items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onKeyDown={(e) => e.key === 'Escape' && onDismiss()}
        >
          <button type="button" aria-label={dismissLabel} className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onDismiss} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${id}-title`}
            aria-describedby={`${id}-text`}
            className="relative w-full max-w-md rounded-[28px] bg-card p-6 shadow-2xl"
            style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.3, ease }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function WelcomeDialog({ open, onStart, onLater }: { open: boolean; onStart: () => void; onLater: () => void }) {
  const { t } = useLanguage();
  return (
    <DialogShell open={open} id="admin-tour-welcome" onDismiss={onLater} dismissLabel={t('adminTourWelcomeLater')}>
      <span className="brand-gradient w-14 h-14 rounded-full flex items-center justify-center shadow-primary mb-4">
        <img src={asset('/Logo.svg')} alt="" className="w-8 h-8 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
      </span>
      <h3 id="admin-tour-welcome-title" className="text-xl font-bold">{t('adminTourWelcomeTitle')}</h3>
      <p id="admin-tour-welcome-text" className="mt-2 text-sm text-muted-foreground leading-relaxed">{t('adminTourWelcomeText')}</p>
      <p className="mt-3 mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Clock className="w-3.5 h-3.5" />
        {t('adminTourWelcomeDuration')}
      </p>
      <div className="flex flex-col-reverse sm:flex-row gap-2.5">
        <button
          type="button"
          onClick={onLater}
          className="flex-1 min-h-[52px] rounded-2xl border border-border bg-card px-6 font-semibold text-foreground hover:bg-muted transition-colors"
        >
          {t('adminTourWelcomeLater')}
        </button>
        <button
          type="button"
          autoFocus
          onClick={onStart}
          className="flex-1 min-h-[52px] rounded-2xl bg-primary hover:bg-primary-dark px-6 font-bold text-white flex items-center justify-center gap-2 shadow-primary transition-colors pressable"
        >
          <Compass className="w-5 h-5" />
          {t('adminTourWelcomeStart')}
        </button>
      </div>
      <p className="mt-4 text-xs text-muted-foreground text-center">{t('adminTourWelcomeHint')}</p>
    </DialogShell>
  );
}

function UnsavedDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLanguage();
  return (
    <DialogShell open={open} id="admin-tour-unsaved" onDismiss={onClose} dismissLabel={t('adminTourUnsavedOk')}>
      <span className="w-12 h-12 rounded-2xl bg-gold-soft text-gold flex items-center justify-center mb-4">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <h3 id="admin-tour-unsaved-title" className="text-xl font-bold">{t('adminTourUnsavedTitle')}</h3>
      <p id="admin-tour-unsaved-text" className="mt-2 mb-6 text-sm text-muted-foreground leading-relaxed">{t('adminTourUnsavedText')}</p>
      <button
        type="button"
        autoFocus
        onClick={onClose}
        className="w-full min-h-[52px] rounded-2xl bg-primary hover:bg-primary-dark px-6 font-bold text-white shadow-primary transition-colors pressable"
      >
        {t('adminTourUnsavedOk')}
      </button>
    </DialogShell>
  );
}
