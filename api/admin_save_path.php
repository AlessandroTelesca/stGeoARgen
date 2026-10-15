<?php
/**
 * admin_save_path.php – Legt einen Themenpfad an oder aktualisiert ihn (nur Admin)
 *
 * POST (multipart/form-data):
 *   path  – JSON:
 *     { id?, title_de, title_en?, description_de, description_en?, difficulty, estimated_time,
 *       cover_image: vorhandener Dateiname | "new" (Datei im Feld "cover") | null (kein Bild) }
 *   cover – neues Pfadbild (JPG/PNG/WebP), nur bei cover_image = "new"
 *
 * Ohne id wird ein neuer Pfad angelegt; die ID wird aus title_de erzeugt und ändert sich danach nie
 * (Fortschritt und Stationen verweisen darauf). Der AR-Pfad ist nicht bearbeitbar.
 *
 * Response: { success, message, path }
 */

require_once __DIR__ . '/custom_stations_lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Nur POST erlaubt.'], 405);
}

requireAdmin();

if (empty($_POST) && empty($_FILES) && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
    sendResponse(['success' => false, 'message' => 'Upload ist zu groß. Bitte ein kleineres Bild verwenden.'], 413);
}

$input = json_decode($_POST['path'] ?? '', true);
if (!is_array($input)) {
    fail('Ungültige Pfaddaten.');
}

$id = isset($input['id']) && $input['id'] !== null ? trim((string) $input['id']) : null;
if ($id !== null && (in_array($id, BUILTIN_PATH_IDS, true) || !preg_match('/^[a-z0-9-]{1,100}$/', $id))) {
    fail('Dieser Pfad kann nicht bearbeitet werden.');
}

$titleDe = requiredText($input, 'title_de', 150, 'Pfadname (DE)');
$titleEn = optionalText($input, 'title_en', 150, 'Pfadname (EN)');
$descriptionDe = requiredText($input, 'description_de', 500, 'Beschreibung (DE)');
$descriptionEn = optionalText($input, 'description_en', 500, 'Beschreibung (EN)');
$estimatedTime = optionalText($input, 'estimated_time', 50, 'Dauer') ?? '';

$difficulty = (string) ($input['difficulty'] ?? '');
if (!in_array($difficulty, PATH_DIFFICULTIES, true)) {
    fail('Ungültige Schwierigkeit.');
}

$coverRef = $input['cover_image'] ?? null;
$coverRef = $coverRef === null || $coverRef === '' ? null : (string) $coverRef;
$newCoverCount = count(uploadedFiles('cover'));
if ($newCoverCount > 1 || ($coverRef === 'new') !== ($newCoverCount === 1)) {
    fail('Ungültiges Pfadbild.');
}

$isNew = $id === null;

try {
    $db = getDB();

    $previousCover = null;
    if ($id !== null) {
        $stmt = $db->prepare('SELECT cover_image FROM custom_paths WHERE id = ?');
        $stmt->execute([$id]);
        $existing = $stmt->fetch();
        if (!$existing) {
            sendResponse(['success' => false, 'message' => 'Pfad nicht gefunden.'], 404);
        }
        $previousCover = isValidStationImageName($existing['cover_image']) ? $existing['cover_image'] : null;
    } else {
        // Eindeutige ID aus dem Namen. Auch IDs mit Einträgen in user_progress sind tabu: ein gelöschter
        // Pfad gleichen Namens hätte dort noch z. B. den vergebenen Pfad-Bonus, der sonst für den neuen gälte.
        $base = pathSlug($titleDe);
        $taken = $db->prepare(
            'SELECT (SELECT COUNT(*) FROM custom_paths WHERE id = :a) + (SELECT COUNT(*) FROM user_progress WHERE path_id = :b)'
        );
        for ($n = 1; ; $n++) {
            $candidate = $n === 1 ? $base : "$base-$n";
            if (in_array($candidate, BUILTIN_PATH_IDS, true)) {
                continue;
            }
            $taken->execute([':a' => $candidate, ':b' => $candidate]);
            if ((int) $taken->fetchColumn() === 0) {
                break;
            }
        }
        $id = $candidate;
    }
} catch (Throwable $e) {
    error_log('admin_save_path.php (Prüfung): ' . $e->getMessage());
    sendResponse(['success' => false, 'message' => 'Pfad konnte nicht gespeichert werden.'], 500);
}

// Vorhandenes Bild darf nur das bisherige Bild dieses Pfads sein
if ($coverRef !== null && $coverRef !== 'new' && $coverRef !== $previousCover) {
    fail('Ungültige Bildreferenz.');
}

$stored = storeUploadedImages(['cover']);
$coverImage = $coverRef === 'new' ? $stored['cover'][0] : $coverRef;

$params = [
    ':id' => $id,
    ':title_de' => $titleDe,
    ':title_en' => $titleEn,
    ':description_de' => $descriptionDe,
    ':description_en' => $descriptionEn,
    ':difficulty' => $difficulty,
    ':estimated_time' => $estimatedTime,
    ':cover_image' => $coverImage,
];

try {
    if ($isNew) {
        $db->prepare(
            'INSERT INTO custom_paths (id, title_de, title_en, description_de, description_en, difficulty, estimated_time, cover_image)
             VALUES (:id, :title_de, :title_en, :description_de, :description_en, :difficulty, :estimated_time, :cover_image)'
        )->execute($params);
    } else {
        $db->prepare(
            'UPDATE custom_paths SET title_de = :title_de, title_en = :title_en, description_de = :description_de,
               description_en = :description_en, difficulty = :difficulty, estimated_time = :estimated_time,
               cover_image = :cover_image
             WHERE id = :id'
        )->execute($params);
    }

    if ($previousCover !== null && $previousCover !== $coverImage) {
        deleteStationImages([$previousCover]);
    }

    $stmt = $db->prepare('SELECT * FROM custom_paths WHERE id = ?');
    $stmt->execute([$id]);

    sendResponse([
        'success' => true,
        'message' => 'Pfad gespeichert.',
        'path' => formatPathRow($stmt->fetch()),
    ]);
} catch (Throwable $e) {
    error_log('admin_save_path.php (Speichern): ' . $e->getMessage());
    deleteStationImages($stored['cover']);
    sendResponse(['success' => false, 'message' => 'Pfad konnte nicht gespeichert werden.'], 500);
}
