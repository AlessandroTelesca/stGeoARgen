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

-- Tabelle: user_sessions
-- Session-Tokens eingeloggter User (nur SHA-256-Hash des Tokens). Alle nutzerbezogenen
-- Endpunkte leiten die user_id aus "Authorization: Bearer <token>" ab.
-- Bestehende DB: einmalig api/migrate_user_sessions.sql ausführen.
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

-- Tabelle: user_point_awards
-- Merkt sich jede Punkte-Auszahlung (award_key "station:<id>" bzw. "reward:<key>"). Bleibt bei
-- "Fortschritt zurücksetzen" erhalten, damit Stationen nicht erneut Punkte geben.
-- Bestehende DB: einmalig api/migrate_point_awards.sql ausführen.
CREATE TABLE IF NOT EXISTS `user_point_awards` (
  `id`          INT NOT NULL AUTO_INCREMENT,
  `user_id`     INT NOT NULL,
  `award_key`   VARCHAR(140) NOT NULL,
  `awarded_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_point_award` (`user_id`, `award_key`),
  CONSTRAINT `fk_user_point_awards_user`
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
-- station_type: 'image_sequence' = Bildfolge mit Texten (+ optional eine Quizfrage in quiz_*),
--               'panorama_quiz'  = 360°-Bild (panorama_image) mit Quiz (quiz_questions, JSON-Array)
-- Bestehende Tabelle ohne diese Spalten: einmalig api/migrate_panorama_stations.sql ausführen.
CREATE TABLE IF NOT EXISTS `custom_stations` (
  `id`                   INT NOT NULL AUTO_INCREMENT,
  `path_id`              VARCHAR(100) NOT NULL,
  `title_de`             VARCHAR(150) NOT NULL,
  `title_en`             VARCHAR(150) DEFAULT NULL,
  `description_de`       VARCHAR(255) NOT NULL,
  `description_en`       VARCHAR(255) DEFAULT NULL,
  `long_description_de`  TEXT NOT NULL,
  `long_description_en`  TEXT DEFAULT NULL,
  `station_type`         ENUM('image_sequence', 'panorama_quiz') NOT NULL DEFAULT 'image_sequence',
  `cover_image`          VARCHAR(64) NOT NULL,
  `slides`               MEDIUMTEXT NOT NULL,
  `panorama_image`       VARCHAR(64) DEFAULT NULL,
  `quiz_questions`       MEDIUMTEXT DEFAULT NULL,
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

-- Tabelle: custom_paths
-- Über die Stationsverwaltung angelegte Themenpfade. Der AR-Pfad ('tourist') ist fest im Frontend
-- eingebaut und steht hier bewusst nicht drin; Custom-Stationen gehören immer zu einem dieser Pfade.
-- id: aus dem Namen erzeugter Kurzname (z. B. 'local-guide'); bleibt nach dem Anlegen unverändert,
--     weil user_progress.path_id und custom_stations.path_id darauf verweisen.
-- cover_image: optionales Pfadbild (Dateiname in api/uploads/stations/)
-- Idempotent – kann auf einer bestehenden DB erneut ausgeführt werden.
CREATE TABLE IF NOT EXISTS `custom_paths` (
  `id`              VARCHAR(100) NOT NULL,
  `title_de`        VARCHAR(150) NOT NULL,
  `title_en`        VARCHAR(150) DEFAULT NULL,
  `description_de`  VARCHAR(500) NOT NULL,
  `description_en`  VARCHAR(500) DEFAULT NULL,
  `difficulty`      ENUM('Einfach', 'Mittel', 'Schwer') NOT NULL DEFAULT 'Einfach',
  `estimated_time`  VARCHAR(50) NOT NULL DEFAULT '',
  `cover_image`     VARCHAR(64) DEFAULT NULL,
  `created_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bisher fest im Frontend eingebauter Pfad „Local Guide“ – übernimmt die vorhandenen Stationen
INSERT IGNORE INTO `custom_paths` (`id`, `title_de`, `title_en`, `description_de`, `description_en`, `difficulty`, `estimated_time`) VALUES
  ('local-guide', 'Local Guide', 'Local Guide',
   'Geschichten von Einheimischen: entdecke besondere Orte in St.Georgen Bild für Bild.',
   'Stories from locals: discover special places in St.Georgen picture by picture.',
   'Einfach', '1-2 Std');

-- ============================================================
-- Punkte-Konfiguration: alle Punktwerte, die das Frontend anzeigt bzw. der Server vergibt.
-- Idempotent (IF NOT EXISTS / INSERT IGNORE) – kann auf einer bestehenden DB erneut ausgeführt
-- werden, ohne geänderte Werte zu überschreiben. Ausgeliefert über get_point_config.php.
-- ============================================================

-- Tabelle: builtin_stations
-- Punkte der fest eingebauten Stationen (IDs < 1000; Custom-Stationen haben ihre Punkte in custom_stations)
CREATE TABLE IF NOT EXISTS `builtin_stations` (
  `station_id`   INT NOT NULL,
  `path_id`      VARCHAR(100) NOT NULL,
  `points`       INT NOT NULL,
  PRIMARY KEY (`station_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `builtin_stations` (`station_id`, `path_id`, `points`) VALUES
  (1, 'tourist', 50),
  (2, 'tourist', 50),
  (3, 'tourist', 50),
  (4, 'tourist', 50),
  (5, 'tourist', 50);

-- Tabelle: reward_definitions
-- Punkte der einmaligen Sonderbelohnungen (reward_key wie in user_rewards)
CREATE TABLE IF NOT EXISTS `reward_definitions` (
  `reward_key`   VARCHAR(120) NOT NULL,
  `points`       INT NOT NULL,
  PRIMARY KEY (`reward_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `reward_definitions` (`reward_key`, `points`) VALUES
  ('klosterweiher_treasure_chest', 50);

-- Tabelle: achievements
-- Nur Anzeige (es werden keine Punkte gutgeschrieben).
-- threshold_points: freigeschaltet ab so vielen verdienten Punkten; NULL = Regel im Frontend
-- (pathfinder: ein Pfad komplett, completionist: alle Pfade komplett).
-- badge_points: im Badge angezeigter Wert.
CREATE TABLE IF NOT EXISTS `achievements` (
  `achievement_key`  VARCHAR(50) NOT NULL,
  `threshold_points` INT DEFAULT NULL,
  `badge_points`     INT NOT NULL,
  `sort_order`       INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`achievement_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `achievements` (`achievement_key`, `threshold_points`, `badge_points`, `sort_order`) VALUES
  ('first-steps',   10,   10,  1),
  ('explorer',      50,   50,  2),
  ('adventurer',    100,  100, 3),
  ('pathfinder',    NULL, 150, 4),
  ('master',        200,  200, 5),
  ('completionist', NULL, 300, 6);

-- Tabelle: point_settings
-- level_size: Punkte pro Level; default_station_points: Vorschlagswert für neue Custom-Stationen
CREATE TABLE IF NOT EXISTS `point_settings` (
  `setting_key`  VARCHAR(50) NOT NULL,
  `value`        INT NOT NULL,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `point_settings` (`setting_key`, `value`) VALUES
  ('level_size', 100),
  ('default_station_points', 50);

-- Migration für eine bereits angelegte custom_stations-Tabelle (Version mit Spalte `images`).
-- Vorhandene Stationen behalten ihr erstes Bild als Profilbild und bekommen eine leere Bildfolge;
-- sie müssen danach in der Stationsverwaltung um Bilder mit Texten ergänzt werden.
-- ALTER TABLE `custom_stations`
--   ADD COLUMN `cover_image` VARCHAR(64) NOT NULL DEFAULT '' AFTER `long_description_en`,
--   ADD COLUMN `slides` MEDIUMTEXT NULL AFTER `cover_image`;
-- UPDATE `custom_stations` SET `cover_image` = JSON_UNQUOTE(JSON_EXTRACT(`images`, '$[0]')), `slides` = '[]';
-- ALTER TABLE `custom_stations` DROP COLUMN `images`, MODIFY `slides` MEDIUMTEXT NOT NULL, ALTER `cover_image` DROP DEFAULT;
