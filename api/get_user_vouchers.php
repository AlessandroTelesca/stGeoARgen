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
 *     redeemed_vouchers: [{ id, code, description, partner_name, address, points_value, purchased_at, redeemed_at }, ...]
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
    'SELECT v.id, v.code, v.description, p.name AS partner_name, p.address, v.points_value, v.redeemed_at AS purchased_at, v.expiry_date
     FROM vouchers v
     LEFT JOIN partners p ON v.partner_id = p.id
    WHERE v.redeemed_by = ?
      AND v.is_redeemed = 0
      AND (v.expiry_date IS NULL OR v.expiry_date >= CURDATE())
     ORDER BY v.redeemed_at DESC, v.id DESC'
);
$redeemableStmt->execute(["user:$userId"]);
$redeemableVouchers = $redeemableStmt->fetchAll();

$redeemedStmt = $db->prepare(
    'SELECT v.id, v.code, v.description, p.name AS partner_name, p.address, v.points_value, v.redeemed_at, v.expiry_date
     FROM vouchers v
     LEFT JOIN partners p ON v.partner_id = p.id
     WHERE v.redeemed_by = ? AND v.is_redeemed = 1
     ORDER BY v.redeemed_at DESC, v.id DESC'
);
$redeemedStmt->execute(["user:$userId"]);
$redeemedVouchers = $redeemedStmt->fetchAll();

sendResponse([
    'success'            => true,
    'redeemable_vouchers' => $redeemableVouchers,
    'redeemed_vouchers'   => $redeemedVouchers,
]);
?>