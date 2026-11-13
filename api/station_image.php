<?php
/**
 * station_image.php – Liefert ein Stationsbild, eine Audiodatei bzw. ein 3D-Modell (GLB) aus api/uploads/stations/ mit den
 * CORS-Headern aus config.php aus. Nötig, weil nginx (Plesk) statische Dateien direkt ausliefert und
 * uploads/.htaccess ignoriert – ohne CORS-Header scheitert z. B. die 360°-Textur (WebGL)
 * beim Laden von localhost oder GitHub Pages.
 *
 * Unterstützt HTTP Range (ein Bereich pro Anfrage): iOS Safari spielt Audio ohne Range-Antworten nicht ab.
 *
 * GET station_image.php?file=<32 hex>.<jpg|png|webp|mp3|m4a|glb>
 */

require_once __DIR__ . '/custom_stations_lib.php';

const STATION_MEDIA_MIME_TYPES = [
    'jpg'  => 'image/jpeg',
    'png'  => 'image/png',
    'webp' => 'image/webp',
    'mp3'  => 'audio/mpeg',
    'm4a'  => 'audio/mp4',
    'glb'  => 'model/gltf-binary',
];
const STATION_STREAM_CHUNK_BYTES = 65536;

if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'HEAD') {
    sendResponse(['success' => false, 'message' => 'Nur GET erlaubt.'], 405);
}

$file = $_GET['file'] ?? null;
$path = isValidStationImageName($file) ? STATION_UPLOAD_DIR . '/' . $file : null;
if ($path === null || !is_file($path)) {
    sendResponse(['success' => false, 'message' => 'Datei nicht gefunden.'], 404);
}

$size = filesize($path);
$etag = '"' . md5_file($path) . '"';
header('Content-Type: ' . STATION_MEDIA_MIME_TYPES[pathinfo($path, PATHINFO_EXTENSION)]);
header('X-Content-Type-Options: nosniff');
header('Accept-Ranges: bytes');
// Dateinamen sind zufällig generiert und werden nie überschrieben → dauerhaft cachebar
header('Cache-Control: public, max-age=31536000, immutable');
header("ETag: $etag");

if (($_SERVER['HTTP_IF_NONE_MATCH'] ?? '') === $etag) {
    http_response_code(304);
    exit;
}

// Range: "bytes=start-end", "bytes=start-" oder "bytes=-suffix". Mit If-Range, das nicht zum ETag passt,
// wird die ganze Datei geliefert.
$start = 0;
$end = $size - 1;
$partial = false;
$range = $_SERVER['HTTP_RANGE'] ?? '';
$ifRange = $_SERVER['HTTP_IF_RANGE'] ?? '';
if ($range !== '' && ($ifRange === '' || $ifRange === $etag) && stripos($range, 'bytes=') === 0) {
    $valid = preg_match('/^bytes=(\d*)-(\d*)$/i', trim($range), $m) === 1 && ($m[1] !== '' || $m[2] !== '');
    if ($valid) {
        if ($m[1] === '') {
            // Die letzten N Bytes
            $suffix = (int) $m[2];
            $valid = $suffix > 0 && $size > 0;
            $start = max(0, $size - $suffix);
        } else {
            $start = (int) $m[1];
            $end = $m[2] === '' ? $size - 1 : min((int) $m[2], $size - 1);
            $valid = $start < $size && $end >= $start;
        }
    }
    if (!$valid) {
        http_response_code(416);
        header("Content-Range: bytes */$size");
        exit;
    }
    $partial = true;
}

$length = $end - $start + 1;
if ($partial) {
    http_response_code(206);
    header("Content-Range: bytes $start-$end/$size");
}
header('Content-Length: ' . $length);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!$partial) {
        readfile($path);
        exit;
    }
    $handle = fopen($path, 'rb');
    if ($handle === false) {
        exit;
    }
    fseek($handle, $start);
    $remaining = $length;
    while ($remaining > 0 && !feof($handle) && !connection_aborted()) {
        $chunk = fread($handle, min(STATION_STREAM_CHUNK_BYTES, $remaining));
        if ($chunk === false || $chunk === '') {
            break;
        }
        echo $chunk;
        $remaining -= strlen($chunk);
        flush();
    }
    fclose($handle);
}
