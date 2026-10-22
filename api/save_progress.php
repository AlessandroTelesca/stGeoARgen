<?php
/**
 * save_progress.php – Stations-Abschluss eines Users speichern
 *
 * POST-Parameter (JSON body):
 *   user_id    – (optional) ID des Users, muss zum Session-Token passen
 *   Header: Authorization: Bearer <Session-Token>
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

$pathId    = trim($body['path_id'] ?? '');
$stationId = filter_var($body['station_id'] ?? 0, FILTER_VALIDATE_INT);

if (empty($pathId)) {
    sendResponse(['success' => false, 'message' => 'path_id fehlt.'], 400);
}
if (!$stationId || $stationId <= 0) {
    sendResponse(['success' => false, 'message' => 'Ungültige station_id.'], 400);
}

$db = getDB();
$userId = requireUser($db, $body['user_id'] ?? null);

// Punkte der Station laut DB: fest eingebaute Stationen aus builtin_stations, Custom-Stationen
// (ID >= 1000) aus custom_stations. Unbekannte Stationen werden abgelehnt, sonst ließe sich mit
// beliebigen path_id/station_id-Kombinationen Punkte sammeln.
$stmt = $db->prepare(
    $stationId >= 1000
        ? 'SELECT points FROM custom_stations WHERE id = ? AND path_id = ?'
        : 'SELECT points FROM builtin_stations WHERE station_id = ? AND path_id = ?'
);
$stmt->execute([$stationId, $pathId]);
$station = $stmt->fetch();
if (!$station) {
    sendResponse(['success' => false, 'message' => 'Station nicht gefunden.'], 404);
}
$stationPoints = (int) $station['points'];

// Stations-IDs sind pfadübergreifend eindeutig. Wurde eine Custom-Station in der Stationsverwaltung
// in einen anderen Pfad verschoben, greift der Unique-Key (user_id, path_id, station_id) nicht –
// daher pro User sperren und nach station_id in allen Pfaden prüfen.
$db->beginTransaction();
$db->prepare('SELECT id FROM users WHERE id = ? FOR UPDATE')->execute([$userId]);
$stmt = $db->prepare('SELECT 1 FROM user_progress WHERE user_id = ? AND station_id = ? LIMIT 1');
$stmt->execute([$userId, $stationId]);
if ($stmt->fetch()) {
    $db->rollBack();
    sendResponse([
        'success' => true,
        'message' => 'Fortschritt bereits gespeichert.',
        'points_awarded' => 0,
    ]);
}

// INSERT IGNORE + rowCount: bereits gespeichert (auch bei parallelen Requests) → keine Punkte erneut vergeben.
$stmt = $db->prepare(
    'INSERT IGNORE INTO user_progress (user_id, path_id, station_id, completed, completed_at)
     VALUES (?, ?, ?, 1, NOW())'
);
$stmt->execute([$userId, $pathId, $stationId]);
if ($stmt->rowCount() === 0) {
    $db->rollBack();
    sendResponse([
        'success' => true,
        'message' => 'Fortschritt bereits gespeichert.',
        'points_awarded' => 0,
    ]);
}

$db->prepare('UPDATE users SET total_points = total_points + ? WHERE id = ?')
   ->execute([$stationPoints, $userId]);
$db->commit();

$userPointsStmt = $db->prepare('SELECT total_points FROM users WHERE id = ?');
$userPointsStmt->execute([$userId]);
$userPoints = $userPointsStmt->fetch();

sendResponse([
    'success' => true,
    'message' => 'Fortschritt gespeichert.',
    'points_awarded' => $stationPoints,
    'total_points' => (int)($userPoints['total_points'] ?? 0),
]);