/// <reference types="vitest" />
import { describe, test, expect } from 'vitest';
import { moduleMissingContent, moduleStructureKey } from '../../src/stationModules/player/previewSupport';
import type { StationModule } from '../../src/stationModules/types';

const question = { question_de: 'Wann?', question_en: null, options_de: ['A', 'B', 'C'], options_en: null, correct_answer: 1, explanation_de: null, explanation_en: null, image: null };

const quiz = (overrides: Record<string, unknown> = {}): StationModule<string> =>
  ({ id: 'q-1', type: 'quiz', title_de: 'Quiz', title_en: null, questions: [question], pass_threshold: 1, ...overrides }) as unknown as StationModule<string>;

describe('moduleStructureKey', () => {
  test('text-only changes keep the key', () => {
    const edited = quiz({ title_de: 'Anderer Titel', questions: [{ ...question, question_de: 'Wann genau?', options_de: ['X', 'Y', 'Z'] }] });
    expect(moduleStructureKey(edited)).toBe(moduleStructureKey(quiz()));
  });

  test('a new question changes the key', () => {
    expect(moduleStructureKey(quiz({ questions: [question, question] }))).not.toBe(moduleStructureKey(quiz()));
  });

  test('another correct answer or threshold changes the key', () => {
    expect(moduleStructureKey(quiz({ questions: [{ ...question, correct_answer: 2 }] }))).not.toBe(moduleStructureKey(quiz()));
    expect(moduleStructureKey(quiz({ pass_threshold: 2 }))).not.toBe(moduleStructureKey(quiz()));
  });

  test('structural strings such as the module type or id count', () => {
    expect(moduleStructureKey(quiz({ id: 'q-2' }))).not.toBe(moduleStructureKey(quiz()));
  });
});

describe('moduleMissingContent', () => {
  test('empty slideshow is missing content', () => {
    const slideshow = { id: 's-1', type: 'slideshow', title_de: null, title_en: null, slides: [] } as unknown as StationModule<string>;
    expect(moduleMissingContent(slideshow)).toBe(true);
  });

  test('quiz with questions is complete', () => {
    expect(moduleMissingContent(quiz())).toBe(false);
  });
});
