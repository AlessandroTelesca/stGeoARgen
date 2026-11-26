-- ============================================================
-- Migration: Akzentfarbe je Themenpfad (Hex wie #1a7f5a, NULL = Standardfarbe der App)
-- EINMALIG in phpMyAdmin ausführen (Datenbank auswählen → SQL → einfügen → OK),
-- nach api/migrate_station_color.sql und VOR dem Hochladen der neuen api/-Dateien.
-- Die Farbe gilt künftig für alle Stationen eines Pfads. Jeder Pfad übernimmt dabei die Farbe
-- seiner ersten Station mit Farbe (nach sort_order, id); ohne solche Station bleibt es die Standardfarbe.
-- Ein zweiter Lauf bricht mit „Duplicate column name“ ab – das ist harmlos.
-- ============================================================
ALTER TABLE `custom_paths`
  ADD COLUMN `color` VARCHAR(7) NULL DEFAULT NULL AFTER `cover_image`;

UPDATE `custom_paths` p
SET p.`color` = (
  SELECT s.`color` FROM `custom_stations` s
  WHERE s.`path_id` = p.`id` AND s.`color` IS NOT NULL
  ORDER BY s.`sort_order` ASC, s.`id` ASC
  LIMIT 1
)
WHERE p.`color` IS NULL;

-- Hinweis: custom_stations.color wird danach nicht mehr gelesen oder geschrieben,
-- die Spalte bleibt aber zur Sicherheit bestehen.
