<?php
/**
 * get_custom_stations.php – Alle über die Stationsverwaltung angelegten Stationen (öffentlich)
 *
 * Response: { success, stations: [...] }
 * Bild-URLs: <API_BASE_URL>/uploads/stations/<dateiname>
 */

require_once __DIR__ . '/custom_stations_lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(['success' => false, 'message' => 'Nur GET erlaubt.'], 405);
}

try {
    $rows = getDB()->query('SELECT * FROM custom_stations ORDER BY id ASC')->fetchAll();
    sendResponse(['success' => true, 'stations' => array_map('formatStationRow', $rows)]);
} catch (Throwable $e) {
    error_log('get_custom_stations.php: ' . $e->getMessage());
    sendResponse(['success' => false, 'message' => 'Stationen konnten nicht geladen werden.'], 500);
}
