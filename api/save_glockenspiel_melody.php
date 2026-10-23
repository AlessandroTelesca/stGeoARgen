<?php
require_once __DIR__ . '/config.php';

function sendJson(array $data, int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode($data);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJson(['success' => false, 'message' => 'Nur POST erlaubt.'], 405);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    sendJson(['success' => false, 'message' => 'Ungültige Daten.'], 400);
}

$stationId = isset($input['station_id']) ? (int) $input['station_id'] : 0;
$melody = isset($input['melody']) ? $input['melody'] : '';
$name = isset($input['name']) ? trim((string) $input['name']) : '';

if ($stationId <= 0 || $melody === '') {
    sendJson(['success' => false, 'message' => 'Station oder Melodie fehlt.'], 400);
}

if ($name === '') {
    $name = 'Glockenspiel-Melodie';
}

try {
    $pdo = getDB();
    // Nur eingeloggte User dürfen Melodien speichern (Gäste haben kein Session-Token).
    requireUser($pdo);
    $pdo->beginTransaction();

    $sql = 'INSERT INTO glockenspiel_melodies (station_id, melody, name, created_at) VALUES (:station_id, :melody, :name, NOW())';
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':station_id' => $stationId,
        ':melody' => $melody,
        ':name' => $name,
    ]);

    $newId = (int) $pdo->lastInsertId();
    $deleteSql = 'DELETE FROM glockenspiel_melodies WHERE station_id = :station_id AND id != :current_id';
    $deleteStmt = $pdo->prepare($deleteSql);
    $deleteStmt->execute([
        ':station_id' => $stationId,
        ':current_id' => $newId,
    ]);

    $pdo->commit();
    sendJson(['success' => true, 'message' => 'Melodie gespeichert.', 'id' => $newId]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendJson(['success' => false, 'message' => 'Speichern fehlgeschlagen.'], 500);
}
