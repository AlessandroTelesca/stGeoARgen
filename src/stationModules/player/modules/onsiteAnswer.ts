/** Textvergleich: ohne Rand und Mehrfach-Leerzeichen, klein geschrieben */
function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Zahl aus einer Eingabe wie „1,5“, „1.890“, „1 890“ oder „1.234,5“; null, wenn keine Zahl.
 * Leerzeichen und ' trennen Tausender; kommen Punkt und Komma vor, ist das letzte der Dezimaltrenner.
 */
export function parseLocaleNumber(s: string): number | null {
  let value = s.trim().replace(/[\s  ']/g, '');
  if (value === '') return null;

  const lastDot = value.lastIndexOf('.');
  const lastComma = value.lastIndexOf(',');
  if (lastDot !== -1 && lastComma !== -1) {
    const decimal = lastDot > lastComma ? '.' : ',';
    const thousands = decimal === '.' ? ',' : '.';
    value = value.split(thousands).join('').replace(decimal, '.');
  } else if (lastComma !== -1) {
    // Genau ein Komma = Dezimaltrenner, mehrere sind keine Zahl
    if (value.indexOf(',') !== lastComma) return null;
    value = value.replace(',', '.');
  } else if (lastDot !== -1) {
    // „1.890“ und „12.345.678“ sind Tausender, sonst ist ein Punkt der Dezimaltrenner
    if (/^-?\d{1,3}(\.\d{3})+$/.test(value)) value = value.replace(/\./g, '');
  }

  // Nur Ziffern mit optionalem Vorzeichen und Dezimalpunkt (kein „0x10“, „Infinity“ o. Ä.)
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(value)) return null;
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
}

/** Passt die Eingabe zu einer der akzeptierten Antworten? Zahlen werden nach Wert verglichen. */
export function answersMatch(given: string, answers: string[], numeric: boolean): boolean {
  const givenText = normalizeText(given);
  const textMatch = (answer: string) => normalizeText(answer) === givenText;
  if (!numeric) return answers.some(textMatch);

  const givenNumber = parseLocaleNumber(given);
  return answers.some((answer) => {
    const answerNumber = parseLocaleNumber(answer);
    if (givenNumber === null || answerNumber === null) return textMatch(answer);
    return Math.abs(givenNumber - answerNumber) < 1e-9;
  });
}
