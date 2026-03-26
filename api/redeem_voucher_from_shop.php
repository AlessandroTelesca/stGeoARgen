<?php
/**
 * redeem_voucher_from_shop.php – Gutschein aus Shop einlösen (Punkte abziehen)
 *
 * POST-Parameter:
 *   voucher_id – ID des Gutscheins
 *   user_id – ID des Users
 *
 * Response (JSON):
 *   success: true  → { success, message, code }
 *   success: false → { success, message }
 */

require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Methode nicht erlaubt.'], 405);
}

$body = json_decode(file_get_contents('php://input'), true);

if (!isset($body['voucher_id']) || !isset($body['user_id'])) {
    sendResponse(['success' => false, 'message' => 'voucher_id und user_id erforderlich.'], 400);
}

$voucherId = (int) $body['voucher_id'];
$userId = (int) $body['user_id'];

$db = getDB();

// Gutschein prüfen
$stmt = $db->prepare('SELECT * FROM vouchers WHERE id = ? AND is_redeemed = 0');
$stmt->execute([$voucherId]);
$voucher = $stmt->fetch();

if (!$voucher) {
    sendResponse(['success' => false, 'message' => 'Gutschein nicht verfügbar.'], 404);
}

// User-Punkte prüfen
$stmt = $db->prepare('SELECT total_points FROM users WHERE id = ?');
$stmt->execute([$userId]);
$user = $stmt->fetch();

if (!$user || $user['total_points'] < $voucher['points_value']) {
    sendResponse(['success' => false, 'message' => 'Nicht genügend Punkte.'], 400);
}

// Punkte abziehen
$stmt = $db->prepare('UPDATE users SET total_points = total_points - ? WHERE id = ?');
$stmt->execute([$voucher['points_value'], $userId]);

// Gutschein einlösen
$stmt = $db->prepare('UPDATE vouchers SET is_redeemed = 1, redeemed_by = ?, redeemed_at = NOW() WHERE id = ?');
$stmt->execute(["user:$userId", $voucherId]);

sendResponse([
    'success' => true,
    'message' => 'Gutschein erfolgreich eingelöst!',
    'code'    => $voucher['code'],
]);
?>