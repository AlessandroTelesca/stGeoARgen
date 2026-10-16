<?php
/**
 * admin_delete_station.php – Löscht eine Custom-Station samt Bildern (nur Admin)
 *
 * POST (JSON body): { id }
 * Response: { success, message }
 */

require_once __DIR__ . '/custom_stations_lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Nur POST erlaubt.'], 405);
}

requireAdmin();

$body = json_decode(file_get_contents('php://input'), true);
$id = filter_var($body['id'] ?? 0, FILTER_VALIDATE_INT);
if (!$id || $id <= 0) {
    sendResponse(['success' => false, 'message' => 'Ungültige Stations-ID.'], 400);
}

try {
    $db = getDB();
    $stmt = $db->prepare('SELECT cover_image, slides, panorama_image, quiz_questions FROM custom_stations WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
        sendResponse(['success' => false, 'message' => 'Station nicht gefunden.'], 404);
    }

    $db->prepare('DELETE FROM custom_stations WHERE id = ?')->execute([$id]);
    deleteStationImages(stationImageFiles($row));

    sendResponse(['success' => true, 'message' => 'Station gelöscht.']);
} catch (Throwable $e) {
    error_log('admin_delete_station.php: ' . $e->getMessage());
    sendResponse(['success' => false, 'message' => 'Station konnte nicht gelöscht werden.'], 500);
}
