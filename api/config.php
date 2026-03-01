<?php
// ============================================================
// BITTE HIER DEINE ZUGANGSDATEN EINTRAGEN!
// ============================================================
define('DB_HOST', 'localhost');          // meist localhost
define('DB_NAME', 'dein_datenbankname');  // Name der DB in phpMyAdmin
define('DB_USER', 'dein_db_user');        // DB-Benutzername
define('DB_PASS', 'dein_db_passwort');    // DB-Passwort
define('DB_CHARSET', 'utf8mb4');
// ============================================================

// CORS-Header: erlaubt Anfragen vom React-Frontend
// WICHTIG: Ersetze '*' mit deiner tatsächlichen Frontend-URL in Produktion
// z.B.: 'https://deine-app.de'
$allowed_origin = '*';
header("Access-Control-Allow-Origin: $allowed_origin");
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
