<?php
// vouchers_redeem.php

require_once 'config.php';
$pdo = getDB();

header('Content-Type: application/json');
$body = json_decode(file_get_contents('php://input'), true);

if (!isset($body['code'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Code erforderlich.']);
    exit;
}

$code = $body['code'];
$user_id = isset($body['user_id']) ? (int)$body['user_id'] : null;

$stmt = $pdo->prepare('SELECT * FROM vouchers WHERE code = ?');
$stmt->execute([$code]);
$voucher = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$voucher) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Gutschein nicht gefunden.']);
    exit;
}

if ($voucher['is_redeemed']) {
    http_response_code(409);
    echo json_encode(['success' => false, 'message' => 'Gutschein wurde bereits eingelöst.']);
    exit;
}

$redeemedBy = $user_id ? "user:$user_id" : null;
$stmt = $pdo->prepare('UPDATE vouchers SET is_redeemed = 1, redeemed_by = ?, redeemed_at = NOW() WHERE id = ?');
$stmt->execute([$redeemedBy, $voucher['id']]);

// Punkte gutschreiben, falls vorhanden
if ($voucher['points_value'] && $voucher['points_value'] > 0 && $user_id) {
    $stmt = $pdo->prepare('UPDATE users SET total_points = total_points + ? WHERE id = ?');
    $stmt->execute([$voucher['points_value'], $user_id]);
}

http_response_code(200);
echo json_encode(['success' => true, 'message' => 'Gutschein erfolgreich eingelöst! Punkte wurden gutgeschrieben.']);
