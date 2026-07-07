import { describe, expect, it } from 'vitest';
import { clampMelodyLength, getLatestOtherUserMelody, getPlaybackDelayMs, parseMelody, serializeMelody } from '../../src/components/ARComponents/glockenspiel/melody';

describe('glockenspiel melody helpers', () => {
  it('serializes a melody to a compact string', () => {
    expect(serializeMelody([0, 3, 7, 12])).toBe('0,3,7,12');
  });

  it('parses a stored melody string back to note objects', () => {
    expect(parseMelody('2,5,9,14')).toEqual([
      { index: 2, gapMsToNext: 0 },
      { index: 5, gapMsToNext: 0 },
      { index: 9, gapMsToNext: 0 },
      { index: 14, gapMsToNext: 0 },
    ]);
  });

  it('ignores invalid values when parsing', () => {
    expect(parseMelody('2,,9,foo')).toEqual([
      { index: 2, gapMsToNext: 0 },
      { index: 9, gapMsToNext: 0 },
    ]);
  });

  it('keeps longer melodies instead of truncating them too aggressively', () => {
    const melody = Array.from({ length: 40 }, (_, index) => index);

    expect(clampMelodyLength(melody)).toHaveLength(40);
  });

  it('derives a flexible playback delay from the melody length', () => {
    expect(getPlaybackDelayMs(16)).toBe(938);
    expect(getPlaybackDelayMs(1)).toBe(0);
  });

  it('serializes and parses timed melody entries with their gaps', () => {
    expect(serializeMelody([{ index: 0, gapMsToNext: 250 }, { index: 3, gapMsToNext: 400 }])).toBe('0:250;3:400');
    expect(parseMelody('0:250;3:400')).toEqual([{ index: 0, gapMsToNext: 250 }, { index: 3, gapMsToNext: 400 }]);
  });

  it('returns the newest melody from another user when available', () => {
    const melodies = [
      { melody: '0,1', user_name: 'Alice' },
      { melody: '2,3', user_name: 'Bob' },
    ];

    expect(getLatestOtherUserMelody(melodies, 'Alice')).toEqual({ melody: '2,3', user_name: 'Bob' });
  });
});
