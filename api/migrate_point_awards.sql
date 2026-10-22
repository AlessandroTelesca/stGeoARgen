-- ============================================================
-- Migration: Punkte pro Station/Belohnung nur einmal je Konto
-- EINMALIG in phpMyAdmin ausführen (Datenbank auswählen → SQL → einfügen → OK),
-- BEVOR das neue Backend ausgeliefert wird. Idempotent – ein zweiter Lauf ist harmlos.
--
-- Hintergrund: "Fortschritt zurücksetzen" setzte den Punktestand auf 0, gekaufte Gutscheine
-- blieben aber erhalten. Durch Zurücksetzen, erneutes Abschließen und Kaufen ließen sich
-- beliebig viele Gutscheine erspielen. Jetzt merkt sich user_point_awards jede Auszahlung;
-- ein Reset macht Stationen wieder spielbar, zahlt sie aber nicht erneut aus.
-- ============================================================
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

-- Bisherige Auszahlungen übernehmen, damit bereits gespielte Stationen nicht doppelt zahlen
INSERT IGNORE INTO `user_point_awards` (`user_id`, `award_key`, `awarded_at`)
SELECT `user_id`, CONCAT('station:', `station_id`), `completed_at`
FROM `user_progress`
WHERE `station_id` <> 0;

INSERT IGNORE INTO `user_point_awards` (`user_id`, `award_key`, `awarded_at`)
SELECT `user_id`, CONCAT('reward:', `reward_key`), `claimed_at`
FROM `user_rewards`;
