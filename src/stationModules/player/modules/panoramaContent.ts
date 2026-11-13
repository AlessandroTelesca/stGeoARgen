import { pickLang, type ModuleOfType } from '../../types';
import type { PanoramaQuizQuestion } from '../../../components/ARComponents/customPanorama/usePanoramaQuiz';

type ArPanoramaModule = ModuleOfType<'ar_panorama', string>;

/** Bilder und Fragen des AR-Rundumblicks in der aktuellen Sprache (gemeinsam für Handy-Ansicht und Player auf der Bühne) */
export function buildPanoramaContent(module: ArPanoramaModule, lang: 'de' | 'en') {
  return {
    // null → Live-Kamerabild als Hintergrund
    panoramaUrl: module.background === 'panorama' ? module.panorama_image : null,
    slides: module.slides.map((slide) => ({
      imageUrl: slide.image,
      text: pickLang(lang, slide.text_de, slide.text_en),
    })),
    questions: module.questions.map(
      (q): PanoramaQuizQuestion => ({
        question: pickLang(lang, q.question_de, q.question_en),
        options: (lang === 'en' && q.options_en) || q.options_de,
        correctAnswer: q.correct_answer,
        imageUrl: q.image ?? undefined,
      })
    ),
  };
}
