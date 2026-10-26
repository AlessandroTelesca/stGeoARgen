#!/usr/bin/env bash
# Komplette lokale Entwicklungsumgebung mit einem Befehl (npm run localdev):
#   1. eigene MariaDB-Instanz im Projektordner (.local-dev/, ohne root/sudo, Port 3307)
#   2. PHP-API auf 127.0.0.1:8000 (Log: .local-dev/php.log)
#   3. Vite-Frontend auf http://localhost:3001, /api wird an die lokale API weitergeleitet
# Beim ersten Start werden api/setup.sql und die Testdaten aus scripts/local-dev-seed.sql
# eingespielt. Ctrl+C beendet alles.
#
#   scripts/local-dev.sh          starten (npm run localdev)
#   scripts/local-dev.sh reset    Datenbank löschen, neu anlegen und starten (npm run localdev:reset)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE="$ROOT/.local-dev"
DATADIR="$STATE/mysql"
SOCKET="$STATE/mysqld.sock"
PIDFILE="$STATE/mysqld.pid"
DB_TCP_PORT="${LOCAL_DB_PORT:-3307}"
API_PORT="${LOCAL_API_PORT:-8000}"
WEB_PORT="${LOCAL_WEB_PORT:-3001}"

export DB_HOST=localhost DB_SOCKET="$SOCKET" DB_NAME=stgeoargen DB_USER=stgeoargen DB_PASS=stgeoargen
export ADMIN_PASSWORD=admin

if [[ -f "$PIDFILE" ]] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  echo "Lokale Umgebung läuft bereits (MariaDB-PID $(cat "$PIDFILE")). Andere Instanz zuerst beenden." >&2
  exit 1
fi

case "${1:-start}" in
  start) ;;
  reset) rm -rf "$STATE" ;;
  *) echo "Nutzung: $0 [start|reset]" >&2; exit 2 ;;
esac

fresh=0
if [[ ! -d "$DATADIR" ]]; then
  mkdir -p "$STATE"
  echo "Lege lokale Datenbank in $DATADIR an …"
  mariadb-install-db --no-defaults --datadir="$DATADIR" --auth-root-authentication-method=normal \
    --skip-test-db >"$STATE/install.log" 2>&1 || { cat "$STATE/install.log" >&2; exit 1; }
  fresh=1
fi

pids=()
cleanup() {
  local status=$?
  trap - EXIT INT TERM
  # Rückwärts beenden: erst PHP, dann MariaDB
  for (( i=${#pids[@]}-1; i>=0; i-- )); do
    kill "${pids[i]}" 2>/dev/null || true
    wait "${pids[i]}" 2>/dev/null || true
  done
  exit "$status"
}
trap cleanup EXIT INT TERM

mariadbd --no-defaults --datadir="$DATADIR" --socket="$SOCKET" --pid-file="$PIDFILE" \
  --port="$DB_TCP_PORT" --bind-address=127.0.0.1 --log-error="$STATE/mysqld.log" &
db_pid=$!
pids+=("$db_pid")

for _ in $(seq 60); do
  mariadb-admin --no-defaults --socket="$SOCKET" -u root ping >/dev/null 2>&1 && break
  kill -0 "$db_pid" 2>/dev/null || { echo "MariaDB ist nicht gestartet, siehe $STATE/mysqld.log" >&2; exit 1; }
  sleep 0.5
done

if (( fresh )); then
  echo "Spiele Schema und Testdaten ein …"
  mariadb --no-defaults --socket="$SOCKET" -u root <<SQL
CREATE DATABASE $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
CREATE USER '$DB_USER'@'127.0.0.1' IDENTIFIED BY '$DB_PASS';
GRANT ALL ON $DB_NAME.* TO '$DB_USER'@'localhost', '$DB_USER'@'127.0.0.1';
SQL
  mariadb --no-defaults --socket="$SOCKET" -u root "$DB_NAME" <"$ROOT/api/setup.sql"
  mariadb --no-defaults --socket="$SOCKET" -u root "$DB_NAME" <"$ROOT/scripts/local-dev-seed.sql"
fi

php -d upload_max_filesize=32M -d post_max_size=64M -S "127.0.0.1:$API_PORT" -t "$ROOT" \
  >"$STATE/php.log" 2>&1 &
php_pid=$!
pids+=("$php_pid")

for _ in $(seq 40); do
  curl -sf -o /dev/null "http://127.0.0.1:$API_PORT/api/get_point_config.php" && break
  kill -0 "$php_pid" 2>/dev/null || { echo "PHP-Server ist nicht gestartet:" >&2; cat "$STATE/php.log" >&2; exit 1; }
  sleep 0.25
done

cat <<INFO

Lokale Umgebung: http://localhost:$WEB_PORT   (Ctrl+C beendet alles)
Admin-Passwort (/admin/stations): $ADMIN_PASSWORD
Testkonten (Passwort test1234): neu@test.local, aktiv@test.local, profi@test.local, Partner "partner"
Datenbank: $DB_NAME auf 127.0.0.1:$DB_TCP_PORT, Benutzer $DB_USER / $DB_PASS · API-Log: $STATE/php.log
INFO

VITE_API_BASE_URL=/api VITE_LOCAL_API_TARGET="http://127.0.0.1:$API_PORT" \
  "$ROOT/node_modules/.bin/vite" --port "$WEB_PORT" --strictPort
