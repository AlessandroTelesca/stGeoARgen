<?php
// partner_voucher_validate.php

require_once 'config.php';
$pdo = getDB();

header('Content-Type: application/json');
$body = json_decode(file_get_contents('php://input'), true);

if (!isset($body['username']) || !isset($body['password']) || !isset($body['code'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Benutzername, Passwort und Gutscheincode erforderlich.']);
    exit;
}

$username = $body['username'];
$password = $body['password'];
$code = $body['code'];

$stmt = $pdo->prepare('SELECT * FROM partners WHERE username = ?');
$stmt->execute([$username]);
$partner = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$partner) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Ungültige Zugangsdaten.']);
    exit;
}

$validPassword = false;
$shouldRehash = false;
$passwordColumn = array_key_exists('password_hash', $partner) ? 'password_hash' : 'password';
$storedPassword = $partner[$passwordColumn] ?? null;

if ($storedPassword !== null && password_verify($password, $storedPassword)) {
    $validPassword = true;
    if (password_needs_rehash($storedPassword, PASSWORD_BCRYPT)) {
        $shouldRehash = true;
    }
} elseif ($storedPassword !== null && $storedPassword === $password) {
    // Fallback für alte, unverschlüsselte Partner-Passwörter
    $validPassword = true;
    $shouldRehash = true;
}

if (!$validPassword) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Ungültige Zugangsdaten.']);
    exit;
}

if ($shouldRehash && $storedPassword !== null) {
    $newHash = password_hash($password, PASSWORD_BCRYPT);
    $updateStmt = $pdo->prepare("UPDATE partners SET {$passwordColumn} = ? WHERE id = ?");
    $updateStmt->execute([$newHash, $partner['id']]);
}

try {
    $stmt = $pdo->prepare('SELECT * FROM vouchers WHERE code = ?');
    $stmt->execute([$code]);
    $voucher = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$voucher) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Gutscheincode nicht gefunden.']);
        exit;
    }

    if (strpos((string)$voucher['redeemed_by'], 'user:') !== 0) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'Dieser Gutschein wurde noch nicht von einem Nutzer gekauft.']);
        exit;
    }

    if ($voucher['partner_id'] === null) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'Dieser Gutschein ist keinem Partner zugeordnet und kann nicht validiert werden.']);
        exit;
    }

    if ((int)$voucher['partner_id'] !== (int)$partner['id']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Dieser Code gehört nicht zu Ihrem Partnerkonto.']);
        exit;
    }

    if ($voucher['is_redeemed']) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'Gutschein wurde schon validiert / eingelöst.']);
        exit;
    }

    if (!empty($voucher['expiry_date']) && $voucher['expiry_date'] < date('Y-m-d')) {
        http_response_code(410);
        echo json_encode(['success' => false, 'message' => 'Dieser Gutschein ist abgelaufen und nicht mehr gültig.']);
        exit;
    }

    $stmt = $pdo->prepare('UPDATE vouchers SET is_redeemed = 1, redeemed_at = NOW() WHERE id = ?');
    $stmt->execute([$voucher['id']]);

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Gutschein erfolgreich validiert und als eingelöst markiert.',
        'voucher' => [
            'code' => $voucher['code'],
            'description' => $voucher['description'],
            'points_value' => $voucher['points_value'],
        ],
        'partner' => [
            'id' => $partner['id'],
            'name' => $partner['name'],
        ]
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Serverfehler: ' . $e->getMessage()]);
    exit;
}
