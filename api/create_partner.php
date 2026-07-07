<?php
// create_partner.php
// Skript zum Erstellen eines neuen Partners mit gehashtem Passwort
// Nur über die Kommandozeile ausführbar (php create_partner.php) –
// darf niemals über den Webserver erreichbar sein.

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('Dieses Skript kann nur über die Kommandozeile ausgeführt werden.');
}

require_once 'config.php';
$pdo = getDB();

// === HIER DIE PARTNER-DATEN ÄNDERN ===
$username = 'partner_username';     // Login-Name für Partner
$password = 'partner456';      // Sicheres Passwort
$name = 'Partner Firmenname';        // Anzeigename
$address = 'Straße 123, St.Georgen'; // Adresse (optional)
// === ENDE ÄNDERUNGEN ===

// Prüfe, ob die Spalte password_hash existiert
$result = $pdo->query("SHOW COLUMNS FROM partners LIKE 'password_hash'");
$hasPasswordHash = $result->rowCount() > 0;

$column = $hasPasswordHash ? 'password_hash' : 'password';

// Hash das Passwort
$hash = password_hash($password, PASSWORD_BCRYPT);

// Füge den Partner ein
$stmt = $pdo->prepare("INSERT INTO partners (username, $column, name, address) VALUES (?, ?, ?, ?)");
try {
    $stmt->execute([$username, $hash, $name, $address]);
    echo "✅ Partner '$username' wurde erfolgreich erstellt!\n";
    echo "Firmenname: $name\n";
    echo "Adresse: $address\n";
    echo "Passwort wurde sicher gehasht.\n";
} catch (Exception $e) {
    echo " Fehler beim Erstellen des Partners: " . $e->getMessage() . "\n";
}
?>