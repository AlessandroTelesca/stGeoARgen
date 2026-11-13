import { describe, it, expect } from 'vitest';
import { normalizeStation } from '../../src/services/api';

const base = {
  id: 1,
  path_id: 'path-1',
  title_de: 'Station',
  title_en: null,
  description_de: '',
  description_en: null,
  long_description_de: '',
  long_description_en: null,
  cover_image: 'cover.jpg',
  points: 10,
  latitude: 48.1,
  longitude: 8.3,
};

const story = { id: 'm-1', type: 'story', title_de: null, title_en: null, style: 'text', text_de: 'Hallo', text_en: null, image: null, quote_source: null };

describe('normalizeStation', () => {
  it('filtert Module unbekannten Typs und zählt sie', () => {
    const s = normalizeStation({ ...base, modules: [story, { id: 'm-2', type: 'hologram' }, null, { type: 'story' }] } as never);
    expect(s.modules).toHaveLength(1);
    expect(s.modules[0].id).toBe('m-1');
    expect(s.dropped_modules).toBe(3);
  });

  it('setzt dropped_modules nicht, wenn nichts verworfen wurde', () => {
    const s = normalizeStation({ ...base, modules: [story] } as never);
    expect(s.dropped_modules).toBeUndefined();
  });

  it('übernimmt gültige Farben kleingeschrieben, sonst null', () => {
    expect(normalizeStation({ ...base, color: '#ABCDEF', modules: [] } as never).color).toBe('#abcdef');
    expect(normalizeStation({ ...base, color: 'red', modules: [] } as never).color).toBeNull();
    expect(normalizeStation({ ...base, modules: [] } as never).color).toBeNull();
  });

  it('leitet bei Altstationen ohne modules Module ab', () => {
    const s = normalizeStation({
      ...base,
      station_type: 'image_sequence',
      slides: [{ image: 'a.jpg', text_de: 'Text', text_en: null }],
      quiz: { question_de: 'Frage?', question_en: null, options_de: ['A', 'B'], options_en: null, correct_answer: 0 },
    } as never);
    expect(s.modules.map((m) => m.type)).toEqual(['slideshow', 'quiz']);
    expect(s.dropped_modules).toBeUndefined();
    const quiz = s.modules[1];
    if (quiz.type !== 'quiz') throw new Error('quiz erwartet');
    expect(quiz.questions[0].audio).toBeNull();
  });
});
