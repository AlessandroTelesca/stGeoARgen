<?php
/**
 * get_user.php – Profil-Daten eines Users abrufen
 *
 * GET-Parameter:
 *   user_id – (optional) ID des Users, muss zum Session-Token passen
 *
 * Header: Authorization: Bearer <Session-Token>
 *
 * Response (JSON):
 *   success: true  → { success, user: { id, username, email, created_at } }
 *   success: false → { success, message }
 */

require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(['success' => false, 'message' => 'Methode nicht erlaubt.'], 405);
}

$db = getDB();
// user_id kommt aus dem Session-Token; ein mitgeschickter user_id-Parameter muss dazu passen.
$userId = requireUser($db, $_GET['user_id'] ?? null);

$stmt = $db->prepare('SELECT id, username, email, created_at FROM users WHERE id = ?');
$stmt->execute([$userId]);
$user = $stmt->fetch();

if (!$user) {
    sendResponse(['success' => false, 'message' => 'User nicht gefunden.'], 404);
}

$user['id'] = (int) $user['id'];

sendResponse([
    'success' => true,
    'user'    => $user,
]);
