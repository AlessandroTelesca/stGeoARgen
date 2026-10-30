<?php
/**
 * admin_save_station.php – Legt eine Custom-Station an oder aktualisiert sie (nur Admin)
 *
 * POST (multipart/form-data):
 *   station  – JSON:
 *     { id?, path_id, title_de, title_en?, description_de, description_en?,
 *       long_description_de, long_description_en?, points, latitude, longitude,
 *       published: bool (Standard false = Entwurf),
 *       cover_image: vorhandener Dateiname | "new" (Datei im Feld "cover"),
 *       modules: [...] }   – 1 bis 12 Module in Abspielreihenfolge, Format und Grenzen siehe
 *                            src/stationModules/types.ts (Prüfung: api/station_modules_lib.php).
 *                            Medienfelder (Bilder, Audio): vorhandener Dateiname dieser Station
 *                            | "new:N" (N-te Datei aus "files[]")
 *   cover    – neues Profilbild (JPG/PNG/WebP)
 *   files[]  – neue Bilder und Audiodateien (MP3/M4A) der Module; jede Datei muss genau einmal referenziert werden
 *
 * Die älteren Spalten (station_type, slides, panorama_image, quiz_* …) werden neutral gesetzt;
 * station_type = 'panorama_quiz', wenn ein ar_panorama-Modul vorkommt, sonst 'image_sequence'.
 * Neue Stationen (und in einen anderen Pfad verschobene) landen am Ende der Stationsreihenfolge ihres Pfads.
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
    sendResponse(['success' => false, 'message' => 'Upload ist zu groß. Bitte weniger oder kleinere Dateien verwenden.'], 413);
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

// Entwurf (false) oder veröffentlicht (true); fehlt der Wert → Entwurf
$published = false;
if (isset($input['published'])) {
    $published = filter_var($input['published'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
    if ($published === null) {
        fail('Ungültiger Wert für „Veröffentlicht“.');
    }
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

// Module; jede hochgeladene Datei muss von genau einem Medienfeld referenziert werden
$newFileCount = count(uploadedFiles('files'));
$parsed = parseStationModules($input['modules'] ?? null, $newFileCount);
$modules = $parsed['modules'];
$newFiles = $parsed['newFiles'];
if (count($newFiles) !== $newFileCount) {
    fail('Nicht zugeordnete Dateien hochgeladen.');
}
$hasPanorama = in_array('ar_panorama', array_column($modules, 'type'), true);

try {
    $db = getDB();

    // Custom-Stationen nur in Pfaden aus der Stationsverwaltung (nicht im AR-Pfad)
    $stmt = $db->prepare('SELECT 1 FROM custom_paths WHERE id = ?');
    $stmt->execute([$pathId]);
    if (!$stmt->fetch()) {
        fail('Bitte einen Themenpfad aus der Stationsverwaltung wählen.');
    }

    $previousImages = [];
    $previousPathId = null;
    if ($id !== null) {
        $stmt = $db->prepare('SELECT * FROM custom_stations WHERE id = ?');
        $stmt->execute([$id]);
        $existing = $stmt->fetch();
        if (!$existing) {
            sendResponse(['success' => false, 'message' => 'Station nicht gefunden.'], 404);
        }
        $previousImages = stationImageFiles($existing);
        $previousPathId = $existing['path_id'];
    }
} catch (Throwable $e) {
    error_log('admin_save_station.php (Prüfung): ' . $e->getMessage());
    sendResponse(['success' => false, 'message' => 'Station konnte nicht gespeichert werden.'], 500);
}

// Vorhandene Dateien dürfen nur aus dieser Station stammen (das Profilbild muss ein Bild sein)
if ($coverRef !== 'new' && stationFileKind($coverRef) !== 'image') {
    fail('Ungültige Bildreferenz.');
}
$keptImages = array_filter(
    array_merge([$coverRef], stationModuleMediaNames(json_encode($modules, JSON_UNESCAPED_UNICODE))),
    fn($ref) => $ref !== 'new'
);
foreach ($keptImages as $filename) {
    if (!in_array($filename, $previousImages, true)) {
        fail('Ungültige Bildreferenz.');
    }
}

// $newFiles ist durch die Prüfung oben lückenlos 0..N-1 belegt
ksort($newFiles);
$stored = storeUploads([
    'cover' => $coverRef === 'new' ? ['image'] : [],
    'files' => array_values($newFiles),
]);
$newImages = array_merge($stored['cover'], $stored['files']);

$coverImage = $coverRef === 'new' ? $stored['cover'][0] : $coverRef;
$modules = resolveStationModuleMedia($modules, $stored['files']);
$modulesJson = json_encode($modules, JSON_UNESCAPED_UNICODE);

try {
    // Neue Station bzw. Wechsel in einen anderen Pfad: ans Ende der Stationsreihenfolge des Zielpfads
    $sortOrder = null;
    if ($id === null || $previousPathId !== $pathId) {
        $stmt = $db->prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 FROM custom_stations WHERE path_id = ?');
        $stmt->execute([$pathId]);
        $sortOrder = (int) $stmt->fetchColumn();
    }

    $params = [
        ':path_id' => $pathId,
        ':title_de' => $titleDe,
        ':title_en' => $titleEn,
        ':description_de' => $descriptionDe,
        ':description_en' => $descriptionEn,
        ':long_description_de' => $longDescriptionDe,
        ':long_description_en' => $longDescriptionEn,
        ':modules' => $modulesJson,
        ':published' => $published ? 1 : 0,
        ':sort_order' => $sortOrder,
        ':station_type' => $hasPanorama ? 'panorama_quiz' : 'image_sequence',
        ':cover_image' => $coverImage,
        ':points' => $points,
        ':latitude' => $latitude,
        ':longitude' => $longitude,
    ];

    // Ältere Spalten neutral: die Module sind die Quelle der Wahrheit
    if ($id === null) {
        $db->prepare(
            "INSERT INTO custom_stations
               (path_id, title_de, title_en, description_de, description_en, long_description_de, long_description_en,
                modules, published, sort_order,
                station_type, cover_image, slides, panorama_image, live_camera, quiz_questions,
                points, latitude, longitude, quiz_question_de, quiz_question_en, quiz_options_de, quiz_options_en, quiz_correct_answer)
             VALUES
               (:path_id, :title_de, :title_en, :description_de, :description_en, :long_description_de, :long_description_en,
                :modules, :published, :sort_order,
                :station_type, :cover_image, '[]', NULL, 0, NULL,
                :points, :latitude, :longitude, NULL, NULL, NULL, NULL, NULL)"
        )->execute($params);
        $id = (int) $db->lastInsertId();
    } else {
        $db->prepare(
            "UPDATE custom_stations SET
               path_id = :path_id, title_de = :title_de, title_en = :title_en,
               description_de = :description_de, description_en = :description_en,
               long_description_de = :long_description_de, long_description_en = :long_description_en,
               modules = :modules, published = :published, sort_order = COALESCE(:sort_order, sort_order),
               station_type = :station_type, cover_image = :cover_image, slides = '[]',
               panorama_image = NULL, live_camera = 0, quiz_questions = NULL,
               points = :points, latitude = :latitude, longitude = :longitude,
               quiz_question_de = NULL, quiz_question_en = NULL,
               quiz_options_de = NULL, quiz_options_en = NULL,
               quiz_correct_answer = NULL
             WHERE id = :id"
        )->execute($params + [':id' => $id]);

        $nowUsed = array_merge([$coverImage], stationModuleMediaNames($modulesJson));
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
