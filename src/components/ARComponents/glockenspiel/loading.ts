export const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, timeoutMessage = 'Timed out'): Promise<T> => {
  let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = globalThis.setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      globalThis.clearTimeout(timeoutId);
    }
  }
};
