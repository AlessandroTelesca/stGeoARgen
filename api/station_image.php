<?php
/**
 * station_image.php – Liefert ein Stationsbild aus api/uploads/stations/ mit den CORS-Headern
 * aus config.php aus. Nötig, weil nginx (Plesk) statische Dateien direkt ausliefert und
 * uploads/.htaccess ignoriert – ohne CORS-Header scheitert z. B. die 360°-Textur (WebGL)
 * beim Laden von localhost oder GitHub Pages.
 *
 * GET station_image.php?file=<32 hex>.<jpg|png|webp>
 */

require_once __DIR__ . '/custom_stations_lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'HEAD') {
    sendResponse(['success' => false, 'message' => 'Nur GET erlaubt.'], 405);
}

$file = $_GET['file'] ?? null;
$path = isValidStationImageName($file) ? STATION_UPLOAD_DIR . '/' . $file : null;
if ($path === null || !is_file($path)) {
    sendResponse(['success' => false, 'message' => 'Bild nicht gefunden.'], 404);
}

$etag = '"' . md5_file($path) . '"';
header('Content-Type: ' . array_search(pathinfo($path, PATHINFO_EXTENSION), STATION_IMAGE_TYPES, true));
header('X-Content-Type-Options: nosniff');
// Dateinamen sind zufällig generiert und werden nie überschrieben → dauerhaft cachebar
header('Cache-Control: public, max-age=31536000, immutable');
header("ETag: $etag");

if (($_SERVER['HTTP_IF_NONE_MATCH'] ?? '') === $etag) {
    http_response_code(304);
    exit;
}

header('Content-Length: ' . filesize($path));
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    readfile($path);
}
