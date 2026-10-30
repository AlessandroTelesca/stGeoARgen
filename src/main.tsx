
  import { createRoot } from "react-dom/client";
  import { BrowserRouter } from "react-router-dom";
  import { MotionConfig } from "motion/react";
  import { Toaster } from "sonner";
  import App from "./App.tsx";
  import "./index.css";
  import { LanguageProvider } from "./contexts/LanguageContext.tsx";
  import { PointConfigProvider } from "./contexts/PointConfigContext.tsx";
  import { ErrorBoundary } from "./components/ErrorBoundary.tsx";

  createRoot(document.getElementById("root")!).render(
    <BrowserRouter basename={import.meta.env.BASE_URL}>
        <LanguageProvider>
          <PointConfigProvider>
            {/* Animationen von motion/react respektieren "Bewegung reduzieren" des Systems */}
            <MotionConfig reducedMotion="user">
              <ErrorBoundary>
                <App />
              </ErrorBoundary>
              {/* Meldungen (toast.success/error/info aus App und Stationsverwaltung) – unter dem App-Header */}
              <Toaster
                position="top-center"
                offset={76}
                mobileOffset={{ top: 'calc(env(safe-area-inset-top, 0px) + 72px)', left: 12, right: 12 }}
                toastOptions={{
                  classNames: {
                    toast: '!rounded-2xl !border-border !bg-card !text-foreground !shadow-lg !font-sans !gap-3 !p-4',
                    title: '!font-bold !text-[15px]',
                    description: '!text-muted-foreground !text-sm',
                    success: '[&_[data-icon]]:!text-primary',
                    error: '[&_[data-icon]]:!text-destructive',
                    info: '[&_[data-icon]]:!text-primary',
                  },
                }}
              />
            </MotionConfig>
          </PointConfigProvider>
        </LanguageProvider>
    </BrowserRouter>
  );
  