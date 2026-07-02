<?php
/**
 * redeem_voucher_from_shop.php – Persönlichen Gutschein erzeugen oder Shop-Gutschein kaufen
 */

require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Methode nicht erlaubt.'], 405);
}

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) {
    sendResponse(['success' => false, 'message' => 'Ungültiger Request Body.'], 400);
}

if (!isset($body['user_id'])) {
    sendResponse(['success' => false, 'message' => 'user_id erforderlich.'], 400);
}

function generateVoucherCode(): string {
    try {
        return strtoupper(bin2hex(random_bytes(5)));
    } catch (Throwable $e) {
        return strtoupper(substr(md5(uniqid('', true)), 0, 10));
    }
}

$userId = (int) $body['user_id'];
$voucherId = isset($body['voucher_id']) ? (int) $body['voucher_id'] : 0;
$rewardVoucher = $body['reward_voucher'] ?? null;

$db = getDB();

$stmt = $db->prepare('SELECT total_points FROM users WHERE id = ?');
$stmt->execute([$userId]);
$user = $stmt->fetch();

if (!$user) {
    sendResponse(['success' => false, 'message' => 'User nicht gefunden.'], 404);
}

if ($voucherId > 0) {
    $stmt = $db->prepare(
        'SELECT * FROM vouchers
         WHERE id = ?
           AND active = 1
           AND (expiry_date IS NULL OR expiry_date >= CURDATE())
           AND (quantity = -1 OR quantity > 0)'
    );
    $stmt->execute([$voucherId]);
    $voucher = $stmt->fetch();

    if (!$voucher) {
        sendResponse(['success' => false, 'message' => 'Gutschein ist nicht mehr im Shop verfügbar.'], 404);
    }

    if ((int) $user['total_points'] < (int) $voucher['points_value']) {
        sendResponse(['success' => false, 'message' => 'Nicht genügend Punkte.'], 400);
    }

    try {
        $db->beginTransaction();

        $stmt = $db->prepare('UPDATE users SET total_points = total_points - ? WHERE id = ?');
        $stmt->execute([(int) $voucher['points_value'], $userId]);

        $code = generateVoucherCode();
        $remainingUses = 1;
        $insertStmt = $db->prepare(
            'INSERT INTO user_vouchers (user_id, voucher_id, code, description, partner_id, points_value, expiry_date, remaining_uses)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)' 
        );
        $insertStmt->execute([
            $userId,
            $voucher['id'],
            $code,
            $voucher['description'],
            $voucher['partner_id'],
            $voucher['points_value'],
            $voucher['expiry_date'],
            $remainingUses,
        ]);

        if ((int)$voucher['quantity'] !== -1) {
            $stmt = $db->prepare('UPDATE vouchers SET quantity = quantity - 1 WHERE id = ? AND quantity > 0');
            $stmt->execute([$voucherId]);

            if ($stmt->rowCount() === 0) {
                throw new Exception('Gutschein ist nicht mehr vorrätig.');
            }
        }

        $db->commit();

        sendResponse([
            'success' => true,
            'message' => 'Gutschein erfolgreich erstellt!',
            'code'    => $code,
        ]);
    } catch (Exception $e) {
        $db->rollBack();
        error_log('redeem_voucher_from_shop shop purchase error: ' . $e->getMessage());
        sendResponse(['success' => false, 'message' => 'Serverfehler beim Einlösen des Gutscheins.'], 500);
    }
}

if (!is_array($rewardVoucher)) {
    sendResponse(['success' => false, 'message' => 'voucher_id oder reward_voucher erforderlich.'], 400);
}

$title = trim((string) ($rewardVoucher['title'] ?? ''));
$description = trim((string) ($rewardVoucher['description'] ?? ''));
$partnerName = trim((string) ($rewardVoucher['partner_name'] ?? $rewardVoucher['title'] ?? ''));
$address = trim((string) ($rewardVoucher['address'] ?? ''));
$requiredPoints = (int) ($rewardVoucher['required_points'] ?? 0);

if ($title === '' || $requiredPoints <= 0) {
    sendResponse(['success' => false, 'message' => 'Ungültiger Gutschein aus Belohnungen.'], 400);
}

$partnerLookupStmt = $db->prepare(
    'SELECT id, name, address FROM partners
     WHERE (name = ? OR address = ?)
        OR (name LIKE ? OR address LIKE ?)
     LIMIT 1'
);
$partnerLookupStmt->execute([
    $partnerName,
    $address,
    $partnerName !== '' ? "%{$partnerName}%" : '',
    $address !== '' ? "%{$address}%" : '',
]);
$partner = $partnerLookupStmt->fetch();

if (!$partner) {
    sendResponse(['success' => false, 'message' => 'Kein passender Partner für diesen Gutschein gefunden.'], 400);
}

if ((int) $user['total_points'] < $requiredPoints) {
    sendResponse(['success' => false, 'message' => 'Nicht genügend Punkte.'], 400);
}

$code = generateVoucherCode();
$fullDescription = $description !== '' ? $title . ' - ' . $description : $title;

try {
    $db->beginTransaction();

    $stmt = $db->prepare('UPDATE users SET total_points = total_points - ? WHERE id = ?');
    $stmt->execute([$requiredPoints, $userId]);

    $insertUserVoucher = $db->prepare(
        'INSERT INTO user_vouchers (user_id, code, description, partner_id, points_value, expiry_date, remaining_uses)
         VALUES (?, ?, ?, ?, ?, DATE_ADD(CURDATE(), INTERVAL 30 DAY), ?)' 
    );
    $insertUserVoucher->execute([
        $userId,
        $code,
        $fullDescription,
        $partner['id'],
        $requiredPoints,
        1,
    ]);

    $db->commit();
} catch (Exception $e) {
    $db->rollBack();
    error_log('redeem_voucher_from_shop reward voucher creation error: ' . $e->getMessage());
    sendResponse(['success' => false, 'message' => 'Serverfehler beim Erstellen des Gutscheins.'], 500);
}

sendResponse([
    'success' => true,
    'message' => 'Gutschein erfolgreich erstellt!',
    'code'    => $code,
    'partner' => $partner['name'],
]);
