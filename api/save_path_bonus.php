<?php
/**
 * save_path_bonus.php – Speichert den 500-Punkte-Bonus beim Pfad-Abschluss
 *
 * POST-Parameter (JSON body):
 *   user_id  – ID des Users
 *   path_id  – ID des Pfades (z.B. "tourist")
 *   bonus    – Bonus-Punkte (Standard: 500)
 *
 * Response (JSON):
 *   success: true  → { success, message, already_claimed }
 *   success: false → { success, message }
 */

require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Methode nicht erlaubt.'], 405);
}

$body = json_decode(file_get_contents('php://input'), true);

$userId = filter_var($body['user_id'] ?? 0, FILTER_VALIDATE_INT);
$pathId = trim($body['path_id'] ?? '');
$bonus  = filter_var($body['bonus'] ?? 500, FILTER_VALIDATE_INT);

if (!$userId || $userId <= 0) {
    sendResponse(['success' => false, 'message' => 'Ungültige user_id.'], 400);
}
if (empty($pathId)) {
    sendResponse(['success' => false, 'message' => 'path_id fehlt.'], 400);
}
if (!$bonus || $bonus <= 0) {
    $bonus = 500;
}

$db = getDB();

// Prüfen ob der Bonus für diesen Pfad bereits vergeben wurde
// station_id = 0 ist der Konvention nach der "Pfad-Abschluss-Bonus"
$stmt = $db->prepare(
    'SELECT id FROM user_progress
     WHERE user_id = ? AND path_id = ? AND station_id = 0 AND completed = 1'
);
$stmt->execute([$userId, $pathId]);

if ($stmt->fetch()) {
    // Bonus wurde bereits vergeben
    sendResponse([
        'success'         => true,
        'message'         => 'Bonus bereits vergeben.',
        'already_claimed' => true,
    ]);
}

// Bonus als Sondereintrag speichern (station_id = 0 = Pfad-Abschluss-Bonus)
$stmt = $db->prepare(
    'INSERT INTO user_progress (user_id, path_id, station_id, completed, completed_at)
     VALUES (?, ?, 0, 1, NOW())'
);
$stmt->execute([$userId, $pathId]);

sendResponse([
    'success'         => true,
    'message'         => "Bonus von {$bonus} Punkten für Pfad '{$pathId}' vergeben.",
    'already_claimed' => false,
    'bonus'           => $bonus,
]);
