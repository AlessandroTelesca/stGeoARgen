import { RefObject, useCallback, useEffect, useMemo, useState } from 'react';

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenEnabled?: boolean;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

const getFullscreenElement = (doc: FullscreenDocument): Element | null => {
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
};

export const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest('input, textarea, select, [contenteditable="true"]')
  );
};

export const useSiteFullscreen = (rootRef: RefObject<HTMLElement>) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isSupported = useMemo(() => {
    if (typeof document === 'undefined') {
      return false;
    }

    const probe = document.documentElement as FullscreenElement;

    const hasApi =
      typeof probe.requestFullscreen === 'function' ||
      typeof probe.webkitRequestFullscreen === 'function';

    return hasApi;
  }, []);

  useEffect(() => {
    if (!isSupported || typeof document === 'undefined') {
      return;
    }

    const fullscreenDocument = document as FullscreenDocument;

    const syncFullscreenState = () => {
      setIsFullscreen(Boolean(getFullscreenElement(fullscreenDocument)));
    };

    syncFullscreenState();
    document.addEventListener('fullscreenchange', syncFullscreenState);
    document.addEventListener('webkitfullscreenchange', syncFullscreenState as EventListener);

    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreenState);
      document.removeEventListener('webkitfullscreenchange', syncFullscreenState as EventListener);
    };
  }, [isSupported]);

  const enterFullscreen = useCallback(async () => {
    if (!isSupported || typeof document === 'undefined') {
      return false;
    }

    const fullscreenDocument = document as FullscreenDocument;
    if (getFullscreenElement(fullscreenDocument)) {
      return true;
    }

    const target = (rootRef.current ?? document.documentElement) as FullscreenElement;

    try {
      if (typeof target.requestFullscreen === 'function') {
        await target.requestFullscreen();
        return true;
      }

      if (typeof target.webkitRequestFullscreen === 'function') {
        await target.webkitRequestFullscreen();
        return true;
      }
    } catch {
      return false;
    }

    return false;
  }, [isSupported, rootRef]);

  const exitFullscreen = useCallback(async () => {
    if (!isSupported || typeof document === 'undefined') {
      return;
    }

    const fullscreenDocument = document as FullscreenDocument;

    try {
      if (typeof document.exitFullscreen === 'function') {
        await document.exitFullscreen();
        return;
      }

      if (typeof fullscreenDocument.webkitExitFullscreen === 'function') {
        await fullscreenDocument.webkitExitFullscreen();
      }
    } catch {
      // Fullscreen exit may fail during browser-managed transitions.
    }
  }, [isSupported]);

  return {
    isSupported,
    isFullscreen,
    enterFullscreen,
    exitFullscreen,
  };
};
