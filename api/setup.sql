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
  `total_points`  INT NOT NULL DEFAULT 0,
  `created_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
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

-- Tabelle: password_resets
-- Speichert zeitlich begrenzte Reset-Tokens fuer Passwort-Resets
CREATE TABLE IF NOT EXISTS `password_resets` (
  `id`          INT NOT NULL AUTO_INCREMENT,
  `user_id`     INT NOT NULL,
  `email`       VARCHAR(255) NOT NULL,
  `token_hash`  CHAR(64) NOT NULL,
  `expires_at`  DATETIME NOT NULL,
  `used_at`     DATETIME NULL,
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_token_hash` (`token_hash`),
  KEY `idx_password_resets_user_id` (`user_id`),
  KEY `idx_password_resets_expires_at` (`expires_at`),
  CONSTRAINT `fk_password_resets_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabelle: user_rewards
-- Speichert einmalige Sonderbelohnungen (z.B. Schatzkiste)
CREATE TABLE IF NOT EXISTS `user_rewards` (
  `id`           INT NOT NULL AUTO_INCREMENT,
  `user_id`      INT NOT NULL,
  `reward_key`   VARCHAR(120) NOT NULL,
  `points`       INT NOT NULL DEFAULT 50,
  `claimed_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_reward` (`user_id`, `reward_key`),
  CONSTRAINT `fk_user_rewards_user`
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
  `purchased_by_user_id` INT DEFAULT NULL,
  `purchased_at` TIMESTAMP NULL DEFAULT NULL,
  `is_redeemed` TINYINT(1) NOT NULL DEFAULT 0,
  `points_value` INT DEFAULT NULL,
  `redeemed_by` VARCHAR(255) DEFAULT NULL,
  `redeemed_at` TIMESTAMP NULL DEFAULT NULL,
  `expiry_date` DATE DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_code` (`code`),
  KEY `idx_vouchers_purchased_by_user` (`purchased_by_user_id`),
  CONSTRAINT `fk_voucher_partner`
    FOREIGN KEY (`partner_id`) REFERENCES `partners` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_voucher_user`
    FOREIGN KEY (`purchased_by_user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Partner
INSERT INTO partners (name, username, password, address) VALUES
('Cafe Schwarzwald', 'cafe.schwarzwald', 'cafe1234', 'Hauptstraße 12, St.Georgen'),
('Stadtmuseum St.Georgen', 'stadtmuseum', 'museum1234', 'Kulturplatz 5, St.Georgen'),
('Schwarzwald Souvenirs', 'souvenirs', 'souvenir1234', 'Marktstraße 23, St.Georgen'),
('Restaurant Zum Drachen', 'zumdrachen', 'drachen1234', 'Drachengasse 8, St.Georgen'),
('Schwarzwald-Baeckerei', 'baeckerei', 'baeckerei1234', 'Bäckerstraße 15, St.Georgen'),
('Wellness Schwarzwald', 'wellness', 'wellness1234', 'Kurstraße 42, St.Georgen');

-- kaufbare Gutscheine 
INSERT INTO vouchers (code, description, partner_id, is_redeemed, points_value, expiry_date) VALUES
('CAFE-10', '10% Rabatt auf alle Speisen und Getränke', 1, 0, 50, DATE_ADD(CURDATE(), INTERVAL 30 DAY)),
('MUSEUM-FREI', 'Freier Eintritt für eine Person', 2, 0, 100, DATE_ADD(CURDATE(), INTERVAL 30 DAY)),
('SOUVENIR-15', '15% Rabatt auf alle Artikel', 3, 0, 150, DATE_ADD(CURDATE(), INTERVAL 30 DAY)),
('DRACHEN-DESSERT', 'Gratis Dessert bei Hauptgericht', 4, 0, 180, DATE_ADD(CURDATE(), INTERVAL 30 DAY)),
('BAECKEREI-2ZU1', '2 Kaffee zum Preis von 1', 5, 0, 200, DATE_ADD(CURDATE(), INTERVAL 30 DAY)),
('WELLNESS-20', '20% auf alle Wellness-Angebote', 6, 0, 225, DATE_ADD(CURDATE(), INTERVAL 30 DAY));
