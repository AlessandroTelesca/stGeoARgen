<?php
/**
 * admin_get_content.php – Alle Pfade und Stationen der Stationsverwaltung inkl. Entwürfen (nur Admin)
 *
 * POST (kein Body nötig)
 * Response: { success, paths: [...], stations: [...] }
 *   paths     – sortiert nach sort_order, created_at
 *   stations  – sortiert nach path_id, sort_order, id
 */

require_once __DIR__ . '/custom_stations_lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Nur POST erlaubt.'], 405);
}

requireAdmin();

try {
    $db = getDB();
    $paths = $db->query('SELECT * FROM custom_paths ORDER BY sort_order ASC, created_at ASC, id ASC')->fetchAll();
    $stations = $db->query('SELECT s.*, p.color AS path_color FROM custom_stations s LEFT JOIN custom_paths p ON p.id = s.path_id ORDER BY s.path_id ASC, s.sort_order ASC, s.id ASC')->fetchAll();

    sendResponse([
        'success' => true,
        'paths' => array_map('formatPathRow', $paths),
        'stations' => array_map('formatStationRow', $stations),
    ]);
} catch (Throwable $e) {
    error_log('admin_get_content.php: ' . $e->getMessage());
    sendResponse(['success' => false, 'message' => 'Inhalte konnten nicht geladen werden.'], 500);
}
