<?php
/**
 * redeem_voucher_from_shop.php â€“ PersÃ¶nlichen Gutschein erzeugen
 */

require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Methode nicht erlaubt.'], 405);
}

$body = json_decode(file_get_contents('php://input'), true);

if (!isset($body['user_id'])) {
    sendResponse(['success' => false, 'message' => 'user_id erforderlich.'], 400);
}

$userId = (int) $body['user_id'];
$voucherId = isset($body['voucher_id']) ? (int) $body['voucher_id'] : 0;
$rewardVoucher = $body['reward_voucher'] ?? null;

$db = getDB();

// User-Punkte prÃ¼fen
$stmt = $db->prepare('SELECT total_points FROM users WHERE id = ?');
$stmt->execute([$userId]);
$user = $stmt->fetch();

if (!$user) {
    sendResponse(['success' => false, 'message' => 'User nicht gefunden.'], 404);
}

if (is_array($rewardVoucher)) {
    $title = trim((string) ($rewardVoucher['title'] ?? ''));
    $description = trim((string) ($rewardVoucher['description'] ?? ''));
    $address = trim((string) ($rewardVoucher['address'] ?? ''));
    $requiredPoints = (int) ($rewardVoucher['required_points'] ?? 0);

    if ($title === '' || $requiredPoints <= 0) {
        sendResponse(['success' => false, 'message' => 'UngÃ¼ltiger Gutschein aus Belohnungen.'], 400);
    }

    $partnerLookupStmt = $db->prepare(
        'SELECT id, name FROM partners WHERE name = ? OR address = ? LIMIT 1'
    );
    $partnerLookupStmt->execute([$title, $address]);
    $partner = $partnerLookupStmt->fetch();

    if (!$partner) {
        sendResponse(['success' => false, 'message' => 'Kein passender Partner fÃ¼r diesen Gutschein gefunden.'], 400);
    }

    if ((int) $user['total_points'] < $requiredPoints) {
        sendResponse(['success' => false, 'message' => 'Nicht genÃ¼gend Punkte.'], 400);
    }

    $stmt = $db->prepare('UPDATE users SET total_points = total_points - ? WHERE id = ?');
    $stmt->execute([$requiredPoints, $userId]);

    $code = strtoupper(substr(md5(uniqid((string) $userId, true)), 0, 10));
    $fullDescription = $description !== '' ? $title . ' - ' . $description : $title;

    $insertStmt = $db->prepare(
        'INSERT INTO vouchers (code, description, partner_id, is_redeemed, points_value, redeemed_by, redeemed_at, expiry_date)
         VALUES (?, ?, ?, 0, ?, ?, NOW(), DATE_ADD(CURDATE(), INTERVAL 30 DAY))'
    );
    $insertStmt->execute([$code, $fullDescription, $partner['id'], $requiredPoints, "user:$userId"]);

    sendResponse([
        'success' => true,
        'message' => 'Gutschein erfolgreich erstellt!',
        'code' => $code,
        'partner' => $partner['name'],
    ]);
}

if ($voucherId <= 0) {
    sendResponse(['success' => false, 'message' => 'voucher_id oder reward_voucher erforderlich.'], 400);
}

// Fallback: alter DB-Shop-Gutschein
$stmt = $db->prepare('SELECT * FROM vouchers WHERE id = ? AND is_redeemed = 0');
$stmt->execute([$voucherId]);
$voucher = $stmt->fetch();

if (!$voucher) {
    sendResponse(['success' => false, 'message' => 'Gutschein ist nicht mehr im Shop verfÃ¼gbar.'], 404);
}

if (!$user || $user['total_points'] < $voucher['points_value']) {
    sendResponse(['success' => false, 'message' => 'Nicht genÃ¼gend Punkte.'], 400);
}

// Punkte abziehen
$stmt = $db->prepare('UPDATE users SET total_points = total_points - ? WHERE id = ?');
$stmt->execute([$voucher['points_value'], $userId]);

// Gutschein einlÃ¶sen
$stmt = $db->prepare('UPDATE vouchers SET is_redeemed = 1, redeemed_by = ?, redeemed_at = NOW() WHERE id = ?');
$stmt->execute(["user:$userId", $voucherId]);

sendResponse([
    'success' => true,
    'message' => 'Gutschein erfolgreich eingelÃ¶st!',
    'code'    => $voucher['code'],
]);
?>