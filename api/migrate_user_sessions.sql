-- ============================================================
-- Migration: Session-Tokens für eingeloggte Nutzer:innen
-- EINMALIG in phpMyAdmin ausführen (Datenbank auswählen → SQL → einfügen → OK),
-- BEVOR das neue Backend/Frontend ausgeliefert wird.
-- Idempotent (IF NOT EXISTS) – ein zweiter Lauf ist harmlos.
--
-- Hintergrund: Bisher vertrauten alle nutzerbezogenen Endpunkte der user_id aus dem
-- Request – jede:r konnte mit einer fremden ID deren Punkte ausgeben, Gutscheincodes
-- lesen oder den Fortschritt löschen. Jetzt erzeugen login.php/register.php ein
-- zufälliges Token; gespeichert wird nur dessen SHA-256-Hash. Bestehende Logins im
-- Browser haben noch kein Token und müssen sich einmal neu anmelden.
-- ============================================================
CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id`          INT NOT NULL AUTO_INCREMENT,
  `user_id`     INT NOT NULL,
  `token_hash`  CHAR(64) NOT NULL,
  `expires_at`  DATETIME NOT NULL,
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_session_token_hash` (`token_hash`),
  KEY `idx_user_sessions_user_id` (`user_id`),
  CONSTRAINT `fk_user_sessions_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
