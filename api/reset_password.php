<?php
/**
 * reset_password.php – Passwort per Reset-Token neu setzen
 *
 * POST-Parameter (JSON body):
 *   token    – Klartext-Reset-Token aus der E-Mail
 *   password – Neues Passwort (mindestens 6 Zeichen)
 */

require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Methode nicht erlaubt.'], 405);
}

$body = json_decode(file_get_contents('php://input'), true);
$token = trim($body['token'] ?? '');
$newPassword = $body['password'] ?? '';  // Note: Don't trim password - user might want leading/trailing spaces

if (empty($token)) {
    sendResponse(['success' => false, 'message' => 'Reset-Token fehlt.'], 400);
}

if (empty($newPassword) || strlen($newPassword) < 8) {
    sendResponse(['success' => false, 'message' => 'Passwort muss mindestens 8 Zeichen lang sein.'], 400);
}

$db = getDB();
$tokenHash = hash('sha256', $token);

try {
    $db->beginTransaction();

    $findStmt = $db->prepare(
        'SELECT id, user_id FROM password_resets
         WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()
         ORDER BY id DESC LIMIT 1'
    );
    $findStmt->execute([$tokenHash]);
    $resetEntry = $findStmt->fetch();

    if (!$resetEntry) {
        $db->rollBack();
        sendResponse(['success' => false, 'message' => 'Der Reset-Link ist ungueltig oder abgelaufen.'], 400);
    }

    $newHash = password_hash($newPassword, PASSWORD_BCRYPT);

    $updateUserStmt = $db->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
    $updateUserStmt->execute([$newHash, (int)$resetEntry['user_id']]);

    $markUsedStmt = $db->prepare('UPDATE password_resets SET used_at = NOW() WHERE id = ?');
    $markUsedStmt->execute([(int)$resetEntry['id']]);

    // Alle bestehenden Logins beenden (z. B. falls das alte Passwort kompromittiert war)
    $db->prepare('DELETE FROM user_sessions WHERE user_id = ?')->execute([(int)$resetEntry['user_id']]);

    $db->commit();

    sendResponse(['success' => true, 'message' => 'Passwort erfolgreich geaendert.']);
} catch (Throwable $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    sendResponse(['success' => false, 'message' => 'Passwort konnte nicht aktualisiert werden.'], 500);
}
