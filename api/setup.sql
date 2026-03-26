-- ============================================================
-- StGeoARgen – Datenbank-Setup
-- Führe dieses SQL einmalig in phpMyAdmin aus:
-- phpMyAdmin → Deine Datenbank auswählen → SQL → Einfügen → Ausführen
-- ============================================================

-- Tabelle: users
-- Speichert registrierte Benutzer
CREATE TABLE IF NOT EXISTS `users` (
  `id`            INT NOT NULL AUTO_INCREMENT,
  `username`      VARCHAR(100) NOT NULL,
  `email`         VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `total_points`  INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabelle: user_progress
-- Speichert welche Stationen ein User abgeschlossen hat
CREATE TABLE IF NOT EXISTS `user_progress` (
  `id`           INT NOT NULL AUTO_INCREMENT,
  `user_id`      INT NOT NULL,
  `path_id`      VARCHAR(100) NOT NULL,
  `station_id`   INT NOT NULL,
  `completed`    TINYINT(1) NOT NULL DEFAULT 1,
  `completed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_progress` (`user_id`, `path_id`, `station_id`),
  CONSTRAINT `fk_user_progress_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabelle: partners
-- Speichert Unternehmens-Login
CREATE TABLE IF NOT EXISTS `partners` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `address` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabelle: vouchers
-- Allgemeine und Partner-Gutscheine
CREATE TABLE IF NOT EXISTS `vouchers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `partner_id` INT DEFAULT NULL,
  `is_redeemed` TINYINT(1) NOT NULL DEFAULT 0,
  `points_value` INT DEFAULT NULL,
  `redeemed_by` VARCHAR(255) DEFAULT NULL,
  `redeemed_at` TIMESTAMP NULL DEFAULT NULL,
  `expiry_date` DATE DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_code` (`code`),
  CONSTRAINT `fk_voucher_partner`
    FOREIGN KEY (`partner_id`) REFERENCES `partners` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Testdaten: Partners
INSERT INTO partners (name, username, password) VALUES
('Partner A', 'partnera', 'geheim123'),
('Partner B', 'partnerb', 'passwort456');

-- Testdaten: vouchers
INSERT INTO vouchers (code, description, partner_id, is_redeemed, points_value) VALUES
('TESTCODE1', 'Testgutschein 1', NULL, 0, 5000),
('TESTCODE2', 'Testgutschein 2', NULL, 0, 75),
('OSTERN2026', 'Osteraktion 2026', NULL, 0, 100),
('WILLKOMMEN', 'Willkommensgutschein', NULL, 0, 20),
('SOMMERBONUS', 'Sommer-Bonus 2026', NULL, 0, 30),
('PARTNER-A-10', '10%-Rabatt in Partner A', 1, 0, 5000),
('PARTNER-A-FREI', 'Freier Eintritt Partner A', 1, 0, 0),
('PARTNER-B-5', '5€ Gutschein bei Partner B', 2, 0, 5);
