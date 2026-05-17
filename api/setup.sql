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
-- Speichert Gutscheine und deren Status
CREATE TABLE IF NOT EXISTS `vouchers` (
  `id`            INT NOT NULL AUTO_INCREMENT,
  `code`          VARCHAR(50) NOT NULL,
  `description`   VARCHAR(255) NOT NULL,
  `points_value`  INT NOT NULL,
  `partner_id`    INT,
  `is_redeemed`   TINYINT(1) NOT NULL DEFAULT 0,
  `redeemed_by`   VARCHAR(255),
  `redeemed_at`   DATETIME,
  `expiry_date`   DATE,
  `created_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_voucher_code` (`code`),
  KEY `idx_vouchers_partner_id` (`partner_id`),
  KEY `idx_vouchers_is_redeemed` (`is_redeemed`),
  CONSTRAINT `fk_vouchers_partner`
    FOREIGN KEY (`partner_id`) REFERENCES `partners` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabelle: user_vouchers
-- Speichert welche Gutscheine ein User gekauft hat
CREATE TABLE IF NOT EXISTS `user_vouchers` (
  `id`           INT NOT NULL AUTO_INCREMENT,
  `user_id`      INT NOT NULL,
  `voucher_id`   INT NOT NULL,
  `purchased_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_voucher` (`user_id`, `voucher_id`),
  CONSTRAINT `fk_user_vouchers_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_user_vouchers_voucher`
    FOREIGN KEY (`voucher_id`) REFERENCES `vouchers` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;