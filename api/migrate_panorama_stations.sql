-- ============================================================
-- Migration: 360°-Quiz-Stationen in der Stationsverwaltung
-- EINMALIG in phpMyAdmin ausführen (Datenbank auswählen → SQL → einfügen → OK),
-- wenn die Tabelle `custom_stations` schon existiert. Bestehende Stationen bleiben
-- Bildfolge-Stationen ('image_sequence'); nichts wird gelöscht.
-- Ein zweiter Lauf bricht mit „Duplicate column name“ ab – das ist harmlos.
-- ============================================================
ALTER TABLE `custom_stations`
  ADD COLUMN `station_type` ENUM('image_sequence', 'panorama_quiz') NOT NULL DEFAULT 'image_sequence' AFTER `long_description_en`,
  ADD COLUMN `panorama_image` VARCHAR(64) DEFAULT NULL AFTER `slides`,
  ADD COLUMN `quiz_questions` MEDIUMTEXT DEFAULT NULL AFTER `panorama_image`;
