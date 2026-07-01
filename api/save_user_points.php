<?php
/**
 * save_user_points.php – Aktualisiert total_points eines Users.
 *
 * POST-Parameter (JSON body):
 *   user_id      - ID des Users
 *   points_delta - Integer: Punkte hinzufügen oder abziehen
 *
 * Response (JSON):
 *   success: true  -> { success, message, total_points }
 *   success: false -> { success, message }
 */

require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Methode nicht erlaubt.'], 405);
}

$body = json_decode(file_get_contents('php://input'), true);
$userId = filter_var($body['user_id'] ?? 0, FILTER_VALIDATE_INT);
$pointsDelta = filter_var($body['points_delta'] ?? null, FILTER_VALIDATE_INT);

if (!$userId || $userId <= 0) {
    sendResponse(['success' => false, 'message' => 'Ungueltige user_id.'], 400);
}
if ($pointsDelta === null) {
    sendResponse(['success' => false, 'message' => 'points_delta fehlt oder ist ungültig.'], 400);
}

$db = getDB();

$stmt = $db->prepare('SELECT id FROM users WHERE id = ?');
$stmt->execute([$userId]);
if (!$stmt->fetch()) {
    sendResponse(['success' => false, 'message' => 'User nicht gefunden.'], 404);
}

$updateStmt = $db->prepare('UPDATE users SET total_points = GREATEST(0, total_points + ?) WHERE id = ?');
$updateStmt->execute([$pointsDelta, $userId]);

$pointsStmt = $db->prepare('SELECT total_points FROM users WHERE id = ?');
$pointsStmt->execute([$userId]);
$user = $pointsStmt->fetch();

sendResponse([
    'success' => true,
    'message' => 'Punkte aktualisiert.',
    'total_points' => (int)$user['total_points'],
]);
