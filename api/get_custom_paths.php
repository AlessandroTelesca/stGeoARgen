<?php
/**
 * get_custom_paths.php – Alle veröffentlichten, über die Stationsverwaltung angelegten Themenpfade (öffentlich)
 * Sortiert nach sort_order, created_at.
 *
 * Response: { success, paths: [{ id, title_de, title_en, description_de, description_en,
 *                                difficulty, estimated_time, cover_image, published, sort_order,
 *                                created_at, updated_at }] }
 */

require_once __DIR__ . '/custom_stations_lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(['success' => false, 'message' => 'Nur GET erlaubt.'], 405);
}

try {
    $rows = getDB()->query('SELECT * FROM custom_paths WHERE published = 1 ORDER BY sort_order ASC, created_at ASC, id ASC')->fetchAll();
    sendResponse(['success' => true, 'paths' => array_map('formatPathRow', $rows)]);
} catch (Throwable $e) {
    error_log('get_custom_paths.php: ' . $e->getMessage());
    sendResponse(['success' => false, 'message' => 'Pfade konnten nicht geladen werden.'], 500);
}
