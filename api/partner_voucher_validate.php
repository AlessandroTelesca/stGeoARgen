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

if (!$partner || $partner['password'] !== $password) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Ungültige Zugangsdaten.']);
    exit;
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

    if ($voucher['partner_id'] !== null && $voucher['partner_id'] !== (int)$partner['id']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Dieser Code gehört nicht zu Ihrem Partnerkonto.']);
        exit;
    }

    if ($voucher['is_redeemed']) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'Gutschein wurde schon validiert / eingelöst.']);
        exit;
    }

    $stmt = $pdo->prepare('UPDATE vouchers SET is_redeemed = 1, redeemed_by = ?, redeemed_at = NOW() WHERE id = ?');
    $stmt->execute([$partner['id'], $voucher['id']]);

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
