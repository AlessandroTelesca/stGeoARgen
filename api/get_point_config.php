<?php
/**
 * get_point_config.php – Alle Punktwerte für das Frontend (öffentlich)
 *
 * Response (JSON):
 *   success: true  -> { success,
 *                       stations: [{ station_id, path_id, points }],   – fest eingebaute Stationen
 *                       rewards: { reward_key: points },               – Sonderbelohnungen
 *                       achievements: [{ key, threshold_points|null, badge_points }],
 *                       settings: { level_size, default_station_points } }
 *   success: false -> { success, message }
 */

require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(['success' => false, 'message' => 'Methode nicht erlaubt.'], 405);
}

const REQUIRED_POINT_SETTINGS = ['level_size', 'default_station_points'];

try {
    $db = getDB();

    $stations = array_map(
        fn($row) => [
            'station_id' => (int) $row['station_id'],
            'path_id' => $row['path_id'],
            'points' => (int) $row['points'],
        ],
        $db->query('SELECT station_id, path_id, points FROM builtin_stations ORDER BY station_id')->fetchAll()
    );

    $rewards = [];
    foreach ($db->query('SELECT reward_key, points FROM reward_definitions')->fetchAll() as $row) {
        $rewards[$row['reward_key']] = (int) $row['points'];
    }

    $achievements = array_map(
        fn($row) => [
            'key' => $row['achievement_key'],
            'threshold_points' => $row['threshold_points'] === null ? null : (int) $row['threshold_points'],
            'badge_points' => (int) $row['badge_points'],
        ],
        $db->query('SELECT achievement_key, threshold_points, badge_points FROM achievements ORDER BY sort_order, achievement_key')->fetchAll()
    );

    $settings = [];
    foreach ($db->query('SELECT setting_key, value FROM point_settings')->fetchAll() as $row) {
        $settings[$row['setting_key']] = (int) $row['value'];
    }
} catch (Throwable $e) {
    error_log('get_point_config.php: ' . $e->getMessage());
    sendResponse(['success' => false, 'message' => 'Punkte-Konfiguration konnte nicht geladen werden.'], 500);
}

$missing = array_diff(REQUIRED_POINT_SETTINGS, array_keys($settings));
if ($missing) {
    error_log('get_point_config.php: fehlende point_settings: ' . implode(', ', $missing));
    sendResponse(['success' => false, 'message' => 'Punkte-Konfiguration unvollständig.'], 500);
}

sendResponse([
    'success' => true,
    'stations' => $stations,
    // (object): leeres Array soll als {} und nicht als [] ankommen
    'rewards' => (object) $rewards,
    'achievements' => $achievements,
    'settings' => $settings,
]);
