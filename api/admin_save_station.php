<?php
/**
 * admin_save_station.php – Legt eine Custom-Station an oder aktualisiert sie (nur Admin)
 *
 * POST (multipart/form-data):
 *   station  – JSON:
 *     { id?, path_id, title_de, title_en?, description_de, description_en?,
 *       long_description_de, long_description_en?, points, latitude, longitude,
 *       cover_image: vorhandener Dateiname | "new" (Datei im Feld "cover"),
 *       slides: [{ image: vorhandener Dateiname | "new:N" (N-te Datei aus "slide_images[]"),
 *                  text_de, text_en? }]   – 1 bis 10 Bilder der Bildfolge, Reihenfolge zählt
 *       quiz: null | { question_de, question_en?, options_de: [], options_en?: [], correct_answer } }
 *   cover          – neues Profilbild (JPG/PNG/WebP)
 *   slide_images[] – neue Bilder der Bildfolge; jede Datei muss genau einmal referenziert werden
 *
 * Response: { success, message, station }
 */

require_once __DIR__ . '/custom_stations_lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Nur POST erlaubt.'], 405);
}

requireAdmin();

// Überschreitet der Request post_max_size, verwirft PHP $_POST und $_FILES komplett.
if (empty($_POST) && empty($_FILES) && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
    sendResponse(['success' => false, 'message' => 'Upload ist zu groß. Bitte weniger oder kleinere Bilder verwenden.'], 413);
}

$input = json_decode($_POST['station'] ?? '', true);
if (!is_array($input)) {
    sendResponse(['success' => false, 'message' => 'Ungültige Stationsdaten.'], 400);
}

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

$id = isset($input['id']) ? filter_var($input['id'], FILTER_VALIDATE_INT) : null;
if ($id === false || ($id !== null && $id <= 0)) {
    fail('Ungültige Stations-ID.');
}

$pathId = trim((string) ($input['path_id'] ?? ''));
if (!preg_match('/^[a-z0-9_-]{1,100}$/', $pathId)) {
    fail('Ungültiger Pfad.');
}

$titleDe = requiredText($input, 'title_de', 150, 'Stationsname (DE)');
$titleEn = optionalText($input, 'title_en', 150, 'Stationsname (EN)');
$descriptionDe = requiredText($input, 'description_de', 255, 'Kurzbeschreibung (DE)');
$descriptionEn = optionalText($input, 'description_en', 255, 'Kurzbeschreibung (EN)');
$longDescriptionDe = requiredText($input, 'long_description_de', 20000, 'Beschreibung (DE)');
$longDescriptionEn = optionalText($input, 'long_description_en', 20000, 'Beschreibung (EN)');

$points = filter_var($input['points'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0, 'max_range' => 1000]]);
if ($points === false) {
    fail('Punkte müssen zwischen 0 und 1000 liegen.');
}

$latitude = filter_var($input['latitude'] ?? null, FILTER_VALIDATE_FLOAT);
$longitude = filter_var($input['longitude'] ?? null, FILTER_VALIDATE_FLOAT);
if ($latitude === false || $latitude < -90 || $latitude > 90 || $longitude === false || $longitude < -180 || $longitude > 180) {
    fail('Ungültige Koordinaten.');
}

// Quiz (optional)
$quizQuestionDe = $quizQuestionEn = $quizOptionsDe = $quizOptionsEn = $quizCorrect = null;
if (isset($input['quiz']) && $input['quiz'] !== null) {
    $quiz = $input['quiz'];
    if (!is_array($quiz)) {
        fail('Ungültiges Quiz.');
    }
    $quizQuestionDe = requiredText($quiz, 'question_de', 255, 'Quizfrage (DE)');
    $quizQuestionEn = optionalText($quiz, 'question_en', 255, 'Quizfrage (EN)');

    $optionsDe = $quiz['options_de'] ?? null;
    if (!is_array($optionsDe) || count($optionsDe) < 2 || count($optionsDe) > 6) {
        fail('Das Quiz braucht 2 bis 6 Antwortoptionen.');
    }
    $optionsDe = array_map(fn($o) => trim((string) $o), array_values($optionsDe));
    if (in_array('', $optionsDe, true)) {
        fail('Alle Antwortoptionen (DE) müssen ausgefüllt sein.');
    }

    $optionsEn = $quiz['options_en'] ?? null;
    if (is_array($optionsEn)) {
        $optionsEn = array_map(fn($o) => trim((string) $o), array_values($optionsEn));
        if (count(array_filter($optionsEn, fn($o) => $o !== '')) === 0) {
            $optionsEn = null;
        } elseif (count($optionsEn) !== count($optionsDe) || in_array('', $optionsEn, true)) {
            fail('Englische Antwortoptionen müssen entweder alle oder gar nicht ausgefüllt sein.');
        }
    } else {
        $optionsEn = null;
    }

    $quizCorrect = filter_var($quiz['correct_answer'] ?? null, FILTER_VALIDATE_INT);
    if ($quizCorrect === false || $quizCorrect < 0 || $quizCorrect >= count($optionsDe)) {
        fail('Bitte die richtige Antwort markieren.');
    }

    $quizOptionsDe = json_encode($optionsDe, JSON_UNESCAPED_UNICODE);
    $quizOptionsEn = $optionsEn !== null ? json_encode($optionsEn, JSON_UNESCAPED_UNICODE) : null;
}

// Profilbild
$coverRef = (string) ($input['cover_image'] ?? '');
$newCoverCount = count(uploadedFiles('cover'));
if ($newCoverCount > 1) {
    fail('Nur ein Profilbild erlaubt.');
}
if ($coverRef === 'new' ? $newCoverCount !== 1 : ($coverRef === '' || $newCoverCount !== 0)) {
    fail('Bitte ein Profilbild auswählen.');
}

// Bildfolge
$slidesInput = $input['slides'] ?? null;
if (!is_array($slidesInput) || count($slidesInput) < 1) {
    fail('Die Bildfolge braucht mindestens ein Bild.');
}
if (count($slidesInput) > STATION_MAX_SLIDES) {
    fail('Maximal ' . STATION_MAX_SLIDES . ' Bilder in der Bildfolge.');
}

$newSlideCount = count(uploadedFiles('slide_images'));
$usedNewSlides = [];
$slides = [];
foreach (array_values($slidesInput) as $index => $slide) {
    $number = $index + 1;
    if (!is_array($slide)) {
        fail('Ungültige Bildfolge.');
    }
    $imageRef = (string) ($slide['image'] ?? '');
    if (preg_match('/^new:(\d+)$/', $imageRef, $m)) {
        $newIndex = (int) $m[1];
        if ($newIndex >= $newSlideCount || isset($usedNewSlides[$newIndex])) {
            fail('Ungültige Bildreferenz.');
        }
        $usedNewSlides[$newIndex] = true;
    } elseif (!isValidStationImageName($imageRef)) {
        fail('Ungültige Bildreferenz.');
    }
    $slides[] = [
        'image' => $imageRef,
        'text_de' => requiredText($slide, 'text_de', 1000, "Text zu Bild $number (DE)"),
        'text_en' => optionalText($slide, 'text_en', 1000, "Text zu Bild $number (EN)"),
    ];
}
if (count($usedNewSlides) !== $newSlideCount) {
    fail('Nicht zugeordnete Bilder hochgeladen.');
}

try {
    $db = getDB();

    $previousImages = [];
    if ($id !== null) {
        $stmt = $db->prepare('SELECT cover_image, slides FROM custom_stations WHERE id = ?');
        $stmt->execute([$id]);
        $existing = $stmt->fetch();
        if (!$existing) {
            sendResponse(['success' => false, 'message' => 'Station nicht gefunden.'], 404);
        }
        $previousImages = stationImageFiles($existing);
    }
} catch (Throwable $e) {
    error_log('admin_save_station.php (Prüfung): ' . $e->getMessage());
    sendResponse(['success' => false, 'message' => 'Station konnte nicht gespeichert werden.'], 500);
}

// Vorhandene Bilder dürfen nur aus dieser Station stammen
$keptImages = array_filter(
    array_merge([$coverRef], array_column($slides, 'image')),
    fn($ref) => $ref !== 'new' && !str_starts_with($ref, 'new:')
);
foreach ($keptImages as $filename) {
    if (!in_array($filename, $previousImages, true)) {
        fail('Ungültige Bildreferenz.');
    }
}

$stored = storeUploadedImages(['cover', 'slide_images']);
$newImages = array_merge($stored['cover'], $stored['slide_images']);

$coverImage = $coverRef === 'new' ? $stored['cover'][0] : $coverRef;
foreach ($slides as &$slide) {
    if (preg_match('/^new:(\d+)$/', $slide['image'], $m)) {
        $slide['image'] = $stored['slide_images'][(int) $m[1]];
    }
}
unset($slide);

$params = [
    ':path_id' => $pathId,
    ':title_de' => $titleDe,
    ':title_en' => $titleEn,
    ':description_de' => $descriptionDe,
    ':description_en' => $descriptionEn,
    ':long_description_de' => $longDescriptionDe,
    ':long_description_en' => $longDescriptionEn,
    ':cover_image' => $coverImage,
    ':slides' => json_encode($slides, JSON_UNESCAPED_UNICODE),
    ':points' => $points,
    ':latitude' => $latitude,
    ':longitude' => $longitude,
    ':quiz_question_de' => $quizQuestionDe,
    ':quiz_question_en' => $quizQuestionEn,
    ':quiz_options_de' => $quizOptionsDe,
    ':quiz_options_en' => $quizOptionsEn,
    ':quiz_correct_answer' => $quizCorrect,
];

try {
    if ($id === null) {
        $db->prepare(
            'INSERT INTO custom_stations
               (path_id, title_de, title_en, description_de, description_en, long_description_de, long_description_en,
                cover_image, slides, points, latitude, longitude, quiz_question_de, quiz_question_en, quiz_options_de, quiz_options_en, quiz_correct_answer)
             VALUES
               (:path_id, :title_de, :title_en, :description_de, :description_en, :long_description_de, :long_description_en,
                :cover_image, :slides, :points, :latitude, :longitude, :quiz_question_de, :quiz_question_en, :quiz_options_de, :quiz_options_en, :quiz_correct_answer)'
        )->execute($params);
        $id = (int) $db->lastInsertId();
    } else {
        $db->prepare(
            'UPDATE custom_stations SET
               path_id = :path_id, title_de = :title_de, title_en = :title_en,
               description_de = :description_de, description_en = :description_en,
               long_description_de = :long_description_de, long_description_en = :long_description_en,
               cover_image = :cover_image, slides = :slides,
               points = :points, latitude = :latitude, longitude = :longitude,
               quiz_question_de = :quiz_question_de, quiz_question_en = :quiz_question_en,
               quiz_options_de = :quiz_options_de, quiz_options_en = :quiz_options_en,
               quiz_correct_answer = :quiz_correct_answer
             WHERE id = :id'
        )->execute($params + [':id' => $id]);

        $nowUsed = array_merge([$coverImage], array_column($slides, 'image'));
        deleteStationImages(array_diff($previousImages, $nowUsed));
    }

    $stmt = $db->prepare('SELECT * FROM custom_stations WHERE id = ?');
    $stmt->execute([$id]);

    sendResponse([
        'success' => true,
        'message' => 'Station gespeichert.',
        'station' => formatStationRow($stmt->fetch()),
    ]);
} catch (Throwable $e) {
    error_log('admin_save_station.php (Speichern): ' . $e->getMessage());
    deleteStationImages($newImages);
    sendResponse(['success' => false, 'message' => 'Station konnte nicht gespeichert werden.'], 500);
}
