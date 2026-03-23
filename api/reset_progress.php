<?php
/**
 * reset_progress.php - Gesamten Fortschritt eines Users zuruecksetzen
 *
 * POST-Parameter (JSON body):
 *   user_id - ID des Users
 *
 * Response (JSON):
 *   success: true  -> { success, message, deleted_rows }
 *   success: false -> { success, message }
 */

require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Methode nicht erlaubt.'], 405);
}

$body = json_decode(file_get_contents('php://input'), true);
$userId = filter_var($body['user_id'] ?? 0, FILTER_VALIDATE_INT);

if (!$userId || $userId <= 0) {
    sendResponse(['success' => false, 'message' => 'Ungueltige user_id.'], 400);
}

$db = getDB();

// Sicherstellen, dass der User existiert
$stmt = $db->prepare('SELECT id FROM users WHERE id = ?');
$stmt->execute([$userId]);
if (!$stmt->fetch()) {
    sendResponse(['success' => false, 'message' => 'User nicht gefunden.'], 404);
}

$deleteStmt = $db->prepare('DELETE FROM user_progress WHERE user_id = ?');
$deleteStmt->execute([$userId]);

sendResponse([
    'success' => true,
    'message' => 'Fortschritt wurde zurueckgesetzt.',
    'deleted_rows' => $deleteStmt->rowCount(),
]);
