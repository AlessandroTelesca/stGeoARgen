-- Testdaten für die lokale Umgebung (npm run localdev) – NICHT auf dem Server ausführen.
-- Alle Passwörter: test1234 (bcrypt-Hash unten, erzeugt mit password_hash('test1234', PASSWORD_BCRYPT)).
-- Die Stationsverwaltung (/admin/stations) hat kein Benutzerkonto, sondern das Admin-Passwort
-- (ADMIN_PASSWORD in scripts/local-dev.sh).

SET @pw = '$2y$12$dLTynp0/SHRAmfBfBBLR/.cp7b9Dy8eTFz5LrIiBpr8HPE2YscibO';

-- Nutzer:innen
INSERT INTO `users` (`id`, `username`, `email`, `password_hash`, `total_points`) VALUES
  (1, 'Neu',   'neu@test.local',   @pw, 0),
  (2, 'Aktiv', 'aktiv@test.local', @pw, 150),
  (3, 'Profi', 'profi@test.local', @pw, 1000);

-- Aktiv: zwei AR-Stationen erledigt (100 P.) + Schatzkiste (50 P.) = 150 P.
INSERT INTO `user_progress` (`user_id`, `path_id`, `station_id`) VALUES
  (2, 'tourist', 1),
  (2, 'tourist', 2);
INSERT INTO `user_point_awards` (`user_id`, `award_key`) VALUES
  (2, 'station:1'),
  (2, 'station:2'),
  (2, 'reward:klosterweiher_treasure_chest');
INSERT INTO `user_rewards` (`user_id`, `reward_key`, `points`) VALUES
  (2, 'klosterweiher_treasure_chest', 50);

-- Profi: kompletter AR-Pfad, Restpunkte zum Einlösen im Shop
INSERT INTO `user_progress` (`user_id`, `path_id`, `station_id`) VALUES
  (3, 'tourist', 1), (3, 'tourist', 2), (3, 'tourist', 3), (3, 'tourist', 4), (3, 'tourist', 5);
INSERT INTO `user_point_awards` (`user_id`, `award_key`) VALUES
  (3, 'station:1'), (3, 'station:2'), (3, 'station:3'), (3, 'station:4'), (3, 'station:5');

-- Partner (Login unter /partner: Benutzername "partner")
INSERT INTO `partners` (`id`, `username`, `password_hash`, `name`, `address`) VALUES
  (1, 'partner', @pw, 'Testcafé', 'Marktplatz 1, 78112 St. Georgen');

-- Shop-Angebote
INSERT INTO `vouchers` (`id`, `description`, `points_value`, `partner_id`, `quantity`, `expiry_date`, `active`) VALUES
  (1, 'Gratis Kaffee im Testcafé', 50,  1, 100, DATE_ADD(CURDATE(), INTERVAL 1 YEAR), 1),
  (2, '10 % Rabatt im Testcafé',  100, 1, 100, DATE_ADD(CURDATE(), INTERVAL 1 YEAR), 1);

-- Profi hat schon einen Gutschein gekauft (noch nicht eingelöst → am Partner-Login prüfbar)
INSERT INTO `user_vouchers` (`user_id`, `voucher_id`, `code`, `description`, `partner_id`, `points_value`, `expiry_date`) VALUES
  (3, 1, 'TEST-KAFFEE-0001', 'Gratis Kaffee im Testcafé', 1, 50, DATE_ADD(CURDATE(), INTERVAL 1 YEAR));
