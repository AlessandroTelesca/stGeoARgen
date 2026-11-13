<?php
/**
 * Gemeinsame Helfer für die über die Stationsverwaltung angelegten Stationen und Pfade
 * (Tabellen custom_stations / custom_paths, Bilder und Audiodateien in api/uploads/stations/).
 */

require_once __DIR__ . '/config.php';
// Modul-Validierung (benutzt fail(), requiredText() usw. aus dieser Datei erst zur Laufzeit –
// station_modules_lib.php bindet deshalb nichts ein und wird nur über diese Datei geladen)
require_once __DIR__ . '/station_modules_lib.php';

const STATION_UPLOAD_DIR = __DIR__ . '/uploads/stations';
// 360°-Stationen: 10 feste Plätze rund um die Kamera, einer davon fürs Quiz (CustomPanoramaQuizView.tsx)
const STATION_MAX_PANORAMA_SLIDES = 9;
const STATION_MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const STATION_MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const STATION_IMAGE_TYPES = [
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/webp' => 'webp',
];
// video/mp4 nur, weil libmagic (finfo) M4A-Dateien oft so erkennt
const STATION_AUDIO_TYPES = [
    'audio/mpeg'  => 'mp3',
    'audio/mp3'   => 'mp3',
    'audio/mp4'   => 'm4a',
    'audio/x-m4a' => 'm4a',
    'audio/m4a'   => 'm4a',
    'video/mp4'   => 'm4a',
];
const PATH_DIFFICULTIES = ['Einfach', 'Mittel', 'Schwer'];
/** image_sequence: Bildfolge mit Texten (+ optionales Quiz); panorama_quiz: 360°-Bild mit Quiz (GyroARVisualizer) */
const STATION_TYPES = ['image_sequence', 'panorama_quiz'];
/** Fest im Frontend eingebaute Pfade – dürfen nicht als Custom-Pfad angelegt werden */
const BUILTIN_PATH_IDS = ['tourist'];

/** Bricht mit 400 und der Meldung ab. */
function fail(string $message): void {
    sendResponse(['success' => false, 'message' => $message], 400);
}

/** Pflichttext (nicht leer) mit Maximallänge. */
function requiredText(array $input, string $key, int $maxLength, string $label): string {
    $value = trim((string) ($input[$key] ?? ''));
    if ($value === '') {
        fail("$label fehlt.");
    }
    if (mb_strlen($value) > $maxLength) {
        fail("$label ist zu lang (max. $maxLength Zeichen).");
    }
    return $value;
}

/** Optionaler Text; leer → null. */
function optionalText(array $input, string $key, int $maxLength, string $label): ?string {
    $value = trim((string) ($input[$key] ?? ''));
    if ($value === '') {
        return null;
    }
    if (mb_strlen($value) > $maxLength) {
        fail("$label ist zu lang (max. $maxLength Zeichen).");
    }
    return $value;
}

/**
 * Wandelt eine custom_paths-Zeile in das API-Format um.
 */
function formatPathRow(array $row): array {
    return [
        'id' => $row['id'],
        'title_de' => $row['title_de'],
        'title_en' => $row['title_en'],
        'description_de' => $row['description_de'],
        'description_en' => $row['description_en'],
        'difficulty' => $row['difficulty'],
        'estimated_time' => $row['estimated_time'],
        'cover_image' => isValidStationImageName($row['cover_image']) ? $row['cover_image'] : null,
        'published' => (bool) ($row['published'] ?? 1),
        'sort_order' => (int) ($row['sort_order'] ?? 0),
        'created_at' => $row['created_at'],
        'updated_at' => $row['updated_at'],
    ];
}

/**
 * Erzeugt aus einem Namen eine Pfad-ID (z. B. „Alte Mühlen“ → „alte-muehlen“).
 */
function pathSlug(string $title): string {
    $slug = mb_strtolower($title);
    $slug = strtr($slug, ['ä' => 'ae', 'ö' => 'oe', 'ü' => 'ue', 'ß' => 'ss']);
    $slug = preg_replace('/[^a-z0-9]+/', '-', $slug);
    $slug = trim(substr(trim($slug, '-'), 0, 80), '-');
    return $slug === '' ? 'pfad' : $slug;
}

/**
 * Bildfolge einer Station aus der DB-Spalte `slides`: [{ image, text_de, text_en }].
 */
function decodeStationSlides(?string $json): array {
    $slides = json_decode($json ?? '', true);
    if (!is_array($slides)) {
        return [];
    }
    $result = [];
    foreach ($slides as $slide) {
        if (is_array($slide) && isValidStationImageName($slide['image'] ?? null)) {
            $result[] = [
                'image' => $slide['image'],
                'text_de' => (string) ($slide['text_de'] ?? ''),
                'text_en' => isset($slide['text_en']) && $slide['text_en'] !== '' ? (string) $slide['text_en'] : null,
            ];
        }
    }
    return $result;
}

/**
 * Alle Dateien einer Station (Profilbild, Bilder der Bildfolge, 360°-Bild, Bilder der Quizfragen
 * der älteren Spalten sowie alle Medien aus den Modulen).
 */
function stationImageFiles(array $row): array {
    $files = array_column(decodeStationSlides($row['slides'] ?? null), 'image');
    $questionImages = array_column(decodeQuizQuestions($row['quiz_questions'] ?? null), 'image');
    foreach ([$row['cover_image'], $row['panorama_image'] ?? null, ...$questionImages] as $file) {
        if (isValidStationImageName($file)) {
            $files[] = $file;
        }
    }
    $files = array_merge($files, stationModuleMediaNames($row['modules'] ?? null));
    return array_values(array_unique($files));
}

/**
 * Prüft eine Quizfrage aus der Anfrage; bricht bei Fehlern mit 400 ab.
 * $label benennt die Frage in Fehlermeldungen (z. B. „Quizfrage 2“).
 * Rückgabe: { question_de, question_en, options_de, options_en, correct_answer, explanation_de, explanation_en }
 * (das Bild der Frage prüft der Aufrufer)
 */
function parseQuizQuestion($quiz, string $label): array {
    if (!is_array($quiz)) {
        fail("$label ist ungültig.");
    }
    $questionDe = requiredText($quiz, 'question_de', 255, "$label (DE)");
    $questionEn = optionalText($quiz, 'question_en', 255, "$label (EN)");

    $optionsDe = $quiz['options_de'] ?? null;
    if (!is_array($optionsDe) || count($optionsDe) < 2 || count($optionsDe) > 6) {
        fail("$label braucht 2 bis 6 Antwortoptionen.");
    }
    $optionsDe = array_map(fn($o) => trim((string) $o), array_values($optionsDe));
    if (in_array('', $optionsDe, true)) {
        fail("$label: Alle Antwortoptionen (DE) müssen ausgefüllt sein.");
    }

    $optionsEn = $quiz['options_en'] ?? null;
    if (is_array($optionsEn)) {
        $optionsEn = array_map(fn($o) => trim((string) $o), array_values($optionsEn));
        if (count(array_filter($optionsEn, fn($o) => $o !== '')) === 0) {
            $optionsEn = null;
        } elseif (count($optionsEn) !== count($optionsDe) || in_array('', $optionsEn, true)) {
            fail("$label: Englische Antwortoptionen müssen entweder alle oder gar nicht ausgefüllt sein.");
        }
    } else {
        $optionsEn = null;
    }

    $correct = filter_var($quiz['correct_answer'] ?? null, FILTER_VALIDATE_INT);
    if ($correct === false || $correct < 0 || $correct >= count($optionsDe)) {
        fail("$label: Bitte die richtige Antwort markieren.");
    }

    return [
        'question_de' => $questionDe,
        'question_en' => $questionEn,
        'options_de' => $optionsDe,
        'options_en' => $optionsEn,
        'correct_answer' => $correct,
        'explanation_de' => optionalText($quiz, 'explanation_de', 1000, "$label: Erklärung (DE)"),
        'explanation_en' => optionalText($quiz, 'explanation_en', 1000, "$label: Erklärung (EN)"),
    ];
}

/**
 * Quizfragen einer 360°-Station aus der DB-Spalte `quiz_questions`.
 */
function decodeQuizQuestions(?string $json): array {
    $questions = json_decode($json ?? '', true);
    if (!is_array($questions)) {
        return [];
    }
    $result = [];
    foreach ($questions as $q) {
        if (!is_array($q) || !is_array($q['options_de'] ?? null)) {
            continue;
        }
        $result[] = [
            'question_de' => (string) ($q['question_de'] ?? ''),
            'question_en' => isset($q['question_en']) && $q['question_en'] !== '' ? (string) $q['question_en'] : null,
            'options_de' => array_values(array_map('strval', $q['options_de'])),
            'options_en' => is_array($q['options_en'] ?? null) ? array_values(array_map('strval', $q['options_en'])) : null,
            'correct_answer' => (int) ($q['correct_answer'] ?? 0),
            'image' => isValidStationImageName($q['image'] ?? null) ? $q['image'] : null,
        ];
    }
    return $result;
}

/**
 * Wandelt eine DB-Zeile in das API-Format um.
 */
function formatStationRow(array $row): array {
    $quiz = null;
    if ($row['quiz_question_de'] !== null && $row['quiz_options_de'] !== null && $row['quiz_correct_answer'] !== null) {
        $quiz = [
            'question_de' => $row['quiz_question_de'],
            'question_en' => $row['quiz_question_en'],
            'options_de' => json_decode($row['quiz_options_de'], true) ?: [],
            'options_en' => $row['quiz_options_en'] !== null ? (json_decode($row['quiz_options_en'], true) ?: null) : null,
            'correct_answer' => (int) $row['quiz_correct_answer'],
        ];
    }

    // Module (JSON-Array, siehe src/stationModules/types.ts); null = ältere Station ohne Module
    $modules = json_decode($row['modules'] ?? '', true);
    if (!is_array($modules) || !array_is_list($modules)) {
        $modules = null;
    }

    return [
        'id' => (int) $row['id'],
        'path_id' => $row['path_id'],
        'title_de' => $row['title_de'],
        'title_en' => $row['title_en'],
        'description_de' => $row['description_de'],
        'description_en' => $row['description_en'],
        'long_description_de' => $row['long_description_de'],
        'long_description_en' => $row['long_description_en'],
        'station_type' => in_array($row['station_type'] ?? null, STATION_TYPES, true) ? $row['station_type'] : 'image_sequence',
        'cover_image' => $row['cover_image'],
        'color' => (isset($row['color']) && is_string($row['color']) && preg_match('/^#[0-9a-f]{6}$/i', $row['color'])) ? strtolower($row['color']) : null,
        'slides' => decodeStationSlides($row['slides']),
        'panorama_image' => isValidStationImageName($row['panorama_image'] ?? null) ? $row['panorama_image'] : null,
        'live_camera' => (bool) ($row['live_camera'] ?? false),
        'quiz_questions' => decodeQuizQuestions($row['quiz_questions'] ?? null),
        'points' => (int) $row['points'],
        'latitude' => (float) $row['latitude'],
        'longitude' => (float) $row['longitude'],
        'quiz' => $quiz,
        'modules' => $modules,
        'published' => (bool) ($row['published'] ?? 1),
        'sort_order' => (int) ($row['sort_order'] ?? 0),
        'created_at' => $row['created_at'],
        'updated_at' => $row['updated_at'],
    ];
}

/** Normalisiert $_FILES[$field] (einzeln oder Array) auf Listen; leere Slots fallen weg. */
function uploadedFiles(string $field): array {
    if (!isset($_FILES[$field])) {
        return [];
    }
    $files = $_FILES[$field];
    $names = (array) $files['name'];
    $result = [];
    foreach ($names as $i => $name) {
        $error = is_array($files['error']) ? $files['error'][$i] : $files['error'];
        if ($error === UPLOAD_ERR_NO_FILE) {
            continue;
        }
        $result[] = [
            'name' => (string) $name,
            'tmp_name' => is_array($files['tmp_name']) ? $files['tmp_name'][$i] : $files['tmp_name'],
            'error' => $error,
            'size' => is_array($files['size']) ? $files['size'][$i] : $files['size'],
        ];
    }
    return $result;
}

/**
 * Prüft und speichert die hochgeladenen Dateien der angegebenen Formularfelder.
 * $kindsByField: [feld => [Art je Datei in Upload-Reihenfolge: 'image' | 'audio']].
 * Bilder: finfo + getimagesize (JPG, PNG, WebP); Audio: nur Audio-MIME-Typen (MP3, M4A) und Größenlimit.
 * Gibt [feld => [neue Dateinamen in Upload-Reihenfolge]] zurück. Bei einem Fehler
 * werden alle in diesem Request gespeicherten Dateien gelöscht und mit 400 abgebrochen.
 */
function storeUploads(array $kindsByField): array {
    if (!is_dir(STATION_UPLOAD_DIR) && !mkdir(STATION_UPLOAD_DIR, 0755, true)) {
        sendResponse(['success' => false, 'message' => 'Upload-Verzeichnis konnte nicht angelegt werden.'], 500);
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $stored = array_fill_keys(array_keys($kindsByField), []);

    foreach ($kindsByField as $field => $kinds) {
        foreach (array_values(uploadedFiles($field)) as $index => $file) {
            $isAudio = ($kinds[$index] ?? 'image') === 'audio';
            $noun = $isAudio ? 'Audiodatei' : 'Bild';
            $originalName = $file['name'];
            $maxBytes = $isAudio ? STATION_MAX_AUDIO_BYTES : STATION_MAX_IMAGE_BYTES;
            $extension = null;
            $fail = null;
            if ($file['error'] === UPLOAD_ERR_INI_SIZE || $file['error'] === UPLOAD_ERR_FORM_SIZE || $file['size'] > $maxBytes) {
                $fail = "$noun \"$originalName\" ist zu groß.";
            } elseif ($file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) {
                $fail = "$noun \"$originalName\" konnte nicht hochgeladen werden.";
            } else {
                $mime = $finfo->file($file['tmp_name']);
                if ($isAudio) {
                    $extension = STATION_AUDIO_TYPES[$mime] ?? null;
                    if ($extension === null) {
                        $fail = "Audiodatei \"$originalName\" hat kein unterstütztes Format (MP3, M4A).";
                    }
                } else {
                    $extension = STATION_IMAGE_TYPES[$mime] ?? null;
                    if ($extension === null || @getimagesize($file['tmp_name']) === false) {
                        $fail = "Bild \"$originalName\" hat kein unterstütztes Format (JPG, PNG, WebP).";
                    }
                }
            }

            if ($fail === null) {
                $filename = bin2hex(random_bytes(16)) . '.' . $extension;
                if (move_uploaded_file($file['tmp_name'], STATION_UPLOAD_DIR . '/' . $filename)) {
                    $stored[$field][] = $filename;
                    continue;
                }
                $fail = "$noun \"$originalName\" konnte nicht gespeichert werden.";
            }

            deleteStationImages(array_merge(...array_values($stored)));
            sendResponse(['success' => false, 'message' => $fail], 400);
        }
    }

    return $stored;
}

/**
 * Wie storeUploads, aber alle Dateien der angegebenen Felder sind Bilder (z. B. das Profilbild im Feld "cover").
 * Gibt [feld => [neue Dateinamen in Upload-Reihenfolge]] zurück.
 */
function storeUploadedImages(array $fields): array {
    $kindsByField = [];
    foreach ($fields as $field) {
        $kindsByField[$field] = array_fill(0, count(uploadedFiles($field)), 'image');
    }
    return storeUploads($kindsByField);
}

/**
 * Löscht Bild- und Audiodateien aus dem Upload-Verzeichnis. Nur eigene, generierte
 * Dateinamen werden akzeptiert (kein Path-Traversal).
 */
function deleteStationImages(array $filenames): void {
    foreach ($filenames as $filename) {
        if (isValidStationImageName($filename)) {
            @unlink(STATION_UPLOAD_DIR . '/' . $filename);
        }
    }
}

/** Gültiger, selbst generierter Dateiname einer Bild- oder Audiodatei (Name bleibt aus Altlasten-Gründen). */
function isValidStationImageName($filename): bool {
    return is_string($filename) && preg_match('/^[a-f0-9]{32}\.(jpg|png|webp|mp3|m4a)$/', $filename) === 1;
}
