<?php
/**
 * Liest Zugangsdaten aus api/credentials.txt (Format: 'KEY', 'value').
 */
function loadDbCredentialsFromFile(string $filePath): array {
    if (!is_file($filePath) || !is_readable($filePath)) {
        return [];
    }

    $content = file_get_contents($filePath);
    if ($content === false) {
        return [];
    }

    $result = [];
    if (preg_match_all("/'([A-Z][A-Z0-9_]+)'\s*,\s*'([^']*)'/", $content, $matches, PREG_SET_ORDER)) {
        foreach ($matches as $match) {
            $result[$match[1]] = $match[2];
        }
    }

    return $result;
}


/**
 * Holt den ersten nicht-leeren Wert aus ENV, Datei oder Fallback.
 */
function resolveDbSetting(string $key, array $fileCreds, string $fallback): string {
    $envValue = getenv($key);
    if (is_string($envValue) && trim($envValue) !== '') {
        return trim($envValue);
    }

    if (!empty($fileCreds[$key])) {
        return trim((string) $fileCreds[$key]);
    }

    return $fallback;
}

$fileCredentials = loadDbCredentialsFromFile(__DIR__ . '/credentials.txt');

define('DB_HOST', resolveDbSetting('DB_HOST', $fileCredentials, 'localhost'));
define('DB_NAME', resolveDbSetting('DB_NAME', $fileCredentials, 'dein_datenbankname'));
define('DB_USER', resolveDbSetting('DB_USER', $fileCredentials, 'dein_db_user'));
define('DB_PASS', resolveDbSetting('DB_PASS', $fileCredentials, 'dein_db_passwort'));
define('DB_CHARSET', resolveDbSetting('DB_CHARSET', $fileCredentials, 'utf8mb4'));
// Admin-Passwort für die Stationsverwaltung (ENV oder credentials.txt: 'ADMIN_PASSWORD', '...').
// Leer = Stationsverwaltung deaktiviert.
define('ADMIN_PASSWORD', resolveDbSetting('ADMIN_PASSWORD', $fileCredentials, ''));

// CORS-Header: die konfigurierte Frontend-URL erlauben, zusätzlich localhost/127.0.0.1
// (beliebiger Port) für die lokale Entwicklung gegen die Server-API.
// Setze FRONTEND_URL als Umgebungsvariable, z.B. 'https://stgeoargen.iiius.de'
$prodOrigin = rtrim(getenv('FRONTEND_URL') ?: 'https://stgeoargen.iiius.de', '/');
$requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
$isLocalDev = (bool) preg_match('#^http://(localhost|127\.0\.0\.1)(:\d+)?$#', $requestOrigin);
$allowed_origin = $isLocalDev ? $requestOrigin : $prodOrigin;
header("Access-Control-Allow-Origin: $allowed_origin");
header("Vary: Origin");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

// Preflight OPTIONS-Request sofort beantworten
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

/**
 * Stellt eine PDO-Datenbankverbindung her.
 * Gibt die PDO-Instanz zurück oder beendet mit Fehlermeldung.
 */
function getDB(): PDO {
    if (DB_NAME === 'dein_datenbankname' || DB_USER === 'dein_db_user' || DB_PASS === 'dein_db_passwort') {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Datenbank ist nicht konfiguriert. Bitte DB_* in der Umgebung oder api/credentials.txt setzen.'
        ]);
        exit();
    }

    try {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
        return $pdo;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Datenbankverbindung fehlgeschlagen.']);
        exit();
    }
}

/**
 * Sendet eine JSON-Antwort und beendet das Skript.
 */
function sendResponse(array $data, int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode($data);
    exit();
}

/**
 * Bricht mit 401/503 ab, wenn der Request kein gültiges Admin-Passwort
 * im Header "Authorization: Bearer <passwort>" mitsendet.
 */
function requireAdmin(): void {
    if (ADMIN_PASSWORD === '') {
        sendResponse(['success' => false, 'message' => 'Stationsverwaltung ist nicht konfiguriert (ADMIN_PASSWORD fehlt).'], 503);
    }

    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($header === '' && function_exists('getallheaders')) {
        foreach (getallheaders() as $name => $value) {
            if (strcasecmp($name, 'Authorization') === 0) {
                $header = $value;
                break;
            }
        }
    }

    $token = preg_match('/^Bearer\s+(.+)$/i', trim($header), $m) ? $m[1] : '';
    if ($token === '' || !hash_equals(ADMIN_PASSWORD, $token)) {
        usleep(500000); // bremst Brute-Force-Versuche
        sendResponse(['success' => false, 'message' => 'Admin-Passwort ungültig.'], 401);
    }
}
