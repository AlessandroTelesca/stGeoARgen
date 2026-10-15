<?php
/**
 * save_progress.php – Stations-Abschluss eines Users speichern
 *
 * POST-Parameter (JSON body):
 *   user_id    – ID des Users
 *   path_id    – ID des Pfades (z.B. "tourist")
 *   station_id – ID der Station (Zahl)
 *
 * Response (JSON):
 *   success: true  → { success, message }
 *   success: false → { success, message }
 */

require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Methode nicht erlaubt.'], 405);
}

$body = json_decode(file_get_contents('php://input'), true);

$userId    = filter_var($body['user_id'] ?? 0, FILTER_VALIDATE_INT);
$pathId    = trim($body['path_id'] ?? '');
$stationId = filter_var($body['station_id'] ?? 0, FILTER_VALIDATE_INT);

if (!$userId || $userId <= 0) {
    sendResponse(['success' => false, 'message' => 'Ungültige user_id.'], 400);
}
if (empty($pathId)) {
    sendResponse(['success' => false, 'message' => 'path_id fehlt.'], 400);
}
if (!$stationId || $stationId <= 0) {
    sendResponse(['success' => false, 'message' => 'Ungültige station_id.'], 400);
}

$db = getDB();

// Prüfen ob der User existiert
$stmt = $db->prepare('SELECT id FROM users WHERE id = ?');
$stmt->execute([$userId]);
if (!$stmt->fetch()) {
    sendResponse(['success' => false, 'message' => 'User nicht gefunden.'], 404);
}

// Punkte der Station: fest eingebaute Stationen 50, Custom-Stationen (ID >= 1000) laut DB
$stationPoints = 50;
if ($stationId >= 1000) {
    $stmt = $db->prepare('SELECT points FROM custom_stations WHERE id = ? AND path_id = ?');
    $stmt->execute([$stationId, $pathId]);
    $customStation = $stmt->fetch();
    if (!$customStation) {
        sendResponse(['success' => false, 'message' => 'Station nicht gefunden.'], 404);
    }
    $stationPoints = (int) $customStation['points'];
}

// Bereits gespeichert? Dann nur idempotent antworten, keine Punkte erneut vergeben.
$stmt = $db->prepare(
    'SELECT id FROM user_progress WHERE user_id = ? AND path_id = ? AND station_id = ? LIMIT 1'
);
$stmt->execute([$userId, $pathId, $stationId]);
$existing = $stmt->fetch();

if ($existing) {
    sendResponse([
        'success' => true,
        'message' => 'Fortschritt bereits gespeichert.',
        'points_awarded' => 0,
    ]);
}

$stmt = $db->prepare(
    'INSERT INTO user_progress (user_id, path_id, station_id, completed, completed_at)
     VALUES (?, ?, ?, 1, NOW())'
);
$stmt->execute([$userId, $pathId, $stationId]);

$db->prepare('UPDATE users SET total_points = total_points + ? WHERE id = ?')
   ->execute([$stationPoints, $userId]);

$userPointsStmt = $db->prepare('SELECT total_points FROM users WHERE id = ?');
$userPointsStmt->execute([$userId]);
$userPoints = $userPointsStmt->fetch();

sendResponse([
    'success' => true,
    'message' => 'Fortschritt gespeichert.',
    'points_awarded' => $stationPoints,
    'total_points' => (int)($userPoints['total_points'] ?? 0),
]);