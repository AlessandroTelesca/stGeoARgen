<?php
/**
 * get_custom_paths.php – Alle über die Stationsverwaltung angelegten Themenpfade (öffentlich)
 *
 * Response: { success, paths: [{ id, title_de, title_en, description_de, description_en,
 *                                difficulty, estimated_time, cover_image, created_at, updated_at }] }
 */

require_once __DIR__ . '/custom_stations_lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(['success' => false, 'message' => 'Nur GET erlaubt.'], 405);
}

try {
    $rows = getDB()->query('SELECT * FROM custom_paths ORDER BY created_at ASC, id ASC')->fetchAll();
    sendResponse(['success' => true, 'paths' => array_map('formatPathRow', $rows)]);
} catch (Throwable $e) {
    error_log('get_custom_paths.php: ' . $e->getMessage());
    sendResponse(['success' => false, 'message' => 'Pfade konnten nicht geladen werden.'], 500);
}
