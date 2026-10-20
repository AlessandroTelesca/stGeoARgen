<?php
/**
 * admin_verify.php – Prüft das Admin-Passwort (Header "Authorization: Bearer <passwort>")
 *
 * Response: { success, message }
 */

require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Nur POST erlaubt.'], 405);
}

requireAdmin();
sendResponse(['success' => true, 'message' => 'Angemeldet.']);
