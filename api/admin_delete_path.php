<?php
/**
 * admin_delete_path.php – Löscht einen Themenpfad samt Pfadbild (nur Admin)
 *
 * POST (JSON body): { id }
 * Nur leere Pfade: solange Stationen darin liegen, antwortet der Server mit 409.
 * Der AR-Pfad ist nicht löschbar.
 *
 * Response: { success, message }
 */

require_once __DIR__ . '/custom_stations_lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Nur POST erlaubt.'], 405);
}

requireAdmin();

$body = json_decode(file_get_contents('php://input'), true);
$id = trim((string) ($body['id'] ?? ''));
if ($id === '' || in_array($id, BUILTIN_PATH_IDS, true)) {
    fail('Dieser Pfad kann nicht gelöscht werden.');
}

try {
    $db = getDB();
    $stmt = $db->prepare('SELECT cover_image FROM custom_paths WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
        sendResponse(['success' => false, 'message' => 'Pfad nicht gefunden.'], 404);
    }

    $stmt = $db->prepare('SELECT COUNT(*) FROM custom_stations WHERE path_id = ?');
    $stmt->execute([$id]);
    if ((int) $stmt->fetchColumn() > 0) {
        sendResponse(['success' => false, 'message' => 'Der Pfad enthält noch Stationen. Bitte zuerst die Stationen löschen oder in einen anderen Pfad verschieben.'], 409);
    }

    $db->prepare('DELETE FROM custom_paths WHERE id = ?')->execute([$id]);
    deleteStationImages(array_filter([$row['cover_image']]));

    sendResponse(['success' => true, 'message' => 'Pfad gelöscht.']);
} catch (Throwable $e) {
    error_log('admin_delete_path.php: ' . $e->getMessage());
    sendResponse(['success' => false, 'message' => 'Pfad konnte nicht gelöscht werden.'], 500);
}
