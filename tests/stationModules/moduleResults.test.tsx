/// <reference types="vitest" />
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnsiteCodePlayer } from '../../src/stationModules/player/modules/OnsiteCodePlayer';
import { QuizPlayer } from '../../src/stationModules/player/modules/QuizPlayer';
import type { ModuleOfType } from '../../src/stationModules/types';

// jsdom kennt scrollIntoView nicht (Reveal und Quiz scrollen neue Inhalte ins Bild)
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(cleanup);

const question = (correct_answer: number) => ({
  question_de: 'Frage',
  question_en: null,
  options_de: ['Alpha', 'Beta'],
  options_en: null,
  correct_answer,
  image: null,
  audio: null,
  explanation_de: null,
  explanation_en: null,
});

const quiz: ModuleOfType<'quiz', string> = {
  id: 'q-1',
  type: 'quiz',
  title_de: null,
  title_en: null,
  // Frage 1: Alpha richtig, Frage 2: Beta richtig
  questions: [{ ...question(0), question_de: 'Erste Frage' }, { ...question(1), question_de: 'Zweite Frage' }],
};

const onsite: ModuleOfType<'onsite_code', string> = {
  id: 'o-1',
  type: 'onsite_code',
  title_de: null,
  title_en: null,
  task_de: 'Wie hoch?',
  task_en: null,
  input: 'number',
  answers: ['1.5'],
  hint_de: null,
  hint_en: null,
  image: null,
  solution_de: null,
  solution_en: null,
};

describe('Modul-Ergebnisse', () => {
  test('Quiz meldet die Anzahl auf Anhieb richtiger Fragen vor onContinue', async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    const onContinue = vi.fn();
    render(<QuizPlayer module={quiz} lang="de" continueLabel="Weiter" onContinue={onContinue} onResult={onResult} preview={false} />);

    // Frage 1: gleich richtig
    await user.click(screen.getByText('Alpha'));
    await user.click(screen.getByRole('button', { name: 'Nächste Frage' }));

    // Frage 2: erst falsch (Alpha), dann richtig (Beta)
    await user.click(screen.getByText('Alpha'));
    await user.click(screen.getByText('Beta'));
    expect(onResult).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Weiter' }));

    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith({ correct: 1, total: 2 });
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onResult.mock.invocationCallOrder[0]).toBeLessThan(onContinue.mock.invocationCallOrder[0]);
  });

  test('Rätsel meldet bei richtiger Eingabe 1 von 1 (auch in anderer Zahlenschreibweise)', async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    const onContinue = vi.fn();
    render(<OnsiteCodePlayer module={onsite} lang="de" continueLabel="Weiter" onContinue={onContinue} onResult={onResult} preview={false} />);

    await user.type(screen.getByRole('textbox', { name: 'Deine Antwort' }), '1,5');
    await user.click(screen.getByRole('button', { name: 'Prüfen' }));
    await user.click(screen.getByRole('button', { name: 'Weiter' }));

    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith({ correct: 1, total: 1 });
    expect(onResult.mock.invocationCallOrder[0]).toBeLessThan(onContinue.mock.invocationCallOrder[0]);
  });
});
