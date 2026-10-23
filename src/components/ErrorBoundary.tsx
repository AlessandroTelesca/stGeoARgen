import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RotateCw, Home } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { asset } from '../lib/asset';

const RELOAD_FLAG = 'st-geoargen-chunk-reload';

/** Nach einem Deploy fehlen alte Chunks: Das erkennt man an diesen Fehlermeldungen. */
const isChunkLoadError = (error: Error) =>
  /dynamically imported module|Importing a module script failed|Loading chunk|error loading dynamically/i.test(error.message);

interface ErrorBoundaryState {
  error: Error | null;
}

/** Fängt Laufzeitfehler (z. B. WebGL/Kamera in AR-Stationen) ab, statt eine weiße Seite zu zeigen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  componentDidMount() {
    // Erfolgreich gestartet: Ein späterer veralteter Chunk darf wieder automatisch neu laden
    window.setTimeout(() => {
      try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* ignorieren */ }
    }, 10000);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);

    // Veralteter Chunk nach einem Deploy: einmal automatisch neu laden
    if (isChunkLoadError(error)) {
      try {
        if (!sessionStorage.getItem(RELOAD_FLAG)) {
          sessionStorage.setItem(RELOAD_FLAG, '1');
          window.location.reload();
        }
      } catch {
        // sessionStorage nicht verfügbar: Fehlerseite bleibt stehen
      }
    }
  }

  render() {
    if (this.state.error) return <ErrorFallback />;
    return this.props.children;
  }
}

function ErrorFallback() {
  const { t } = useLanguage();

  return (
    <div
      className="min-h-[100dvh] bg-background flex items-center justify-center px-5"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      role="alert"
    >
      <div className="w-full max-w-md surface-card p-6 text-center">
        <span className="mx-auto w-16 h-16 rounded-full bg-primary-soft flex items-center justify-center">
          <img src={asset('/Logo.svg')} alt="" className="w-10 h-10 object-contain" />
        </span>
        <h1 className="mt-4 text-xl font-bold">{t('errorBoundaryTitle')}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{t('errorBoundaryText')}</p>

        <div className="mt-6 space-y-2.5">
          <button
            onClick={() => window.location.reload()}
            className="w-full min-h-[54px] bg-primary hover:bg-primary-dark text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-primary transition-colors pressable"
          >
            <RotateCw className="w-5 h-5" />
            {t('errorBoundaryReload')}
          </button>
          <a
            href={import.meta.env.BASE_URL}
            className="w-full min-h-[48px] rounded-2xl font-semibold text-muted-foreground hover:text-foreground flex items-center justify-center gap-2 transition-colors"
          >
            <Home className="w-5 h-5" />
            {t('backToHome')}
          </a>
        </div>
      </div>
    </div>
  );
}
