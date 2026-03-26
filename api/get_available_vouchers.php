<?php
/**
 * get_available_vouchers.php – Verfügbare Gutscheine abrufen
 *
 * Response (JSON):
 *   success: true  → { success, vouchers: [{ id, description, partner_name, address, points_value, expiry_date }, ...] }
 *   success: false → { success, message }
 */

require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(['success' => false, 'message' => 'Methode nicht erlaubt.'], 405);
}

$db = getDB();

$stmt = $db->prepare(
    'SELECT v.id, v.description, p.name AS partner_name, p.address, v.points_value, v.expiry_date 
     FROM vouchers v 
     LEFT JOIN partners p ON v.partner_id = p.id 
     WHERE v.is_redeemed = 0 AND (v.expiry_date IS NULL OR v.expiry_date >= CURDATE())
     ORDER BY p.name, v.description'
);
$stmt->execute();
$vouchers = $stmt->fetchAll();

sendResponse([
    'success'  => true,
    'vouchers' => $vouchers,
]);
?>