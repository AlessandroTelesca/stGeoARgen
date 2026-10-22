<?php
/**
 * delete_account.php – Eigenes Konto endgültig löschen (DSGVO Art. 17)
 *
 * POST-Parameter (JSON body):
 *   password – aktuelles Passwort zur Bestätigung
 *   Header: Authorization: Bearer <Session-Token>
 *
 * Fortschritt, Belohnungen, Gutscheine, Sessions und Passwort-Reset-Tokens hängen per
 * ON DELETE CASCADE an users und werden mit dem Konto entfernt.
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
$password = is_array($body) ? ($body['password'] ?? '') : '';

if (!is_string($password) || $password === '') {
    sendResponse(['success' => false, 'message' => 'Bitte gib dein Passwort ein.'], 400);
}

$db = getDB();
$userId = requireUser($db);

$stmt = $db->prepare('SELECT password_hash FROM users WHERE id = ?');
$stmt->execute([$userId]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    usleep(300000); // bremst Brute-Force-Versuche
    sendResponse(['success' => false, 'message' => 'Das Passwort ist nicht korrekt.'], 403);
}

$db->prepare('DELETE FROM users WHERE id = ?')->execute([$userId]);

sendResponse(['success' => true, 'message' => 'Dein Konto wurde gelöscht.']);
