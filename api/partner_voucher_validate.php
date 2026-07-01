<?php
// partner_voucher_validate.php

require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Methode nicht erlaubt.'], 405);
}

$body = json_decode(file_get_contents('php://input'), true);

if (!isset($body['username']) || !isset($body['password']) || !isset($body['code'])) {
    sendResponse(['success' => false, 'message' => 'Benutzername, Passwort und Gutscheincode erforderlich.'], 400);
}

$username = $body['username'];
$password = $body['password'];
$code     = $body['code'];

$pdo = getDB();

$stmt = $pdo->prepare('SELECT * FROM partners WHERE username = ?');
$stmt->execute([$username]);
$partner = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$partner) {
    sendResponse(['success' => false, 'message' => 'Ungültige Zugangsdaten.'], 401);
}

$storedHash = $partner['password_hash'] ?? null;

if ($storedHash === null || !password_verify($password, $storedHash)) {
    sendResponse(['success' => false, 'message' => 'Ungültige Zugangsdaten.'], 401);
}

if (password_needs_rehash($storedHash, PASSWORD_BCRYPT)) {
    $pdo->prepare('UPDATE partners SET password_hash = ? WHERE id = ?')
        ->execute([password_hash($password, PASSWORD_BCRYPT), $partner['id']]);
}

try {
    $stmt = $pdo->prepare('SELECT * FROM user_vouchers WHERE code = ?');
    $stmt->execute([$code]);
    $voucher = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$voucher) {
        sendResponse(['success' => false, 'message' => 'Gutscheincode nicht gefunden.'], 404);
    }

    if ($voucher['partner_id'] === null) {
        sendResponse(['success' => false, 'message' => 'Dieser Gutschein ist keinem Partner zugeordnet und kann nicht validiert werden.'], 409);
    }

    if ((int)$voucher['partner_id'] !== (int)$partner['id']) {
        sendResponse(['success' => false, 'message' => 'Dieser Code gehört nicht zu Ihrem Partnerkonto.'], 403);
    }

    if ($voucher['is_redeemed']) {
        sendResponse(['success' => false, 'message' => 'Gutschein wurde schon validiert / eingelöst.'], 409);
    }

    if (!empty($voucher['expiry_date']) && $voucher['expiry_date'] < date('Y-m-d')) {
        sendResponse(['success' => false, 'message' => 'Dieser Gutschein ist abgelaufen und nicht mehr gültig.'], 410);
    }

    $remainingUses = isset($voucher['remaining_uses']) ? (int) $voucher['remaining_uses'] : 1;
    if ($remainingUses <= 0) {
        sendResponse(['success' => false, 'message' => 'Dieser Gutschein kann nicht mehr eingelöst werden.'], 409);
    }

    $pdo->prepare('UPDATE user_vouchers SET is_redeemed = 1, redeemed_at = NOW(), remaining_uses = 0 WHERE id = ?')
        ->execute([$voucher['id']]);

    sendResponse([
        'success' => true,
        'message' => 'Gutschein erfolgreich validiert und als eingelöst markiert.',
        'voucher' => [
            'code'         => $voucher['code'],
            'description'  => $voucher['description'],
            'points_value' => $voucher['points_value'],
        ],
        'partner' => [
            'id'   => $partner['id'],
            'name' => $partner['name'],
        ],
    ]);
} catch (Exception $e) {
    sendResponse(['success' => false, 'message' => 'Serverfehler.'], 500);
}
