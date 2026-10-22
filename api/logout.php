<?php
/**
 * logout.php – Beendet die aktuelle Session (Header "Authorization: Bearer <token>")
 *
 * Response (JSON): { success, message }
 * Ein unbekanntes/abgelaufenes Token gilt ebenfalls als abgemeldet.
 */

require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Methode nicht erlaubt.'], 405);
}

$token = getBearerToken();
if ($token !== '') {
    $db = getDB();
    $db->prepare('DELETE FROM user_sessions WHERE token_hash = ?')->execute([hash('sha256', $token)]);
}

sendResponse(['success' => true, 'message' => 'Abgemeldet.']);
