export interface ScrollLockController {
  lock(): void;
  unlock(): void;
}

export function createScrollLockController(documentRef: Document = document): ScrollLockController {
  let isLocked = false;
  let previousOverflow = '';

  const handleTouchMove = (event: TouchEvent): void => {
    event.preventDefault();
  };

  return {
    lock() {
      if (isLocked) return;

      previousOverflow = documentRef.body.style.overflow;
      documentRef.body.style.overflow = 'hidden';
      documentRef.addEventListener('touchmove', handleTouchMove, { passive: false });
      isLocked = true;
    },
    unlock() {
      if (!isLocked) return;

      documentRef.body.style.overflow = previousOverflow;
      documentRef.removeEventListener('touchmove', handleTouchMove);
      isLocked = false;
    },
  };
}
