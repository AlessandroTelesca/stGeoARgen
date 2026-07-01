import { describe, expect, it } from 'vitest';
import { createScrollLockController } from '../../src/components/ARComponents/glockenspiel/scrollLock';

describe('createScrollLockController', () => {
  it('restores the previous overflow value after unlocking', () => {
    const documentStub = {
      body: { style: { overflow: 'auto' } },
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    } as unknown as Document;

    const controller = createScrollLockController(documentStub);
    controller.lock();
    controller.unlock();

    expect(documentStub.body.style.overflow).toBe('auto');
  });
});
