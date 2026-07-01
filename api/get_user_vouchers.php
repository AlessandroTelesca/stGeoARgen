<?php
/**
 * get_user_vouchers.php – Gekaufte und bereits eingelöste Gutscheine abrufen
 *
 * GET-Parameter:
 *   user_id – ID des Users
 *
 * Response (JSON):
 *   success: true  → {
 *     success,
 *     redeemable_vouchers: [{ id, code, description, partner_name, address, points_value, purchased_at }, ...],
 *     redeemed_vouchers: [{ id, code, description, partner_name, address, points_value, redeemed_at }, ...]
 *   }
 *   success: false → { success, message }
 */

require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(['success' => false, 'message' => 'Methode nicht erlaubt.'], 405);
}

$userId = filter_input(INPUT_GET, 'user_id', FILTER_VALIDATE_INT);
if (!$userId || $userId <= 0) {
    sendResponse(['success' => false, 'message' => 'Ungültige user_id.'], 400);
}

$db = getDB();

$redeemableStmt = $db->prepare(
    'SELECT uv.id, uv.code, uv.description, p.name AS partner_name, p.address, uv.points_value, uv.max_uses, uv.remaining_uses, uv.purchased_at, uv.expiry_date
     FROM user_vouchers uv
     LEFT JOIN partners p ON uv.partner_id = p.id
     WHERE uv.user_id = ?
       AND uv.is_redeemed = 0
       AND (uv.expiry_date IS NULL OR uv.expiry_date >= CURDATE())
     ORDER BY uv.purchased_at DESC, uv.id DESC'
);
$redeemableStmt->execute([$userId]);
$redeemableVouchers = $redeemableStmt->fetchAll();

$redeemedStmt = $db->prepare(
    'SELECT uv.id, uv.code, uv.description, p.name AS partner_name, p.address, uv.points_value, uv.max_uses, uv.remaining_uses, uv.purchased_at, uv.redeemed_at, uv.expiry_date
     FROM user_vouchers uv
     LEFT JOIN partners p ON uv.partner_id = p.id
     WHERE uv.user_id = ?
       AND uv.is_redeemed = 1
     ORDER BY uv.redeemed_at DESC, uv.id DESC'
);
$redeemedStmt->execute([$userId]);
$redeemedVouchers = $redeemedStmt->fetchAll();

sendResponse([
    'success'            => true,
    'redeemable_vouchers' => $redeemableVouchers,
    'redeemed_vouchers'   => $redeemedVouchers,
]);
