<?php
/**
 * reset_progress.php - Gesamten Fortschritt eines Users zuruecksetzen
 * (abgeschlossene Stationen, Pfad-Abschlüsse, Sonderbelohnungen), damit alles erneut spielbar ist.
 * Punktestand, gekaufte Gutscheine und bereits ausgezahlte Punkte (user_point_awards) bleiben
 * erhalten – sonst ließen sich durch Zurücksetzen beliebig viele Gutscheine erspielen.
 *
 * POST-Parameter (JSON body):
 *   user_id - (optional) ID des Users, muss zum Session-Token passen
 *   Header: Authorization: Bearer <Session-Token>
 *
 * Response (JSON):
 *   success: true  -> { success, message, deleted_rows }
 *   success: false -> { success, message }
 */

require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Methode nicht erlaubt.'], 405);
}

$body = json_decode(file_get_contents('php://input'), true);
$db = getDB();
$userId = requireUser($db, is_array($body) ? ($body['user_id'] ?? null) : null);

$db->beginTransaction();
try {
    $deleteStmt = $db->prepare('DELETE FROM user_progress WHERE user_id = ?');
    $deleteStmt->execute([$userId]);
    $db->prepare('DELETE FROM user_rewards WHERE user_id = ?')->execute([$userId]);
    $db->commit();
} catch (Throwable $e) {
    $db->rollBack();
    sendResponse(['success' => false, 'message' => 'Fortschritt konnte nicht zurueckgesetzt werden.'], 500);
}

sendResponse([
    'success' => true,
    'message' => 'Fortschritt wurde zurueckgesetzt.',
    'deleted_rows' => $deleteStmt->rowCount(),
]);
