import { useEffect, useMemo, useState } from 'react';

export interface PanoramaQuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  /** Optionales Bild über der Frage */
  imageUrl?: string;
}

export type QuizPhase = 'question' | 'feedback' | 'summary';

/**
 * Zustand und Antwortlogik des Panorama-Quiz (gemeinsam für die Handy-Ansicht und den Player auf der Bühne):
 * falsche Antworten werden gemerkt und gesperrt, die richtige beendet die Frage, am Ende folgt die Auswertung.
 */
export function usePanoramaQuiz(questions: PanoramaQuizQuestion[]) {
  const totalQuestions = questions.length;
  const [phase, setPhase] = useState<QuizPhase>('question');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [wrongSelections, setWrongSelections] = useState<number[][]>(() => questions.map(() => []));
  const [correctSelection, setCorrectSelection] = useState<number | null>(null);
  const [hideQuizSummary, setHideQuizSummary] = useState(false);
  const currentQuestion: PanoramaQuizQuestion | undefined = questions[questionIndex];

  // Beim Sprachwechsel bzw. geänderten Inhalten das Quiz neu beginnen (Inhalt vergleichen, nicht die Array-Identität)
  const questionsKey = JSON.stringify(questions);
  useEffect(() => {
    setPhase('question');
    setQuestionIndex(0);
    setWrongSelections(questions.map(() => []));
    setCorrectSelection(null);
    setHideQuizSummary(false);
  }, [questionsKey]);

  // Beim ersten Versuch richtig beantwortete Fragen
  const firstTryCorrect = useMemo(() => wrongSelections.filter((wrong) => wrong.length === 0).length, [wrongSelections]);

  const handleAnswer = (answerIndex: number) => {
    if (phase !== 'question' || !currentQuestion || wrongSelections[questionIndex].includes(answerIndex)) return;
    if (answerIndex !== currentQuestion.correctAnswer) {
      setWrongSelections((prev) => prev.map((wrong, i) => (i === questionIndex ? [...wrong, answerIndex] : wrong)));
      return;
    }
    setCorrectSelection(answerIndex);
    setPhase('feedback');
  };

  const handleContinue = () => {
    if (questionIndex >= totalQuestions - 1) {
      setPhase('summary');
      return;
    }
    setQuestionIndex((i) => i + 1);
    setCorrectSelection(null);
    setPhase('question');
  };

  return {
    questions,
    totalQuestions,
    phase,
    questionIndex,
    wrongSelections,
    correctSelection,
    currentQuestion,
    firstTryCorrect,
    hideQuizSummary,
    setHideQuizSummary,
    handleAnswer,
    handleContinue,
  };
}

export type PanoramaQuizState = ReturnType<typeof usePanoramaQuiz>;
