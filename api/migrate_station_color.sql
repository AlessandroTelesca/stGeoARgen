-- ============================================================
-- Migration: Akzentfarbe je Station (Hex wie #1a7f5a, NULL = Standardfarbe der App)
-- EINMALIG in phpMyAdmin ausführen (Datenbank auswählen → SQL → einfügen → OK),
-- nach api/migrate_station_modules.sql und VOR dem Hochladen der neuen api/-Dateien.
-- Bestehende Stationen behalten die Standardfarbe.
-- Ein zweiter Lauf bricht mit „Duplicate column name“ ab – das ist harmlos.
-- ============================================================
ALTER TABLE `custom_stations`
  ADD COLUMN `color` VARCHAR(7) NULL DEFAULT NULL AFTER `cover_image`;
