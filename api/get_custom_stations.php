<?php
/**
 * get_custom_stations.php – Alle veröffentlichten, über die Stationsverwaltung angelegten Stationen (öffentlich)
 *
 * Nur Stationen mit published = 1, deren Pfad entweder fest eingebaut (BUILTIN_PATH_IDS) oder
 * ebenfalls veröffentlicht ist. Sortiert nach sort_order, id.
 *
 * Response: { success, stations: [...] }
 * Bild-URLs: <API_BASE_URL>/uploads/stations/<dateiname>
 */

require_once __DIR__ . '/custom_stations_lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(['success' => false, 'message' => 'Nur GET erlaubt.'], 405);
}

try {
    $placeholders = implode(', ', array_fill(0, count(BUILTIN_PATH_IDS), '?'));
    $stmt = getDB()->prepare(
        "SELECT s.* FROM custom_stations s
         LEFT JOIN custom_paths p ON p.id = s.path_id
         WHERE s.published = 1 AND (s.path_id IN ($placeholders) OR p.published = 1)
         ORDER BY s.sort_order ASC, s.id ASC"
    );
    $stmt->execute(BUILTIN_PATH_IDS);
    $rows = $stmt->fetchAll();
    sendResponse(['success' => true, 'stations' => array_map('formatStationRow', $rows)]);
} catch (Throwable $e) {
    error_log('get_custom_stations.php: ' . $e->getMessage());
    sendResponse(['success' => false, 'message' => 'Stationen konnten nicht geladen werden.'], 500);
}
