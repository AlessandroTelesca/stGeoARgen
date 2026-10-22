<?php
// Keine PHP-Fehler/Stacktraces (inkl. SQL-Details) an den Client ausgeben – nur ins Server-Log.
ini_set('display_errors', '0');
ini_set('log_errors', '1');

// Unbehandelte Ausnahmen (z. B. PDOException bei Duplicate Key) als generische JSON-Antwort
set_exception_handler(function (Throwable $e): void {
    error_log('Unbehandelte Ausnahme in ' . basename($_SERVER['SCRIPT_NAME'] ?? 'api') . ': ' . $e->getMessage());
    if (!headers_sent()) {
        http_response_code(500);
    }
    echo json_encode(['success' => false, 'message' => 'Interner Serverfehler.']);
});

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
 * Liest den Wert aus dem Header "Authorization: Bearer <wert>" ('' wenn keiner).
 */
function getBearerToken(): string {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($header === '' && function_exists('getallheaders')) {
        foreach (getallheaders() as $name => $value) {
            if (strcasecmp($name, 'Authorization') === 0) {
                $header = $value;
                break;
            }
        }
    }

    return preg_match('/^Bearer\s+(.+)$/i', trim($header), $m) ? trim($m[1]) : '';
}

/**
 * Bricht mit 401/503 ab, wenn der Request kein gültiges Admin-Passwort
 * im Header "Authorization: Bearer <passwort>" mitsendet.
 */
function requireAdmin(): void {
    if (ADMIN_PASSWORD === '') {
        sendResponse(['success' => false, 'message' => 'Stationsverwaltung ist nicht konfiguriert (ADMIN_PASSWORD fehlt).'], 503);
    }

    $token = getBearerToken();
    if ($token === '' || !hash_equals(ADMIN_PASSWORD, $token)) {
        usleep(500000); // bremst Brute-Force-Versuche
        sendResponse(['success' => false, 'message' => 'Admin-Passwort ungültig.'], 401);
    }
}

// ─── Nutzer-Sessions ──────────────────────────────────────────────────────────
// login.php/register.php erzeugen ein zufälliges Session-Token; in der DB liegt nur dessen
// SHA-256-Hash (Tabelle user_sessions). Alle nutzerbezogenen Endpunkte leiten die user_id
// ausschließlich aus "Authorization: Bearer <token>" ab, nie aus dem Request-Body.

const USER_SESSION_LIFETIME_DAYS = 30;

/**
 * Legt eine neue Session für den User an und gibt das Klartext-Token zurück.
 */
function createUserSession(PDO $db, int $userId): string {
    $token = bin2hex(random_bytes(32));
    $db->prepare(
        'INSERT INTO user_sessions (user_id, token_hash, expires_at)
         VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ' . USER_SESSION_LIFETIME_DAYS . ' DAY))'
    )->execute([$userId, hash('sha256', $token)]);

    // Abgelaufene Sessions dieses Users aufräumen
    $db->prepare('DELETE FROM user_sessions WHERE user_id = ? AND expires_at <= NOW()')->execute([$userId]);

    return $token;
}

/**
 * Liefert die user_id zum Session-Token des Requests oder bricht mit 401 ab.
 * Sendet der Client zusätzlich eine user_id mit ($claimedUserId), muss sie zum Token passen (sonst 403).
 */
function requireUser(PDO $db, $claimedUserId = null): int {
    $token = getBearerToken();
    if ($token === '' || strlen($token) > 200) {
        sendResponse(['success' => false, 'message' => 'Bitte erneut einloggen.'], 401);
    }

    $stmt = $db->prepare(
        'SELECT s.user_id FROM user_sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ? AND s.expires_at > NOW()
         LIMIT 1'
    );
    $stmt->execute([hash('sha256', $token)]);
    $session = $stmt->fetch();
    if (!$session) {
        sendResponse(['success' => false, 'message' => 'Sitzung abgelaufen. Bitte erneut einloggen.'], 401);
    }

    $userId = (int) $session['user_id'];
    if ($claimedUserId !== null && $claimedUserId !== '' && (int) $claimedUserId !== $userId) {
        sendResponse(['success' => false, 'message' => 'Kein Zugriff auf diese Daten.'], 403);
    }

    return $userId;
}
