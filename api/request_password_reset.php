<?php
/**
 * request_password_reset.php – Reset-Token anfordern
 *
 * POST-Parameter (JSON body):
 *   email – E-Mail-Adresse
 *
 * Response (JSON):
 *   success: true  -> { success, message, reset_token? }
 *   success: false -> { success, message }
 *
 * Hinweis:
 * Wir antworten immer erfolgreich mit generischer Nachricht, um
 * E-Mail-Enumeration zu erschweren.
 */

require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Methode nicht erlaubt.'], 405);
}

$body = json_decode(file_get_contents('php://input'), true);
$email = trim($body['email'] ?? '');
$genericMessage = 'Wenn ein Konto mit dieser E-Mail existiert, wurde ein Reset-Link versendet.';

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendResponse(['success' => true, 'message' => $genericMessage]);
}

$db = getDB();

$stmt = $db->prepare('SELECT id, email FROM users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user) {
    sendResponse(['success' => true, 'message' => $genericMessage]);
}

// Alte, ungenutzte Tokens des Users ungueltig machen.
$invalidateStmt = $db->prepare('UPDATE password_resets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL');
$invalidateStmt->execute([(int)$user['id']]);

$resetToken = bin2hex(random_bytes(32));
$tokenHash = hash('sha256', $resetToken);
$expiresAt = (new DateTime('+1 hour'))->format('Y-m-d H:i:s');

$insertStmt = $db->prepare(
    'INSERT INTO password_resets (user_id, email, token_hash, expires_at) VALUES (?, ?, ?, ?)'
);
$insertStmt->execute([
    (int)$user['id'],
    $user['email'],
    $tokenHash,
    $expiresAt,
]);

sendResponse([
    'success' => true,
    'message' => $genericMessage,
    'reset_token' => $resetToken,
]);
