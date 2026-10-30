<?php
/**
 * admin_set_published.php – Veröffentlicht einen Pfad oder eine Station bzw. macht sie zum Entwurf (nur Admin)
 *
 * POST (JSON body): { kind: "path" | "station", id, published: bool }
 *   id – Pfad-ID (String) bzw. Stations-ID (Zahl)
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
if ($kind !== 'path' && $kind !== 'station') {
    fail('Ungültige Art (path oder station).');
}

if ($kind === 'station') {
    $id = filter_var($body['id'] ?? 0, FILTER_VALIDATE_INT);
    if (!$id || $id <= 0) {
        fail('Ungültige Stations-ID.');
    }
} else {
    $id = trim((string) ($body['id'] ?? ''));
    if (!preg_match('/^[a-z0-9-]{1,100}$/', $id) || in_array($id, BUILTIN_PATH_IDS, true)) {
        fail('Dieser Pfad kann nicht bearbeitet werden.');
    }
}

$published = isset($body['published']) ? filter_var($body['published'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) : null;
if ($published === null) {
    fail('Ungültiger Wert für „Veröffentlicht“.');
}

try {
    $db = getDB();
    $table = $kind === 'station' ? 'custom_stations' : 'custom_paths';

    $stmt = $db->prepare("SELECT 1 FROM $table WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        sendResponse(['success' => false, 'message' => $kind === 'station' ? 'Station nicht gefunden.' : 'Pfad nicht gefunden.'], 404);
    }

    $db->prepare("UPDATE $table SET published = ? WHERE id = ?")->execute([$published ? 1 : 0, $id]);

    sendResponse(['success' => true, 'message' => $published ? 'Veröffentlicht.' : 'Als Entwurf gespeichert.']);
} catch (Throwable $e) {
    error_log('admin_set_published.php: ' . $e->getMessage());
    sendResponse(['success' => false, 'message' => 'Status konnte nicht geändert werden.'], 500);
}
