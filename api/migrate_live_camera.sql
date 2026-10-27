-- ============================================================
-- Migration: Live-Kamerabild statt 360°-Bild für 360°-Stationen
-- EINMALIG in phpMyAdmin ausführen (Datenbank auswählen → SQL → einfügen → OK),
-- nach api/migrate_panorama_stations.sql. Bestehende Stationen behalten ihr 360°-Bild.
-- Ein zweiter Lauf bricht mit „Duplicate column name“ ab – das ist harmlos.
-- ============================================================
ALTER TABLE `custom_stations`
  ADD COLUMN `live_camera` TINYINT(1) NOT NULL DEFAULT 0 AFTER `panorama_image`;
