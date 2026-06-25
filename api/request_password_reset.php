<?php
/**
 * request_password_reset.php – Reset-Token anfordern
 *
 * POST-Parameter (JSON body):
 *   email – E-Mail-Adresse
 *
 * Response (JSON):
 *   success: true  -> { success, message }
 *   success: false -> { success, message }
 *
 * Hinweis:
 * Wir antworten immer erfolgreich mit generischer Nachricht, um
 * E-Mail-Enumeration zu erschweren.
 * Das Reset-Token wird ausschliesslich per E-Mail versendet und
 * niemals in der API-Antwort zurueckgegeben.
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

$frontendUrl = rtrim(getenv('FRONTEND_URL') ?: 'https://stgeoargen.iiius.de', '/');
$resetLink = $frontendUrl . '/forgot-password?token=' . urlencode($resetToken);

$to      = $user['email'];
$subject = 'St.GeoARgen – Passwort zuruecksetzen';
$body    = "Hallo,\n\ndu hast eine Anfrage zum Zuruecksetzen deines Passworts gestellt.\n\n"
         . "Klicke auf den folgenden Link, um ein neues Passwort festzulegen (gueltig fuer 1 Stunde):\n\n"
         . $resetLink . "\n\n"
         . "Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.\n\n"
         . "Dein St.GeoARgen-Team";
$headers = 'From: noreply@stgeoargen.iiius.de' . "\r\n" .
           'X-Mailer: PHP/' . phpversion();

mail($to, $subject, $body, $headers);

sendResponse(['success' => true, 'message' => $genericMessage]);
