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

if (empty($newPassword) || strlen($newPassword) < 6) {
    sendResponse(['success' => false, 'message' => 'Passwort muss mindestens 6 Zeichen lang sein.'], 400);
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
        // Check if token exists but is expired or already used (for debugging)
        $debugStmt = $db->prepare('SELECT id, user_id, used_at, expires_at FROM password_resets WHERE token_hash = ? LIMIT 1');
        $debugStmt->execute([$tokenHash]);
        $debugEntry = $debugStmt->fetch();
        
        if ($debugEntry && $debugEntry['used_at']) {
            sendResponse(['success' => false, 'message' => 'Dieser Reset-Link wurde bereits verwendet.'], 400);
        } elseif ($debugEntry && strtotime($debugEntry['expires_at']) < time()) {
            sendResponse(['success' => false, 'message' => 'Der Reset-Link ist abgelaufen. Fordere einen neuen Link an.'], 400);
        } else {
            sendResponse(['success' => false, 'message' => 'Der Reset-Link ist ungueltig oder abgelaufen.'], 400);
        }
    }

    $newHash = password_hash($newPassword, PASSWORD_BCRYPT);

    $updateUserStmt = $db->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
    $updateUserStmt->execute([$newHash, (int)$resetEntry['user_id']]);

    $markUsedStmt = $db->prepare('UPDATE password_resets SET used_at = NOW() WHERE id = ?');
    $markUsedStmt->execute([(int)$resetEntry['id']]);

    $db->commit();

    sendResponse(['success' => true, 'message' => 'Passwort erfolgreich geaendert.']);
} catch (Throwable $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    sendResponse(['success' => false, 'message' => 'Passwort konnte nicht aktualisiert werden.'], 500);
}
