<?php
/**
 * get_user_points.php – Punkte eines Users abrufen
 *
 * GET-Parameter:
 *   user_id – (optional) ID des Users, muss zum Session-Token passen
 *
 * Header: Authorization: Bearer <Session-Token>
 *
 * Response (JSON):
 *   success: true  → { success, total_points: int }
 *   success: false → { success, message }
 */

require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(['success' => false, 'message' => 'Methode nicht erlaubt.'], 405);
}

$db = getDB();
// user_id kommt aus dem Session-Token; ein mitgeschickter user_id-Parameter muss dazu passen.
$userId = requireUser($db, $_GET['user_id'] ?? null);

$stmt = $db->prepare('SELECT total_points FROM users WHERE id = ?');
$stmt->execute([$userId]);
$user = $stmt->fetch();

if (!$user) {
    sendResponse(['success' => false, 'message' => 'User nicht gefunden.'], 404);
}

sendResponse([
    'success'      => true,
    'total_points' => (int) $user['total_points'],
]);
?>