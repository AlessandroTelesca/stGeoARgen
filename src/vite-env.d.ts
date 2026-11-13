/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_EMAILJS_SERVICE_ID?: string;
  readonly VITE_EMAILJS_TEMPLATE_ID_PASSWORD_RESET?: string;
  readonly VITE_EMAILJS_PUBLIC_KEY?: string;
  readonly VITE_SUPPORT_EMAIL?: string;
  /** 'true' schaltet das Geofencing für Tests ab (lokal bzw. develop-Deploy) */
  readonly VITE_DISABLE_GEO?: string;
  /** 'false' blendet das Adminpanel und dessen Pfade/Stationen aus (Release-Build) */
  readonly VITE_ENABLE_ADMIN_PANEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
