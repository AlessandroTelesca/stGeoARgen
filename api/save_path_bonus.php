<?php
/**
 * save_path_bonus.php – Speichert den Pfad‑Abschluss (kein Punkte-Bonus mehr)
 *
 * POST-Parameter (JSON body):
 *   user_id  – (optional) ID des Users, muss zum Session-Token passen
 *   Header: Authorization: Bearer <Session-Token>
 *   path_id  – ID des Pfades (z.B. "tourist")
 *
 * Response (JSON):
 *   success: true  → { success, message, already_claimed, bonus }
 *   success: false → { success, message }
 */

require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Methode nicht erlaubt.'], 405);
}

$body = json_decode(file_get_contents('php://input'), true);

$pathId = trim($body['path_id'] ?? '');
#$bonus  = 500; // server-side constant – not accepted from client

if (empty($pathId)) {
    sendResponse(['success' => false, 'message' => 'path_id fehlt.'], 400);
}

$db = getDB();
$userId = requireUser($db, $body['user_id'] ?? null);

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

// Pfad muss existieren: Stationen des Pfads aus fest eingebauten und eigenen (veröffentlichten) Stationen zählen
$totalStmt = $db->prepare(
    'SELECT (SELECT COUNT(*) FROM builtin_stations WHERE path_id = ?)
          + (SELECT COUNT(*) FROM custom_stations WHERE path_id = ? AND published = 1) AS total'
);
$totalStmt->execute([$pathId, $pathId]);
$totalStations = (int) $totalStmt->fetchColumn();

if ($totalStations === 0) {
    sendResponse(['success' => false, 'message' => 'Pfad nicht gefunden.'], 404);
}

// Alle Stationen des Pfads müssen vom User abgeschlossen sein
$doneStmt = $db->prepare(
    'SELECT COUNT(DISTINCT up.station_id) FROM user_progress up
     WHERE up.user_id = ? AND up.completed = 1 AND up.station_id <> 0
       AND (up.station_id IN (SELECT station_id FROM builtin_stations WHERE path_id = ?)
            OR up.station_id IN (SELECT id FROM custom_stations WHERE path_id = ? AND published = 1))'
);
$doneStmt->execute([$userId, $pathId, $pathId]);
if ((int) $doneStmt->fetchColumn() < $totalStations) {
    sendResponse([
        'success' => false,
        'message' => 'Der Pfad ist noch nicht abgeschlossen. Bitte schließe zuerst alle Stationen ab.',
    ], 409);
}

// Bonus als Sondereintrag speichern (station_id = 0 = Pfad-Abschluss-Bonus)
// INSERT IGNORE: bei parallelen Requests (Doppelklick) würde ein normales INSERT am
// Unique-Key (user_id, path_id, station_id) mit einem Serverfehler scheitern.
$stmt = $db->prepare(
    'INSERT IGNORE INTO user_progress (user_id, path_id, station_id, completed, completed_at)
     VALUES (?, ?, 0, 1, NOW())'
);
$stmt->execute([$userId, $pathId]);
if ($stmt->rowCount() === 0) {
    sendResponse([
        'success'         => true,
        'message'         => 'Bonus bereits vergeben.',
        'already_claimed' => true,
    ]);
}

// Pfadabschluss wird jetzt nur noch als Fortschritt gespeichert.
// Es werden keine Punkte mehr serverseitig addiert.
$bonus = 0;

sendResponse([
    'success'         => true,
    'message'         => "Pfadabschluss für '{$pathId}' gespeichert. Kein Punkte-Bonus mehr.",
    'already_claimed' => false,
    'bonus'           => $bonus,
]);
