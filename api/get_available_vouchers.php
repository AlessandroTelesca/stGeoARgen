<?php
/**
 * get_available_vouchers.php – Im Shop kaufbare Gutscheine abrufen
 *
 * Response (JSON):
 *   success: true  → { success, vouchers: [{ id, code, description, partner_name, address, points_value, expiry_date, quantity }, ...] }
 *   success: false → { success, message }
 */

require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(['success' => false, 'message' => 'Methode nicht erlaubt.'], 405);
}

$db = getDB();

$stmt = $db->prepare(
        'SELECT v.id, v.code, v.description, p.name AS partner_name, p.address, v.points_value, v.expiry_date, v.quantity
     FROM vouchers v 
     LEFT JOIN partners p ON v.partner_id = p.id 
     WHERE v.active = 1
       AND (v.code IS NULL OR v.quantity = -1 OR v.quantity > 0)
       AND (v.expiry_date IS NULL OR v.expiry_date >= CURDATE())
     ORDER BY v.points_value ASC, p.name, v.description'
);
$stmt->execute();
$vouchers = $stmt->fetchAll();

sendResponse([
    'success'  => true,
    'vouchers' => $vouchers,
]);
?>