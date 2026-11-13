<?php
/**
 * Validierung der Module einer Station (custom_stations.modules).
 * Das Format steht verbindlich in src/stationModules/types.ts.
 *
 * Diese Datei bindet nichts selbst ein: sie benutzt fail(), requiredText(), optionalText(),
 * parseQuizQuestion() und isValidStationImageName() aus custom_stations_lib.php, das sie lädt.
 * Daher immer custom_stations_lib.php einbinden, nie diese Datei direkt.
 */

const STATION_MAX_MODULES = 12;
const STATION_MAX_MODULE_SLIDES = 10;
const STATION_MAX_MODULE_QUESTIONS = 10;
const STATION_MAX_TIMELINE_ENTRIES = 12;
const STATION_MAX_HOTSPOTS = 8;
const STATION_MAX_ONSITE_ANSWERS = 5;
const STATION_MAX_AR_POINTS = 12;
const STATION_MAX_SEQUENCE_ITEMS = 6;

/** Modultyp → Name in Fehlermeldungen */
const STATION_MODULE_TYPES = [
    'story'        => 'Erzähltext',
    'slideshow'    => 'Bildfolge',
    'before_after' => 'Vorher/Nachher',
    'ar_panorama'  => 'AR-Rundumblick',
    'ar_discover'  => 'AR-Entdecken',
    'quiz'         => 'Quiz',
    'estimate'     => 'Schätzfrage',
    'timeline'     => 'Zeitstrahl',
    'hotspots'     => 'Bild mit Infopunkten',
    'onsite_code'  => 'Vor-Ort-Rätsel',
    'audio'        => 'Hörstück',
    'sequence'     => 'Reihenfolge',
    'photo'        => 'Fotomoment',
];

/**
 * Art einer Datei nach Endung: 'image' (jpg, png, webp), 'audio' (mp3, m4a) oder null.
 */
function stationFileKind($filename): ?string {
    if (!isValidStationImageName($filename)) {
        return null;
    }
    return in_array(pathinfo($filename, PATHINFO_EXTENSION), ['mp3', 'm4a'], true) ? 'audio' : 'image';
}

/**
 * Text eines Modulfelds: Pflicht (nicht leer) oder optional (leer → null) mit Maximallänge.
 * $prefix = Modulbezeichnung, $name = Feldname in der Fehlermeldung (z. B. "Text (DE)").
 */
function stationModuleText(array $src, string $key, int $maxLength, string $prefix, string $name, bool $required = false): ?string {
    $value = $src[$key] ?? null;
    if ($value !== null && !is_string($value) && !is_int($value) && !is_float($value)) {
        fail("$prefix: $name ist ungültig.");
    }
    return $required
        ? requiredText($src, $key, $maxLength, "$prefix: $name")
        : optionalText($src, $key, $maxLength, "$prefix: $name");
}

/** Wert aus einer Liste erlaubter Werte (z. B. style, mode). */
function stationModuleEnum(array $src, string $key, array $allowed, string $prefix, string $name): string {
    $value = $src[$key] ?? null;
    if (!is_string($value) || !in_array($value, $allowed, true)) {
        fail("$prefix: Ungültiger Wert für $name.");
    }
    return $value;
}

/**
 * Liste von Objekten mit $min bis $max Einträgen. $name steht im Plural in der Meldung (z. B. "Bilder").
 */
function stationModuleList(array $src, string $key, int $min, int $max, string $prefix, string $name): array {
    $list = $src[$key] ?? null;
    if (!is_array($list)) {
        $list = [];
    }
    $list = array_values($list);
    if (count($list) < $min || count($list) > $max) {
        fail($min === 0 ? "$prefix: Höchstens $max $name erlaubt." : "$prefix: $min bis $max $name erforderlich.");
    }
    foreach ($list as $item) {
        if (!is_array($item)) {
            fail("$prefix: $name sind ungültig.");
        }
    }
    return $list;
}

/**
 * Endliche Zahl (int, float oder numerischer String); sonst 400. Rückgabe als float.
 */
function stationModuleNumber($value, string $label): float {
    if (is_string($value)) {
        $value = trim($value);
    }
    $isNumber = is_int($value) || is_float($value) || (is_string($value) && $value !== '' && is_numeric($value));
    if (!$isNumber) {
        fail("$label ist keine gültige Zahl.");
    }
    $number = (float) $value;
    if (!is_finite($number) || abs($number) > 1e12) {
        fail("$label ist keine gültige Zahl.");
    }
    return $number;
}

/** Ganzzahlige Werte als int ausgeben, sonst als float. */
function stationModuleNumberOut(float $number): int|float {
    return floor($number) === $number ? (int) $number : $number;
}

/**
 * Bestehensgrenze eines Moduls: fehlend/null → null (Punkte immer); sonst ganze Zahl von 1 bis $max.
 * Quiz: Mindestanzahl auf Anhieb richtiger Antworten ($max = Fragenzahl); übrige Typen: 1 = muss gelöst werden.
 */
function stationModulePassThreshold(array $src, int $max, string $prefix): ?int {
    $value = $src['pass_threshold'] ?? null;
    if (is_string($value)) {
        $value = trim($value);
    }
    if ($value === null || $value === '') {
        return null;
    }
    if (is_string($value) && is_numeric($value)) {
        $value = $value + 0;
    }
    $isWhole = is_int($value) || (is_float($value) && is_finite($value) && floor($value) === $value);
    if (!$isWhole || $value < 1 || $value > $max) {
        fail("$prefix: Bestehensgrenze muss zwischen 1 und $max liegen.");
    }
    return (int) $value;
}

/**
 * Medienreferenz eines Felds (Dateiname oder "new:N"): leer/null → null; sonst String.
 * Gültigkeit prüft erst mapStationModuleMedia im Anschluss.
 */
function stationModuleMediaValue(array $src, string $key, string $prefix): ?string {
    $value = $src[$key] ?? null;
    if ($value === null || $value === '') {
        return null;
    }
    if (!is_string($value)) {
        fail("$prefix: Ungültige Dateireferenz.");
    }
    return $value;
}

/**
 * Wandelt alle Medienfelder eines geprüften Moduls um (Gegenstück zu mapModuleMedia in types.ts –
 * einzige Stelle, die weiß, wo in welchem Modultyp Medien stecken). $map(ref, art) mit art
 * 'image' | 'panorama' | 'audio' wird nur für gesetzte Felder aufgerufen.
 */
function mapStationModuleMedia(array $module, callable $map): array {
    $opt = fn($value, string $kind = 'image') => $value === null ? null : $map($value, $kind);
    $slides = fn(array $list) => array_map(fn($s) => array_merge($s, ['image' => $map($s['image'], 'image')]), $list);
    $questions = fn(array $list) => array_map(fn($q) => array_merge($q, ['image' => $opt($q['image'] ?? null), 'audio' => $opt($q['audio'] ?? null, 'audio')]), $list);

    switch ($module['type'] ?? null) {
        case 'story':
        case 'onsite_code':
            return array_merge($module, ['image' => $opt($module['image'] ?? null)]);
        case 'slideshow':
            return array_merge($module, ['slides' => $slides($module['slides'])]);
        case 'before_after':
            return array_merge($module, [
                'before_image' => $map($module['before_image'], 'image'),
                'after_image' => $opt($module['after_image'] ?? null),
            ]);
        case 'ar_panorama':
            return array_merge($module, [
                'panorama_image' => $opt($module['panorama_image'] ?? null, 'panorama'),
                'slides' => $slides($module['slides']),
                'questions' => $questions($module['questions']),
            ]);
        case 'ar_discover':
            return array_merge($module, [
                'panorama_image' => $opt($module['panorama_image'] ?? null, 'panorama'),
                'points' => array_map(fn($p) => array_merge($p, ['image' => $opt($p['image'] ?? null)]), $module['points']),
            ]);
        case 'quiz':
            return array_merge($module, ['questions' => $questions($module['questions'])]);
        case 'timeline':
            return array_merge($module, [
                'entries' => array_map(fn($e) => array_merge($e, ['image' => $opt($e['image'] ?? null)]), $module['entries']),
            ]);
        case 'hotspots':
            return array_merge($module, ['image' => $map($module['image'], 'image')]);
        case 'sequence':
            return array_merge($module, [
                'items' => array_map(fn($i) => array_merge($i, ['image' => $opt($i['image'] ?? null)]), $module['items']),
            ]);
        case 'audio':
            return array_merge($module, [
                'audio' => $map($module['audio'], 'audio'),
                'image' => $opt($module['image'] ?? null),
            ]);
        default:
            return $module;
    }
}

/**
 * Ersetzt in den Modulen alle "new:N" durch die gespeicherten Dateinamen ($storedFiles[N]).
 */
function resolveStationModuleMedia(array $modules, array $storedFiles): array {
    $resolve = fn($ref) => preg_match('/^new:(\d+)$/', $ref, $m) === 1 ? $storedFiles[(int) $m[1]] : $ref;
    return array_map(fn($module) => mapStationModuleMedia($module, $resolve), $modules);
}

/**
 * Prüft das Modul-Array einer Anfrage; bricht bei Fehlern mit 400 und verständlicher Meldung ab.
 * $newFileCount = Anzahl hochgeladener Dateien in files[].
 * Rückgabe: { modules: [...neu aufgebaut aus den geprüften Feldern], newFiles: [N => 'image' | 'audio'] }
 * Medienwerte sind vorhandene Dateinamen (Herkunft prüft der Aufrufer) oder "new:N".
 */
function parseStationModules($input, int $newFileCount): array {
    if (!is_array($input) || count($input) < 1) {
        fail('Eine Station braucht mindestens ein Modul.');
    }
    if (count($input) > STATION_MAX_MODULES) {
        fail('Maximal ' . STATION_MAX_MODULES . ' Module pro Station.');
    }

    $modules = [];
    $newFiles = [];
    $usedIds = [];
    $panoramaCount = 0;

    foreach (array_values($input) as $index => $src) {
        $number = $index + 1;
        if (!is_array($src)) {
            fail("Modul $number ist ungültig.");
        }

        $type = $src['type'] ?? null;
        if (!is_string($type) || !isset(STATION_MODULE_TYPES[$type])) {
            fail("Modul $number: Unbekannter Modultyp.");
        }
        $prefix = "Modul $number (" . STATION_MODULE_TYPES[$type] . ')';

        $id = $src['id'] ?? null;
        if (!is_string($id) || preg_match('/^[a-zA-Z0-9_-]{1,40}$/', $id) !== 1) {
            fail("$prefix: Ungültige Modul-ID.");
        }
        if (isset($usedIds[$id])) {
            fail("$prefix: Modul-ID \"$id\" kommt doppelt vor.");
        }
        $usedIds[$id] = true;

        if ($type === 'ar_panorama' && ++$panoramaCount > 1) {
            fail('Pro Station ist nur ein AR-Rundumblick erlaubt.');
        }

        $module = [
            'id' => $id,
            'type' => $type,
            'title_de' => stationModuleText($src, 'title_de', 120, $prefix, 'Titel (DE)'),
            'title_en' => stationModuleText($src, 'title_en', 120, $prefix, 'Titel (EN)'),
        ];
        $module += parseStationModuleBody($type, $src, $prefix);

        // Medienreferenzen prüfen: vorhandener Dateiname oder "new:N" (jedes N nur einmal, passende Art)
        $module = mapStationModuleMedia(
            $module,
            function ($ref, string $kind) use (&$newFiles, $newFileCount, $prefix) {
                $expected = $kind === 'audio' ? 'audio' : 'image';
                if (preg_match('/^new:(\d+)$/', $ref, $m) === 1) {
                    $n = (int) $m[1];
                    if ($n >= $newFileCount || isset($newFiles[$n])) {
                        fail("$prefix: Ungültige Dateireferenz.");
                    }
                    $newFiles[$n] = $expected;
                    return "new:$n";
                }
                if (stationFileKind($ref) !== $expected) {
                    fail("$prefix: " . ($expected === 'audio' ? 'Ungültige Audiodatei.' : 'Ungültige Bildreferenz.'));
                }
                return $ref;
            }
        );

        $modules[] = $module;
    }

    return ['modules' => $modules, 'newFiles' => $newFiles];
}

/**
 * Typspezifische Felder eines Moduls (ohne id/type/title_*). Medienwerte bleiben unverändert als
 * Referenz (String oder null); ihre Gültigkeit prüft parseStationModules danach.
 */
function parseStationModuleBody(string $type, array $src, string $prefix): array {
    switch ($type) {
        case 'story':
            $style = stationModuleEnum($src, 'style', ['text', 'georgi', 'quote'], $prefix, 'Stil');
            return [
                'style' => $style,
                'text_de' => stationModuleText($src, 'text_de', 5000, $prefix, 'Text (DE)', true),
                'text_en' => stationModuleText($src, 'text_en', 5000, $prefix, 'Text (EN)'),
                'image' => stationModuleMediaValue($src, 'image', $prefix),
                'quote_source' => $style === 'quote' ? stationModuleText($src, 'quote_source', 150, $prefix, 'Quelle') : null,
            ];

        case 'slideshow':
            return ['slides' => parseStationSlides($src, 1, STATION_MAX_MODULE_SLIDES, $prefix)];

        case 'before_after':
            $mode = stationModuleEnum($src, 'mode', ['slider', 'fade', 'camera'], $prefix, 'Modus');
            $beforeImage = stationModuleMediaValue($src, 'before_image', $prefix);
            // Im Kamera-Modus ist die Live-Kamera das „Nachher“: ein mitgeschicktes Bild wird verworfen
            $afterImage = $mode === 'camera' ? null : stationModuleMediaValue($src, 'after_image', $prefix);
            $beforeLabel = stationModuleText($src, 'before_label_de', 40, $prefix, 'Beschriftung „Vorher“ (DE)', true);
            // Im Kamera-Modus gibt es kein „Nachher“-Bild, die Beschriftung ist dort ohne Bedeutung
            $afterLabel = stationModuleText($src, 'after_label_de', 40, $prefix, 'Beschriftung „Nachher“ (DE)', $mode !== 'camera') ?? '';
            if ($beforeImage === null) {
                fail("$prefix: Bild „$beforeLabel“ fehlt.");
            }
            if ($mode !== 'camera' && $afterImage === null) {
                fail("$prefix: Bild „$afterLabel“ fehlt.");
            }
            return [
                'mode' => $mode,
                'before_image' => $beforeImage,
                'before_label_de' => $beforeLabel,
                'before_label_en' => stationModuleText($src, 'before_label_en', 40, $prefix, 'Beschriftung „Vorher“ (EN)'),
                'after_image' => $afterImage,
                'after_label_de' => $afterLabel,
                'after_label_en' => stationModuleText($src, 'after_label_en', 40, $prefix, 'Beschriftung „Nachher“ (EN)'),
                'text_de' => stationModuleText($src, 'text_de', 2000, $prefix, 'Text (DE)'),
                'text_en' => stationModuleText($src, 'text_en', 2000, $prefix, 'Text (EN)'),
            ];

        case 'ar_panorama':
            $background = stationModuleEnum($src, 'background', ['panorama', 'camera'], $prefix, 'Hintergrund');
            $panoramaImage = stationModuleMediaValue($src, 'panorama_image', $prefix);
            if ($background === 'panorama' && $panoramaImage === null) {
                fail("$prefix: Bitte ein 360°-Bild auswählen.");
            }
            return [
                'background' => $background,
                'panorama_image' => $panoramaImage,
                'slides' => parseStationSlides($src, 0, STATION_MAX_PANORAMA_SLIDES, $prefix),
                'questions' => parseStationQuestions($src, $prefix, false),
            ];

        case 'ar_discover':
            $background = stationModuleEnum($src, 'background', ['panorama', 'camera'], $prefix, 'Hintergrund');
            $panoramaImage = stationModuleMediaValue($src, 'panorama_image', $prefix);
            if ($background === 'panorama' && $panoramaImage === null) {
                fail("$prefix: Bitte ein 360°-Bild auswählen.");
            }
            $points = [];
            $usedPointIds = [];
            foreach (stationModuleList($src, 'points', 1, STATION_MAX_AR_POINTS, $prefix, 'Punkte') as $i => $point) {
                $label = "$prefix: Punkt " . ($i + 1);
                $pointId = $point['id'] ?? null;
                if (!is_string($pointId) || preg_match('/^[a-zA-Z0-9_-]{1,20}$/', $pointId) !== 1) {
                    fail("$label: Ungültige Punkt-ID.");
                }
                if (isset($usedPointIds[$pointId])) {
                    fail("$label: Punkt-ID \"$pointId\" kommt doppelt vor.");
                }
                $usedPointIds[$pointId] = true;
                $yaw = stationModuleNumber($point['yaw'] ?? null, "$label: Richtung (yaw)");
                $pitch = stationModuleNumber($point['pitch'] ?? null, "$label: Höhe (pitch)");
                if ($yaw < -180 || $yaw > 180 || $pitch < -85 || $pitch > 85) {
                    fail("$label: Die Position liegt außerhalb des erlaubten Bereichs.");
                }
                $points[] = [
                    'id' => $pointId,
                    'yaw' => stationModuleNumberOut(round($yaw, 2)),
                    'pitch' => stationModuleNumberOut(round($pitch, 2)),
                    'size' => stationModuleEnum($point, 'size', ['small', 'medium', 'large'], $label, 'Größe'),
                    'title_de' => stationModuleText($point, 'title_de', 80, $label, 'Titel (DE)', true),
                    'title_en' => stationModuleText($point, 'title_en', 80, $label, 'Titel (EN)'),
                    'text_de' => stationModuleText($point, 'text_de', 1000, $label, 'Text (DE)', true),
                    'text_en' => stationModuleText($point, 'text_en', 1000, $label, 'Text (EN)'),
                    'image' => stationModuleMediaValue($point, 'image', $label),
                ];
            }
            return [
                'background' => $background,
                'panorama_image' => $panoramaImage,
                'intro_de' => stationModuleText($src, 'intro_de', 500, $prefix, 'Einleitung (DE)'),
                'intro_en' => stationModuleText($src, 'intro_en', 500, $prefix, 'Einleitung (EN)'),
                'points' => $points,
                'require_all' => ($src['require_all'] ?? false) === true,
            ];

        case 'quiz':
            $questions = parseStationQuestions($src, $prefix, true);
            return [
                'questions' => $questions,
                'pass_threshold' => stationModulePassThreshold($src, count($questions), $prefix),
            ];

        case 'estimate':
            $min = stationModuleNumber($src['min'] ?? null, "$prefix: Minimum");
            $max = stationModuleNumber($src['max'] ?? null, "$prefix: Maximum");
            $step = stationModuleNumber($src['step'] ?? null, "$prefix: Schrittweite");
            $answer = stationModuleNumber($src['answer'] ?? null, "$prefix: Richtige Antwort");
            $tolerance = stationModuleNumber($src['tolerance'] ?? null, "$prefix: Toleranz");
            if ($min >= $max) {
                fail("$prefix: Das Maximum muss größer als das Minimum sein.");
            }
            if ($step <= 0) {
                fail("$prefix: Die Schrittweite muss größer als 0 sein.");
            }
            if (($max - $min) / $step > 10000) {
                fail("$prefix: Die Schrittweite ist zu klein für diesen Wertebereich (höchstens 10000 Schritte).");
            }
            if ($answer < $min || $answer > $max) {
                fail("$prefix: Die richtige Antwort muss zwischen Minimum und Maximum liegen.");
            }
            if ($tolerance < 0) {
                fail("$prefix: Die Toleranz darf nicht negativ sein.");
            }
            return [
                'question_de' => stationModuleText($src, 'question_de', 255, $prefix, 'Frage (DE)', true),
                'question_en' => stationModuleText($src, 'question_en', 255, $prefix, 'Frage (EN)'),
                'min' => stationModuleNumberOut($min),
                'max' => stationModuleNumberOut($max),
                'step' => stationModuleNumberOut($step),
                'answer' => stationModuleNumberOut($answer),
                'tolerance' => stationModuleNumberOut($tolerance),
                'unit_de' => stationModuleText($src, 'unit_de', 20, $prefix, 'Einheit (DE)'),
                'unit_en' => stationModuleText($src, 'unit_en', 20, $prefix, 'Einheit (EN)'),
                'explanation_de' => stationModuleText($src, 'explanation_de', 1000, $prefix, 'Erklärung (DE)'),
                'explanation_en' => stationModuleText($src, 'explanation_en', 1000, $prefix, 'Erklärung (EN)'),
                'pass_threshold' => stationModulePassThreshold($src, 1, $prefix),
            ];

        case 'timeline':
            $entries = [];
            foreach (stationModuleList($src, 'entries', 2, STATION_MAX_TIMELINE_ENTRIES, $prefix, 'Einträge') as $i => $entry) {
                $label = "$prefix: Eintrag " . ($i + 1);
                $entries[] = [
                    'year' => stationModuleText($entry, 'year', 20, $label, 'Jahr', true),
                    'text_de' => stationModuleText($entry, 'text_de', 500, $label, 'Text (DE)', true),
                    'text_en' => stationModuleText($entry, 'text_en', 500, $label, 'Text (EN)'),
                    'image' => stationModuleMediaValue($entry, 'image', $label),
                ];
            }
            return ['entries' => $entries];

        case 'hotspots':
            $image = stationModuleMediaValue($src, 'image', $prefix);
            if ($image === null) {
                fail("$prefix: Bild fehlt.");
            }
            $spots = [];
            foreach (stationModuleList($src, 'spots', 1, STATION_MAX_HOTSPOTS, $prefix, 'Infopunkte') as $i => $spot) {
                $label = "$prefix: Infopunkt " . ($i + 1);
                $x = stationModuleNumber($spot['x'] ?? null, "$label: Position x");
                $y = stationModuleNumber($spot['y'] ?? null, "$label: Position y");
                if ($x < 0 || $x > 1 || $y < 0 || $y > 1) {
                    fail("$label: Die Position muss auf dem Bild liegen.");
                }
                $spots[] = [
                    'x' => $x,
                    'y' => $y,
                    'title_de' => stationModuleText($spot, 'title_de', 80, $label, 'Titel (DE)', true),
                    'title_en' => stationModuleText($spot, 'title_en', 80, $label, 'Titel (EN)'),
                    'text_de' => stationModuleText($spot, 'text_de', 1000, $label, 'Text (DE)', true),
                    'text_en' => stationModuleText($spot, 'text_en', 1000, $label, 'Text (EN)'),
                ];
            }
            return [
                'image' => $image,
                'intro_de' => stationModuleText($src, 'intro_de', 500, $prefix, 'Einleitung (DE)'),
                'intro_en' => stationModuleText($src, 'intro_en', 500, $prefix, 'Einleitung (EN)'),
                'spots' => $spots,
            ];

        case 'onsite_code':
            $answersInput = $src['answers'] ?? null;
            if (!is_array($answersInput) || count($answersInput) < 1 || count($answersInput) > STATION_MAX_ONSITE_ANSWERS) {
                fail("$prefix: 1 bis " . STATION_MAX_ONSITE_ANSWERS . ' Antworten erforderlich.');
            }
            $answers = [];
            foreach (array_values($answersInput) as $i => $answer) {
                if (!is_string($answer) && !is_int($answer) && !is_float($answer)) {
                    fail("$prefix: Antwort " . ($i + 1) . ' ist ungültig.');
                }
                $answer = trim((string) $answer);
                if ($answer === '') {
                    fail("$prefix: Antwort " . ($i + 1) . ' fehlt.');
                }
                if (mb_strlen($answer) > 100) {
                    fail("$prefix: Antwort " . ($i + 1) . ' ist zu lang (max. 100 Zeichen).');
                }
                $answers[] = $answer;
            }
            return [
                'task_de' => stationModuleText($src, 'task_de', 500, $prefix, 'Aufgabe (DE)', true),
                'task_en' => stationModuleText($src, 'task_en', 500, $prefix, 'Aufgabe (EN)'),
                'input' => stationModuleEnum($src, 'input', ['text', 'number'], $prefix, 'Eingabeart'),
                'answers' => $answers,
                'hint_de' => stationModuleText($src, 'hint_de', 500, $prefix, 'Hinweis (DE)'),
                'hint_en' => stationModuleText($src, 'hint_en', 500, $prefix, 'Hinweis (EN)'),
                'image' => stationModuleMediaValue($src, 'image', $prefix),
                'solution_de' => stationModuleText($src, 'solution_de', 1000, $prefix, 'Auflösung (DE)'),
                'solution_en' => stationModuleText($src, 'solution_en', 1000, $prefix, 'Auflösung (EN)'),
                'pass_threshold' => stationModulePassThreshold($src, 1, $prefix),
            ];

        case 'audio':
            $audio = stationModuleMediaValue($src, 'audio', $prefix);
            if ($audio === null) {
                fail("$prefix: Audiodatei fehlt.");
            }
            return [
                'audio' => $audio,
                'image' => stationModuleMediaValue($src, 'image', $prefix),
                'speaker' => stationModuleText($src, 'speaker', 150, $prefix, 'Sprecher'),
                'transcript_de' => stationModuleText($src, 'transcript_de', 10000, $prefix, 'Text zum Mitlesen (DE)'),
                'transcript_en' => stationModuleText($src, 'transcript_en', 10000, $prefix, 'Text zum Mitlesen (EN)'),
            ];

        case 'sequence':
            $items = [];
            foreach (stationModuleList($src, 'items', 3, STATION_MAX_SEQUENCE_ITEMS, $prefix, 'Einträge') as $i => $item) {
                $label = "$prefix: Eintrag " . ($i + 1);
                $items[] = [
                    'text_de' => stationModuleText($item, 'text_de', 200, $label, 'Text (DE)', true),
                    'text_en' => stationModuleText($item, 'text_en', 200, $label, 'Text (EN)'),
                    'image' => stationModuleMediaValue($item, 'image', $label),
                    'label' => stationModuleText($item, 'label', 20, $label, 'Beschriftung'),
                ];
            }
            return [
                'task_de' => stationModuleText($src, 'task_de', 255, $prefix, 'Aufgabe (DE)', true),
                'task_en' => stationModuleText($src, 'task_en', 255, $prefix, 'Aufgabe (EN)'),
                'items' => $items,
                'explanation_de' => stationModuleText($src, 'explanation_de', 1000, $prefix, 'Erklärung (DE)'),
                'explanation_en' => stationModuleText($src, 'explanation_en', 1000, $prefix, 'Erklärung (EN)'),
                'pass_threshold' => stationModulePassThreshold($src, 1, $prefix),
            ];

        case 'photo':
            return [
                'prompt_de' => stationModuleText($src, 'prompt_de', 255, $prefix, 'Aufforderung (DE)', true),
                'prompt_en' => stationModuleText($src, 'prompt_en', 255, $prefix, 'Aufforderung (EN)'),
                'frame' => stationModuleEnum($src, 'frame', ['badge', 'polaroid'], $prefix, 'Rahmen'),
                'camera' => stationModuleEnum($src, 'camera', ['environment', 'user'], $prefix, 'Kamera'),
                'caption_de' => stationModuleText($src, 'caption_de', 60, $prefix, 'Beschriftung (DE)'),
                'caption_en' => stationModuleText($src, 'caption_en', 60, $prefix, 'Beschriftung (EN)'),
            ];
    }

    fail("$prefix: Unbekannter Modultyp.");
    return [];
}

/** Bilder mit Text (slides) eines Moduls: Bild und deutscher Text sind Pflicht. */
function parseStationSlides(array $src, int $min, int $max, string $prefix): array {
    $slides = [];
    foreach (stationModuleList($src, 'slides', $min, $max, $prefix, 'Bilder') as $i => $slide) {
        $label = "$prefix: Bild " . ($i + 1);
        $image = stationModuleMediaValue($slide, 'image', $label);
        if ($image === null) {
            fail("$label: Bild fehlt.");
        }
        $slides[] = [
            'image' => $image,
            'text_de' => stationModuleText($slide, 'text_de', 1000, $label, 'Text (DE)', true),
            'text_en' => stationModuleText($slide, 'text_en', 1000, $label, 'Text (EN)'),
        ];
    }
    return $slides;
}

/**
 * Quizfragen (1–10) eines Moduls. Erklärungen und Ton (Audiodatei als Frage) gibt es nur im
 * Modul 'quiz' ($withExplanation), beim AR-Rundumblick werden sie auf null gesetzt.
 */
function parseStationQuestions(array $src, string $prefix, bool $withExplanation): array {
    $questions = [];
    foreach (stationModuleList($src, 'questions', 1, STATION_MAX_MODULE_QUESTIONS, $prefix, 'Fragen') as $i => $question) {
        $label = "$prefix: Frage " . ($i + 1);
        $parsed = parseQuizQuestion($question, $label);
        $parsed['image'] = stationModuleMediaValue($question, 'image', $label);
        $parsed['audio'] = $withExplanation ? stationModuleMediaValue($question, 'audio', $label) : null;
        if (!$withExplanation) {
            $parsed['explanation_de'] = null;
            $parsed['explanation_en'] = null;
        }
        $questions[] = $parsed;
    }
    return $questions;
}

/**
 * Alle gültigen Dateinamen, die irgendwo im gespeicherten Modul-JSON stehen.
 */
function stationModuleMediaNames(?string $modulesJson): array {
    $decoded = json_decode($modulesJson ?? '', true);
    if (!is_array($decoded)) {
        return [];
    }
    $names = [];
    array_walk_recursive($decoded, function ($value) use (&$names) {
        if (isValidStationImageName($value)) {
            $names[] = $value;
        }
    });
    return array_values(array_unique($names));
}
