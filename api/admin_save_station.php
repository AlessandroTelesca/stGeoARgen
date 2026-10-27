<?php
/**
 * admin_save_station.php – Legt eine Custom-Station an oder aktualisiert sie (nur Admin)
 *
 * POST (multipart/form-data):
 *   station  – JSON:
 *     { id?, path_id, title_de, title_en?, description_de, description_en?,
 *       long_description_de, long_description_en?, points, latitude, longitude,
 *       station_type: "image_sequence" (Standard) | "panorama_quiz",
 *       cover_image: vorhandener Dateiname | "new" (Datei im Feld "cover"),
 *       slides: [{ image: vorhandener Dateiname | "new:N" (N-te Datei aus "slide_images[]"),
 *                  text_de, text_en? }]   – Bildfolge, Reihenfolge zählt; image_sequence: 1 bis 10,
 *                                          panorama_quiz: 0 bis 10 (wird vor dem Quiz gezeigt)
 *       – nur image_sequence:
 *       quiz: null | { question_de, question_en?, options_de: [], options_en?: [], correct_answer }
 *       – nur panorama_quiz:
 *       live_camera: bool (Standard false) – Live-Kamerabild statt 360°-Bild als Hintergrund
 *       panorama_image: null | vorhandener Dateiname | "new" (Datei im Feld "panorama") – 360°-Bild (equirektangular);
 *                       Pflicht, außer bei live_camera (dann optional, für späteres Zurückschalten)
 *       quiz_questions: [{ question_de, question_en?, options_de: [], options_en?: [], correct_answer,
 *                          image?: null | vorhandener Dateiname | "new:N" (N-te Datei aus "question_images[]") }] – 1 bis 10 }
 *   cover          – neues Profilbild (JPG/PNG/WebP)
 *   slide_images[] – neue Bilder der Bildfolge; jede Datei muss genau einmal referenziert werden
 *   panorama       – neues 360°-Bild
 *   question_images[] – neue Bilder der Quizfragen; jede Datei muss genau einmal referenziert werden
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

$stationType = (string) ($input['station_type'] ?? 'image_sequence');
if (!in_array($stationType, STATION_TYPES, true)) {
    fail('Ungültiger Stationstyp.');
}
$isPanorama = $stationType === 'panorama_quiz';

// Quiz (optional, nur Bildfolge-Stationen)
$quizQuestionDe = $quizQuestionEn = $quizOptionsDe = $quizOptionsEn = $quizCorrect = null;
if (!$isPanorama && isset($input['quiz']) && $input['quiz'] !== null) {
    $quiz = parseQuizQuestion($input['quiz'], 'Quizfrage');
    $quizQuestionDe = $quiz['question_de'];
    $quizQuestionEn = $quiz['question_en'];
    $quizCorrect = $quiz['correct_answer'];
    $quizOptionsDe = json_encode($quiz['options_de'], JSON_UNESCAPED_UNICODE);
    $quizOptionsEn = $quiz['options_en'] !== null ? json_encode($quiz['options_en'], JSON_UNESCAPED_UNICODE) : null;
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

// Bildfolge: Pflicht bei image_sequence, optional bei panorama_quiz
$slidesInput = $input['slides'] ?? ($isPanorama ? [] : null);
if (!is_array($slidesInput) || (!$isPanorama && count($slidesInput) < 1)) {
    fail('Die Bildfolge braucht mindestens ein Bild.');
}
$maxSlides = $isPanorama ? STATION_MAX_PANORAMA_SLIDES : STATION_MAX_SLIDES;
if (count($slidesInput) > $maxSlides) {
    fail('Maximal ' . $maxSlides . ' Bilder in der Bildfolge.');
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

// 360°-Bild + Quizfragen (nur panorama_quiz)
$panoramaRef = null;
$liveCamera = false;
$quizQuestions = null;
$newPanoramaCount = count(uploadedFiles('panorama'));
$newQuestionImageCount = count(uploadedFiles('question_images'));
$usedNewQuestionImages = [];
if ($isPanorama) {
    $liveCamera = filter_var($input['live_camera'] ?? false, FILTER_VALIDATE_BOOLEAN);
    $panoramaRef = isset($input['panorama_image']) && $input['panorama_image'] !== '' ? (string) $input['panorama_image'] : null;
    $panoramaValid = $panoramaRef === 'new' ? $newPanoramaCount === 1 : ($newPanoramaCount === 0 && ($panoramaRef !== null || $liveCamera));
    if (!$panoramaValid) {
        fail('Bitte ein 360°-Bild auswählen.');
    }

    $questionsInput = $input['quiz_questions'] ?? null;
    if (!is_array($questionsInput) || count($questionsInput) < 1) {
        fail('Das Quiz braucht mindestens eine Frage.');
    }
    if (count($questionsInput) > STATION_MAX_QUIZ_QUESTIONS) {
        fail('Maximal ' . STATION_MAX_QUIZ_QUESTIONS . ' Quizfragen.');
    }
    $quizQuestions = [];
    foreach (array_values($questionsInput) as $index => $question) {
        $parsed = parseQuizQuestion($question, 'Quizfrage ' . ($index + 1));
        // Optionales Bild zur Frage
        $imageRef = $question['image'] ?? null;
        $imageRef = $imageRef === null || $imageRef === '' ? null : (string) $imageRef;
        if ($imageRef !== null && preg_match('/^new:(\d+)$/', $imageRef, $m)) {
            $newIndex = (int) $m[1];
            if ($newIndex >= $newQuestionImageCount || isset($usedNewQuestionImages[$newIndex])) {
                fail('Ungültige Bildreferenz.');
            }
            $usedNewQuestionImages[$newIndex] = true;
        } elseif ($imageRef !== null && !isValidStationImageName($imageRef)) {
            fail('Ungültige Bildreferenz.');
        }
        $parsed['image'] = $imageRef;
        $quizQuestions[] = $parsed;
    }
}
if ((!$isPanorama && $newPanoramaCount > 0) || count($usedNewQuestionImages) !== $newQuestionImageCount) {
    fail('Nicht zugeordnete Bilder hochgeladen.');
}

try {
    $db = getDB();

    // Custom-Stationen nur in Pfaden aus der Stationsverwaltung (nicht im AR-Pfad)
    $stmt = $db->prepare('SELECT 1 FROM custom_paths WHERE id = ?');
    $stmt->execute([$pathId]);
    if (!$stmt->fetch()) {
        fail('Bitte einen Themenpfad aus der Stationsverwaltung wählen.');
    }

    $previousImages = [];
    if ($id !== null) {
        $stmt = $db->prepare('SELECT cover_image, slides, panorama_image, quiz_questions FROM custom_stations WHERE id = ?');
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
    array_merge([$coverRef, $panoramaRef], array_column($slides, 'image'), array_column($quizQuestions ?? [], 'image')),
    fn($ref) => $ref !== null && $ref !== 'new' && !str_starts_with($ref, 'new:')
);
foreach ($keptImages as $filename) {
    if (!in_array($filename, $previousImages, true)) {
        fail('Ungültige Bildreferenz.');
    }
}

$stored = storeUploadedImages(['cover', 'slide_images', 'panorama', 'question_images']);
$newImages = array_merge($stored['cover'], $stored['slide_images'], $stored['panorama'], $stored['question_images']);

$coverImage = $coverRef === 'new' ? $stored['cover'][0] : $coverRef;
$panoramaImage = $panoramaRef === 'new' ? $stored['panorama'][0] : $panoramaRef;
foreach ($slides as &$slide) {
    if (preg_match('/^new:(\d+)$/', $slide['image'], $m)) {
        $slide['image'] = $stored['slide_images'][(int) $m[1]];
    }
}
unset($slide);
if ($quizQuestions !== null) {
    foreach ($quizQuestions as &$question) {
        if ($question['image'] !== null && preg_match('/^new:(\d+)$/', $question['image'], $m)) {
            $question['image'] = $stored['question_images'][(int) $m[1]];
        }
    }
    unset($question);
}

$params = [
    ':path_id' => $pathId,
    ':title_de' => $titleDe,
    ':title_en' => $titleEn,
    ':description_de' => $descriptionDe,
    ':description_en' => $descriptionEn,
    ':long_description_de' => $longDescriptionDe,
    ':long_description_en' => $longDescriptionEn,
    ':station_type' => $stationType,
    ':cover_image' => $coverImage,
    ':slides' => json_encode($slides, JSON_UNESCAPED_UNICODE),
    ':panorama_image' => $panoramaImage,
    ':live_camera' => $liveCamera ? 1 : 0,
    ':quiz_questions' => $quizQuestions !== null ? json_encode($quizQuestions, JSON_UNESCAPED_UNICODE) : null,
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
                station_type, cover_image, slides, panorama_image, live_camera, quiz_questions,
                points, latitude, longitude, quiz_question_de, quiz_question_en, quiz_options_de, quiz_options_en, quiz_correct_answer)
             VALUES
               (:path_id, :title_de, :title_en, :description_de, :description_en, :long_description_de, :long_description_en,
                :station_type, :cover_image, :slides, :panorama_image, :live_camera, :quiz_questions,
                :points, :latitude, :longitude, :quiz_question_de, :quiz_question_en, :quiz_options_de, :quiz_options_en, :quiz_correct_answer)'
        )->execute($params);
        $id = (int) $db->lastInsertId();
    } else {
        $db->prepare(
            'UPDATE custom_stations SET
               path_id = :path_id, title_de = :title_de, title_en = :title_en,
               description_de = :description_de, description_en = :description_en,
               long_description_de = :long_description_de, long_description_en = :long_description_en,
               station_type = :station_type, cover_image = :cover_image, slides = :slides,
               panorama_image = :panorama_image, live_camera = :live_camera, quiz_questions = :quiz_questions,
               points = :points, latitude = :latitude, longitude = :longitude,
               quiz_question_de = :quiz_question_de, quiz_question_en = :quiz_question_en,
               quiz_options_de = :quiz_options_de, quiz_options_en = :quiz_options_en,
               quiz_correct_answer = :quiz_correct_answer
             WHERE id = :id'
        )->execute($params + [':id' => $id]);

        $nowUsed = array_merge([$coverImage, $panoramaImage], array_column($slides, 'image'), array_column($quizQuestions ?? [], 'image'));
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
