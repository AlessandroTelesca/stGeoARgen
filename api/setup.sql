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
-- Speichert Partner-Unternehmen für Gutschein-Validierung
CREATE TABLE IF NOT EXISTS `partners` (
  `id`            INT NOT NULL AUTO_INCREMENT,
  `username`      VARCHAR(100) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `name`          VARCHAR(255) NOT NULL,
  `address`       VARCHAR(255),
  `created_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_partner_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabelle: vouchers
-- Speichert Shop-Angebote / Gutschein-Typen
CREATE TABLE IF NOT EXISTS `vouchers` (
  `id`            INT NOT NULL AUTO_INCREMENT,
  `code`          VARCHAR(50) DEFAULT NULL,
  `description`   VARCHAR(255) NOT NULL,
  `points_value`  INT NOT NULL,
  `partner_id`    INT,
  `quantity`      INT NOT NULL DEFAULT 1,
  `expiry_date`   DATE,
  `active`        TINYINT(1) NOT NULL DEFAULT 1,
  `created_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_voucher_code` (`code`),
  KEY `idx_vouchers_partner_id` (`partner_id`),
  KEY `idx_vouchers_active` (`active`),
  CONSTRAINT `fk_vouchers_partner`
    FOREIGN KEY (`partner_id`) REFERENCES `partners` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabelle: user_vouchers
-- Speichert gekaufte Gutscheine für Benutzer
CREATE TABLE IF NOT EXISTS `user_vouchers` (
  `id`             INT NOT NULL AUTO_INCREMENT,
  `user_id`        INT NOT NULL,
  `voucher_id`     INT DEFAULT NULL,
  `code`           VARCHAR(50) NOT NULL,
  `description`    VARCHAR(255) NOT NULL,
  `partner_id`     INT,
  `points_value`   INT NOT NULL,
  `is_redeemed`    TINYINT(1) NOT NULL DEFAULT 0,
  `redeemed_by`    VARCHAR(255) DEFAULT NULL,
  `redeemed_at`    DATETIME DEFAULT NULL,
  `expiry_date`    DATE DEFAULT NULL,
  `remaining_uses` INT NOT NULL DEFAULT 1,
  `purchased_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_voucher_code` (`code`),
  KEY `idx_user_vouchers_user_id` (`user_id`),
  KEY `idx_user_vouchers_voucher_id` (`voucher_id`),
  CONSTRAINT `fk_user_vouchers_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_user_vouchers_voucher`
    FOREIGN KEY (`voucher_id`) REFERENCES `vouchers` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_user_vouchers_partner`
    FOREIGN KEY (`partner_id`) REFERENCES `partners` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `glockenspiel_melodies` (
  `id`           INT NOT NULL AUTO_INCREMENT,
  `station_id`   INT NOT NULL,
  `melody`       VARCHAR(255) NOT NULL,
  `name`         VARCHAR(120) NOT NULL DEFAULT 'Glockenspiel-Melodie',
  `created_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_glockenspiel_melodies_station_id` (`station_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabelle: custom_stations
-- Über die Stationsverwaltung (/admin/stations) angelegte Stationen.
-- IDs starten bei 1000, damit sie nie mit den fest eingebauten Stationen (1–99) kollidieren.
-- cover_image: Profilbild (Dateiname in api/uploads/stations/), erscheint in Listen und als Titelbild
-- slides: JSON-Array der Bildfolge [{ "image", "text_de", "text_en" }], wird beim Start der Station durchgeklickt
-- quiz_options_*: JSON-Array mit Antwortoptionen
CREATE TABLE IF NOT EXISTS `custom_stations` (
  `id`                   INT NOT NULL AUTO_INCREMENT,
  `path_id`              VARCHAR(100) NOT NULL,
  `title_de`             VARCHAR(150) NOT NULL,
  `title_en`             VARCHAR(150) DEFAULT NULL,
  `description_de`       VARCHAR(255) NOT NULL,
  `description_en`       VARCHAR(255) DEFAULT NULL,
  `long_description_de`  TEXT NOT NULL,
  `long_description_en`  TEXT DEFAULT NULL,
  `cover_image`          VARCHAR(64) NOT NULL,
  `slides`               MEDIUMTEXT NOT NULL,
  `points`               INT NOT NULL DEFAULT 50,
  `latitude`             DOUBLE NOT NULL,
  `longitude`            DOUBLE NOT NULL,
  `quiz_question_de`     VARCHAR(255) DEFAULT NULL,
  `quiz_question_en`     VARCHAR(255) DEFAULT NULL,
  `quiz_options_de`      TEXT DEFAULT NULL,
  `quiz_options_en`      TEXT DEFAULT NULL,
  `quiz_correct_answer`  TINYINT DEFAULT NULL,
  `created_at`           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_custom_stations_path_id` (`path_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1000 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration für eine bereits angelegte custom_stations-Tabelle (Version mit Spalte `images`).
-- Vorhandene Stationen behalten ihr erstes Bild als Profilbild und bekommen eine leere Bildfolge;
-- sie müssen danach in der Stationsverwaltung um Bilder mit Texten ergänzt werden.
-- ALTER TABLE `custom_stations`
--   ADD COLUMN `cover_image` VARCHAR(64) NOT NULL DEFAULT '' AFTER `long_description_en`,
--   ADD COLUMN `slides` MEDIUMTEXT NULL AFTER `cover_image`;
-- UPDATE `custom_stations` SET `cover_image` = JSON_UNQUOTE(JSON_EXTRACT(`images`, '$[0]')), `slides` = '[]';
-- ALTER TABLE `custom_stations` DROP COLUMN `images`, MODIFY `slides` MEDIUMTEXT NOT NULL, ALTER `cover_image` DROP DEFAULT;
