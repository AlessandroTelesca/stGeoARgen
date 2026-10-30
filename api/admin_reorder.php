<?php
/**
 * admin_reorder.php – Setzt die Reihenfolge von Pfaden oder Stationen (nur Admin)
 *
 * POST (JSON body): { kind: "paths" | "stations", ids: [...] }
 *   ids – in gewünschter Reihenfolge, max. 500; Pfad-IDs (Strings) bzw. Stations-IDs (Zahlen).
 *         Bei "stations" die Stationen eines Pfads, bei "paths" alle Custom-Pfade.
 * sort_order wird auf die Position in der Liste gesetzt (0, 1, 2, …).
 *
 * Response: { success, message }
 */

require_once __DIR__ . '/custom_stations_lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Nur POST erlaubt.'], 405);
}

requireAdmin();

$body = json_decode(file_get_contents('php://input'), true);
$kind = is_array($body) ? ($body['kind'] ?? null) : null;
if ($kind !== 'paths' && $kind !== 'stations') {
    fail('Ungültige Art der Sortierung.');
}

$idsInput = $body['ids'] ?? null;
if (!is_array($idsInput) || count($idsInput) < 1 || count($idsInput) > 500) {
    fail('Ungültige Liste (1 bis 500 Einträge erlaubt).');
}

$ids = [];
foreach (array_values($idsInput) as $value) {
    if ($kind === 'stations') {
        $id = filter_var($value, FILTER_VALIDATE_INT);
        if ($id === false || $id <= 0) {
            fail('Ungültige Stations-ID.');
        }
    } else {
        $id = is_string($value) ? trim($value) : '';
        if (!preg_match('/^[a-z0-9-]{1,100}$/', $id) || in_array($id, BUILTIN_PATH_IDS, true)) {
            fail('Ungültige Pfad-ID.');
        }
    }
    if (in_array($id, $ids, true)) {
        fail('Die Liste enthält doppelte Einträge.');
    }
    $ids[] = $id;
}

try {
    $db = getDB();
    $db->beginTransaction();
    $stmt = $db->prepare(
        $kind === 'stations'
            ? 'UPDATE custom_stations SET sort_order = ? WHERE id = ?'
            : 'UPDATE custom_paths SET sort_order = ? WHERE id = ?'
    );
    foreach ($ids as $position => $id) {
        $stmt->execute([$position, $id]);
    }
    $db->commit();

    sendResponse(['success' => true, 'message' => 'Reihenfolge gespeichert.']);
} catch (Throwable $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    error_log('admin_reorder.php: ' . $e->getMessage());
    sendResponse(['success' => false, 'message' => 'Reihenfolge konnte nicht gespeichert werden.'], 500);
}
