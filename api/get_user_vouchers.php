<?php
/**
 * get_user_vouchers.php – Eingelöste Gutscheine eines Users abrufen
 *
 * GET-Parameter:
 *   user_id – ID des Users
 *
 * Response (JSON):
 *   success: true  → { success, vouchers: [{ id, code, description, partner_name, redeemed_at }, ...] }
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

$stmt = $db->prepare(
    'SELECT v.id, v.code, v.description, p.name AS partner_name, v.redeemed_at 
     FROM vouchers v 
     LEFT JOIN partners p ON v.partner_id = p.id 
     WHERE v.redeemed_by = ? AND v.is_redeemed = 1
     ORDER BY v.redeemed_at DESC'
);
$stmt->execute(["user:$userId"]);
$vouchers = $stmt->fetchAll();

sendResponse([
    'success'  => true,
    'vouchers' => $vouchers,
]);
?>