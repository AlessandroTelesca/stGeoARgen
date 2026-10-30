-- ============================================================
-- Migration: Modulsystem für Stationen, Entwurf/Veröffentlicht und Reihenfolge
-- EINMALIG in phpMyAdmin ausführen (Datenbank auswählen → SQL → einfügen → OK),
-- nach api/migrate_panorama_stations.sql und api/migrate_live_camera.sql.
-- Bestehende Stationen und Pfade bleiben veröffentlicht; modules bleibt bei ihnen NULL
-- (das Frontend leitet die Module aus den alten Spalten ab). Die alte Reihenfolge
-- (Anlage-Reihenfolge) wird in sort_order übernommen.
-- Ein zweiter Lauf bricht mit „Duplicate column name“ ab – das ist harmlos.
-- ============================================================
ALTER TABLE `custom_stations`
  ADD COLUMN `modules`    MEDIUMTEXT DEFAULT NULL AFTER `long_description_en`,
  ADD COLUMN `published`  TINYINT(1) NOT NULL DEFAULT 1 AFTER `path_id`,
  ADD COLUMN `sort_order` INT NOT NULL DEFAULT 0 AFTER `published`;

ALTER TABLE `custom_paths`
  ADD COLUMN `published`  TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN `sort_order` INT NOT NULL DEFAULT 0;

UPDATE `custom_stations` SET `sort_order` = `id`;
