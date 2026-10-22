<?php
/**
 * login.php – Benutzer einloggen
 *
 * POST-Parameter (JSON body):
 *   email    – E-Mail-Adresse
 *   password – Passwort
 *
 * Response (JSON):
 *   success: true  → { success, user: { id, username, email, created_at }, token }
 *                    token: Session-Token für "Authorization: Bearer <token>"
 *   success: false → { success, message }
 */

require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Methode nicht erlaubt.'], 405);
}

$body = json_decode(file_get_contents('php://input'), true);

$email    = trim($body['email'] ?? '');
$password = $body['password'] ?? '';

if (empty($email) || empty($password)) {
    sendResponse(['success' => false, 'message' => 'E-Mail und Passwort sind erforderlich.'], 400);
}

$db = getDB();

// User anhand der E-Mail suchen
$stmt = $db->prepare('SELECT id, username, email, password_hash, created_at FROM users WHERE email = ?');
$stmt->execute([$email]);
$user = $stmt->fetch();

// Sicherheitshinweis: gleiche Fehlermeldung für "nicht gefunden" und "falsches Passwort"
// verhindert E-Mail-Enumeration-Angriffe
if (!$user || !password_verify($password, $user['password_hash'])) {
    usleep(300000); // bremst Brute-Force-Versuche
    sendResponse(['success' => false, 'message' => 'E-Mail oder Passwort ist falsch.'], 401);
}

// Passwort-Hash aus Response entfernen
unset($user['password_hash']);
$user['id'] = (int) $user['id'];

sendResponse([
    'success' => true,
    'user'    => $user,
    'token'   => createUserSession($db, $user['id']),
]);
