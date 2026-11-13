/// <reference types="vitest" />
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuestionSound } from '../../src/stationModules/player/modules/QuestionSound';
import { QuizPlayer } from '../../src/stationModules/player/modules/QuizPlayer';
import type { ModuleOfType } from '../../src/stationModules/types';

let play: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});

afterEach(() => {
  // Erst abräumen (Unmount pausiert den Ton), dann die Mocks zurücksetzen
  cleanup();
  vi.restoreAllMocks();
});

function quizModule(audio: string | null): ModuleOfType<'quiz', string> {
  return {
    id: 'q-1',
    type: 'quiz',
    title_de: null,
    title_en: null,
    questions: [
      {
        question_de: 'Welches Tier ist das?',
        question_en: null,
        options_de: ['Kuh', 'Hahn', 'Schaf'],
        options_en: null,
        correct_answer: 1,
        image: null,
        audio,
        explanation_de: null,
        explanation_en: null,
      },
    ],
  };
}

describe('QuestionSound', () => {
  test('renders a play button and plays the sound on click', async () => {
    const user = userEvent.setup();
    render(<QuestionSound src="/sound.mp3" />);

    const button = screen.getByRole('button', { name: 'Ton abspielen' });
    expect(play).not.toHaveBeenCalled();

    await user.click(button);
    expect(play).toHaveBeenCalledTimes(1);
  });

  test('offers to listen again after the sound ended', () => {
    const { container } = render(<QuestionSound src="/sound.mp3" />);
    fireEvent.ended(container.querySelector('audio') as HTMLAudioElement);

    expect(screen.getByRole('button', { name: 'Nochmal anhören' })).toBeInTheDocument();
  });

  test('shows an error message when the sound cannot be loaded', () => {
    const { container } = render(<QuestionSound src="/missing.mp3" />);
    fireEvent.error(container.querySelector('audio') as HTMLAudioElement);

    expect(screen.getByRole('alert')).toHaveTextContent('Ton konnte nicht geladen werden.');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('QuizPlayer sound question', () => {
  const props = { lang: 'de' as const, continueLabel: 'Weiter', onContinue: vi.fn(), preview: false };

  test('shows the sound player only when the question has audio', () => {
    const { rerender } = render(<QuizPlayer module={quizModule('/sound.mp3')} {...props} />);
    expect(screen.getByRole('button', { name: 'Ton abspielen' })).toBeInTheDocument();

    rerender(<QuizPlayer module={quizModule(null)} {...props} />);
    expect(screen.queryByRole('button', { name: 'Ton abspielen' })).not.toBeInTheDocument();
    expect(screen.getByText('Welches Tier ist das?')).toBeInTheDocument();
  });
});
