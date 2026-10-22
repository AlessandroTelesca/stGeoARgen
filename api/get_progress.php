<?php
/**
 * get_progress.php – Fortschritt eines Users laden
 *
 * GET-Parameter:
 *   user_id – (optional) ID des Users, muss zum Session-Token passen
 *
 * Header: Authorization: Bearer <Session-Token>
 *
 * Response (JSON):
 *   success: true  → { success, progress: [{ path_id, station_id, completed_at }, ...] }
 *   success: false → { success, message }
 */

require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(['success' => false, 'message' => 'Methode nicht erlaubt.'], 405);
}

$db = getDB();
// user_id kommt aus dem Session-Token; ein mitgeschickter user_id-Parameter muss dazu passen.
$userId = requireUser($db, $_GET['user_id'] ?? null);

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
