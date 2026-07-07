<?php
require_once __DIR__ . '/config.php';

function sendJson(array $data, int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode($data);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJson(['success' => false, 'message' => 'Nur GET erlaubt.'], 405);
}

$stationId = isset($_GET['station_id']) ? (int) $_GET['station_id'] : 0;
if ($stationId <= 0) {
    sendJson(['success' => false, 'message' => 'Station fehlt.'], 400);
}

try {
    $pdo = getDB();
    $sql = 'SELECT id, station_id, melody, name, created_at FROM glockenspiel_melodies WHERE station_id = :station_id ORDER BY created_at DESC LIMIT 20';
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':station_id' => $stationId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    sendJson(['success' => true, 'melodies' => $rows]);
} catch (Throwable $e) {
    sendJson(['success' => false, 'message' => 'Abrufen fehlgeschlagen.'], 500);
}
