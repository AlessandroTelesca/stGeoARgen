<?php
/**
 * save_progress.php – Stations-Abschluss eines Users speichern
 *
 * POST-Parameter (JSON body):
 *   user_id    – ID des Users
 *   path_id    – ID des Pfades (z.B. "tourist")
 *   station_id – ID der Station (Zahl)
 *
 * Response (JSON):
 *   success: true  → { success, message }
 *   success: false → { success, message }
 */

require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Methode nicht erlaubt.'], 405);
}

$body = json_decode(file_get_contents('php://input'), true);

$userId    = filter_var($body['user_id'] ?? 0, FILTER_VALIDATE_INT);
$pathId    = trim($body['path_id'] ?? '');
$stationId = filter_var($body['station_id'] ?? 0, FILTER_VALIDATE_INT);

if (!$userId || $userId <= 0) {
    sendResponse(['success' => false, 'message' => 'Ungültige user_id.'], 400);
}
if (empty($pathId)) {
    sendResponse(['success' => false, 'message' => 'path_id fehlt.'], 400);
}
if (!$stationId || $stationId <= 0) {
    sendResponse(['success' => false, 'message' => 'Ungültige station_id.'], 400);
}

$db = getDB();

// Prüfen ob der User existiert
$stmt = $db->prepare('SELECT id FROM users WHERE id = ?');
$stmt->execute([$userId]);
if (!$stmt->fetch()) {
    sendResponse(['success' => false, 'message' => 'User nicht gefunden.'], 404);
}

// INSERT OR UPDATE (ON DUPLICATE KEY) – idempotent
$stmt = $db->prepare(
    'INSERT INTO user_progress (user_id, path_id, station_id, completed, completed_at)
     VALUES (?, ?, ?, 1, NOW())
     ON DUPLICATE KEY UPDATE completed = 1, completed_at = NOW()'
);
$stmt->execute([$userId, $pathId, $stationId]);

sendResponse([
    'success' => true,
    'message' => 'Fortschritt gespeichert.',
]);
