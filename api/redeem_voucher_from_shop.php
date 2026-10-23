<?php
/**
 * redeem_voucher_from_shop.php – Shop-Gutschein gegen Punkte kaufen
 *
 * Header: Authorization: Bearer <Session-Token>
 * POST (JSON body): { voucher_id, user_id? }
 * Preis, Partner und Ablaufdatum kommen ausschließlich aus der Tabelle vouchers.
 * (Der frühere Zweig "reward_voucher" übernahm Titel, Partner und Preis vom Client –
 * damit ließ sich für 1 Punkt ein Gutschein bei jedem Partner erzeugen. Entfernt.)
 */

require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Methode nicht erlaubt.'], 405);
}

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) {
    sendResponse(['success' => false, 'message' => 'Ungültiger Request Body.'], 400);
}

// Kryptografisch zufälliger Code; ohne CSPRNG lieber abbrechen (Transaktion wird zurückgerollt)
// als einen vorhersagbaren Code (md5(uniqid)) auszugeben.
function generateVoucherCode(): string {
    return strtoupper(bin2hex(random_bytes(5)));
}

$voucherId = isset($body['voucher_id']) ? (int) $body['voucher_id'] : 0;
if ($voucherId <= 0) {
    sendResponse(['success' => false, 'message' => 'voucher_id erforderlich.'], 400);
}

$db = getDB();
$userId = requireUser($db, $body['user_id'] ?? null);

$stmt = $db->prepare('SELECT total_points FROM users WHERE id = ?');
$stmt->execute([$userId]);
$user = $stmt->fetch();

if (!$user) {
    sendResponse(['success' => false, 'message' => 'User nicht gefunden.'], 404);
}

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

    // Atomar abbuchen: nur wenn der Kontostand zum Zeitpunkt des UPDATE reicht.
    // Die Prüfung oben allein ist bei parallelen Requests (Doppelklick) nicht sicher.
    $stmt = $db->prepare('UPDATE users SET total_points = total_points - ? WHERE id = ? AND total_points >= ?');
    $stmt->execute([(int) $voucher['points_value'], $userId, (int) $voucher['points_value']]);
    if ($stmt->rowCount() === 0) {
        $db->rollBack();
        sendResponse(['success' => false, 'message' => 'Nicht genügend Punkte.'], 400);
    }

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
            $db->rollBack();
            sendResponse(['success' => false, 'message' => 'Gutschein ist nicht mehr vorrätig.'], 409);
        }
    }

    $db->commit();

    sendResponse([
        'success' => true,
        'message' => 'Gutschein erfolgreich erstellt!',
        'code'    => $code,
    ]);
} catch (Throwable $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    error_log('redeem_voucher_from_shop shop purchase error: ' . $e->getMessage());
    sendResponse(['success' => false, 'message' => 'Serverfehler beim Einlösen des Gutscheins.'], 500);
}
