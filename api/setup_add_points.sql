-- Falls die total_points Spalte noch nicht existiert
ALTER TABLE `users` ADD COLUMN `total_points` INT NOT NULL DEFAULT 0;

-- Beispiel: User mit ID 1 soll 100 Punkte haben
UPDATE `users` SET `total_points` = 100 WHERE `id` = 1;
