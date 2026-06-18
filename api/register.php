<?php
/**
 * register.php – Neuen Benutzer registrieren
 * 
 * POST-Parameter (JSON body):
 *   username  – Benutzername (mind. 3 Zeichen)
 *   email     – E-Mail-Adresse
 *   password  – Passwort (mind. 6 Zeichen)
 *
 * Response (JSON):
 *   success: true  → { success, user: { id, username, email, created_at } }
 *   success: false → { success, message }
 */

require_once 'config.php';

// Nur POST erlauben
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Methode nicht erlaubt.'], 405);
}

// JSON-Body einlesen
$body = json_decode(file_get_contents('php://input'), true);

$username = trim($body['username'] ?? '');
$email    = trim($body['email'] ?? '');
$password = $body['password'] ?? '';

// Validierung
if (empty($username) || strlen($username) < 3) {
    sendResponse(['success' => false, 'message' => 'Benutzername muss mindestens 3 Zeichen lang sein.'], 400);
}
if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendResponse(['success' => false, 'message' => 'Ungültige E-Mail-Adresse.'], 400);
}
if (empty($password) || strlen($password) < 8) {
    sendResponse(['success' => false, 'message' => 'Passwort muss mindestens 8 Zeichen lang sein.'], 400);
}

$db = getDB();

// Prüfen ob E-Mail bereits registriert
$stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
$stmt->execute([$email]);
if ($stmt->fetch()) {
    sendResponse(['success' => false, 'message' => 'Diese E-Mail-Adresse ist bereits registriert.'], 409);
}

// Passwort hashen (bcrypt)
$passwordHash = password_hash($password, PASSWORD_BCRYPT);

// User einfügen
$stmt = $db->prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)');
$stmt->execute([$username, $email, $passwordHash]);
$userId = (int) $db->lastInsertId();

// Neu erstellten User abrufen
$stmt = $db->prepare('SELECT id, username, email, created_at FROM users WHERE id = ?');
$stmt->execute([$userId]);
$user = $stmt->fetch();

sendResponse([
    'success' => true,
    'user'    => $user,
]);
