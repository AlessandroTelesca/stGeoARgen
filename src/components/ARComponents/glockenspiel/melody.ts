export interface StoredMelodyEntry {
  id?: number;
  melody: string;
  name?: string | null;
}

export interface MelodyNote {
  index: number;
  gapMsToNext: number;
}

export const serializeMelody = (melody: Array<number | MelodyNote>): string => {
  if (!melody.length) return '';

  const usesTimedEntries = melody.some((entry) => typeof entry !== 'number');
  if (!usesTimedEntries) {
    return melody.map((entry) => String(entry)).join(',');
  }

  return melody
    .map((entry) => (typeof entry === 'number' ? `${entry}:0` : `${entry.index}:${entry.gapMsToNext}`))
    .join(';');
};

export const parseMelody = (value: string | null | undefined): MelodyNote[] => {
  if (!value) return [];

  const trimmedValue = value.trim();
  if (!trimmedValue) return [];

  const hasTimedEntries = trimmedValue.includes(';') || trimmedValue.includes(':');
  if (hasTimedEntries) {
    return trimmedValue
      .split(';')
      .map((entry) => entry.trim())
      .filter((entry) => entry !== '')
      .map((entry) => {
        const [rawIndex, rawGap] = entry.split(':');
        const index = Number(rawIndex);
        const gapMsToNext = Number(rawGap);
        if (!Number.isInteger(index) || index < 0 || !Number.isFinite(gapMsToNext) || gapMsToNext < 0) {
          return null;
        }
        return { index, gapMsToNext } satisfies MelodyNote;
      })
      .filter((entry): entry is MelodyNote => entry !== null);
  }

  return trimmedValue
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '')
    .map((entry) => Number(entry))
    .filter((entry) => Number.isInteger(entry) && entry >= 0)
    .map((index) => ({ index, gapMsToNext: 0 }));
};

export const clampMelodyLength = (melody: MelodyNote[], maxLength = 96): MelodyNote[] => melody.slice(0, maxLength);

export const getPlaybackDelayMs = (noteCount: number, maxDurationMs = 15000): number => {
  if (noteCount <= 1) return 0;
  return Math.max(80, Math.round(maxDurationMs / noteCount));
};

export const getLatestOtherUserMelody = (
  melodies: Array<StoredMelodyEntry & { created_at?: string | null }>
): StoredMelodyEntry | null => {
  return melodies
    .slice()
    .sort((a, b) => {
      const dateA = a.created_at ? Date.parse(a.created_at) : 0;
      const dateB = b.created_at ? Date.parse(b.created_at) : 0;
      return dateB - dateA;
    })
    .find((entry) => !!entry.melody) ?? null;
};

export const getRecentOtherUserMelodies = (
  melodies: Array<StoredMelodyEntry & { created_at?: string | null }>,
  maxItems = 10
): Array<StoredMelodyEntry & { created_at?: string | null }> => {
  return melodies
    .slice()
    .sort((a, b) => {
      const dateA = a.created_at ? Date.parse(a.created_at) : 0;
      const dateB = b.created_at ? Date.parse(b.created_at) : 0;
      return dateB - dateA;
    })
    .filter((entry) => !!entry.melody)
    .slice(0, maxItems);
};
