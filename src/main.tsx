
  import { createRoot } from "react-dom/client";
  import { BrowserRouter } from "react-router-dom";
  import { MotionConfig } from "motion/react";
  import App from "./App.tsx";
  import "./index.css";
  import { LanguageProvider } from "./contexts/LanguageContext.tsx";
  import { PointConfigProvider } from "./contexts/PointConfigContext.tsx";

  createRoot(document.getElementById("root")!).render(
    <BrowserRouter basename={import.meta.env.BASE_URL}>
        <LanguageProvider>
          <PointConfigProvider>
            {/* Animationen von motion/react respektieren "Bewegung reduzieren" des Systems */}
            <MotionConfig reducedMotion="user">
              <App />
            </MotionConfig>
          </PointConfigProvider>
        </LanguageProvider>
    </BrowserRouter>
  );
  