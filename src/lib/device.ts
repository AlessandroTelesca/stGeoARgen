/** Geräteerkennung per User-Agent; SSR-sicher (ohne navigator immer false) */

export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // iPadOS meldet sich als Macintosh, hat aber Touch
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function isAndroidDevice(): boolean {
  return typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent);
}

export function isArCapableDevice(): boolean {
  return isIOSDevice() || isAndroidDevice();
}
