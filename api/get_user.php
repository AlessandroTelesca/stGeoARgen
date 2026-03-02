<?php
/**
 * get_user.php – Profil-Daten eines Users abrufen
 *
 * GET-Parameter:
 *   user_id – ID des Users
 *
 * Response (JSON):
 *   success: true  → { success, user: { id, username, email, created_at } }
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
