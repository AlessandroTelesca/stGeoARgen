<?php
/**
 * get_progress.php – Fortschritt eines Users laden
 *
 * GET-Parameter:
 *   user_id – ID des Users
 *
 * Response (JSON):
 *   success: true  → { success, progress: [{ path_id, station_id, completed_at }, ...] }
 *   success: false → { success, message }
 */

require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(['success' => false, 'message' => 'Methode nicht erlaubt.'], 405);
}

$userId = filter_input(INPUT_GET, 'user_id', FILTER_VALIDATE_INT);
if (!$userId || $userId <= 0) {
    sendResponse(['success' => false, 'message' => 'Ungültige user_id.'], 400);
}

$db = getDB();

$stmt = $db->prepare(
    'SELECT path_id, station_id, completed_at 
     FROM user_progress 
     WHERE user_id = ? AND completed = 1
     ORDER BY completed_at ASC'
);
$stmt->execute([$userId]);
$progress = $stmt->fetchAll();

// station_id als Int sicherstellen
foreach ($progress as &$row) {
    $row['station_id'] = (int) $row['station_id'];
}

sendResponse([
    'success'  => true,
    'progress' => $progress,
]);
