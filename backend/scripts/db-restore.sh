#!/bin/sh
# Wgrywa plik SQLite (np. migawkę z db-snapshot.sh) do bazy w wolumenie Dockera, zamiast scrapować i analizować od nowa.
#
# Użycie: sh scripts/db-restore.sh dev|prod [plik]
#   plik domyślnie: backend/data/<dev|prod>-snapshot.db (ścieżka względna liczona od katalogu backend/)
#
# Kroki:
#   1. sprawdza plik w kontenerze (integrity_check + tabele Radaru), zanim cokolwiek ruszy;
#   2. robi kopię obecnej bazy przez VACUUM INTO: data/<dev|prod>.db.before-restore-<data>.db w wolumenie;
#   3. zatrzymuje backend, podmienia plik i usuwa stare -wal/-shm (inaczej SQLite nałożyłby stary WAL na nową bazę);
#   4. uruchamia backend, który przy starcie robi `prisma migrate deploy` (starsza migawka zostanie zmigrowana).
# Odmawia, gdy działa scraper, analiza lub pipeline (plik radar.lock).
set -e

PROFILE="${1:-dev}"
case "$PROFILE" in
  dev) SERVICE=backend-dev; DB_NAME=dev.db ;;
  prod) SERVICE=backend; DB_NAME=prod.db ;;
  *) echo "Użycie: $0 dev|prod [plik]" >&2; exit 1 ;;
esac
DIR=/app/backend/data

cd "$(dirname "$0")/.."
IN="${2:-data/${PROFILE}-snapshot.db}"
if [ ! -f "$IN" ]; then
  echo "Brak pliku $(pwd)/$IN" >&2
  echo "Migawkę tworzy: bun run ${PROFILE}:db:snapshot (albo podaj ścieżkę jako drugi argument)" >&2
  exit 1
fi

dc() { docker compose --profile "$PROFILE" "$@"; }

if ! dc exec -T "$SERVICE" true 2>/dev/null; then
  echo "Kontener $SERVICE nie działa. Uruchom najpierw profil $PROFILE (bun run docker:$PROFILE)." >&2
  exit 1
fi
if dc exec -T "$SERVICE" test -e "$DIR/radar.lock"; then
  echo "W kontenerze jest $DIR/radar.lock: trwa scrape, analiza albo pipeline. Poczekaj, aż się skończy." >&2
  echo "Jeśli nic nie działa (lock po przerwanym procesie): docker compose --profile $PROFILE exec $SERVICE rm $DIR/radar.lock" >&2
  exit 2
fi

echo "1/4 Kopiuję $IN do kontenera i sprawdzam plik..."
dc cp "$IN" "$SERVICE:$DIR/restore.tmp.db"
dc exec -T -e F="$DIR/restore.tmp.db" "$SERVICE" bun -e '
import { Database } from "bun:sqlite";
const db = new Database(process.env.F, { readonly: true });
const check = Object.values(db.query("PRAGMA integrity_check").get())[0];
if (check !== "ok") { console.error("Plik uszkodzony: " + check); process.exit(1); }
const tables = new Set(db.query("SELECT name FROM sqlite_master WHERE type = \x27table\x27").all().map((r) => r.name));
const missing = ["_prisma_migrations", "ScrapeRun", "RawRecord", "InnovationCard"].filter((t) => !tables.has(t));
if (missing.length) { console.error("To nie jest baza Radaru, brak tabel: " + missing.join(", ")); process.exit(1); }
const n = (t) => db.query(`SELECT COUNT(*) AS n FROM "${t}"`).get().n;
console.log(`   OK: ${n("InnovationCard")} kart, ${n("RawRecord")} rekordów, ${n("ScrapeRun")} uruchomień scraperów`);
' || { dc exec -T "$SERVICE" rm -f "$DIR/restore.tmp.db"; exit 1; }

STAMP=$(date +%Y%m%d-%H%M%S)
BACKUP="$DB_NAME.before-restore-$STAMP.db"
echo "2/4 Kopia obecnej bazy: $DIR/$BACKUP"
dc exec -T -e DB="$DIR/$DB_NAME" -e OUT="$DIR/$BACKUP" "$SERVICE" bun -e '
import { Database } from "bun:sqlite";
import { existsSync } from "node:fs";
if (!existsSync(process.env.DB)) { console.log("   (brak obecnej bazy, pomijam)"); process.exit(0); }
new Database(process.env.DB, { readonly: true }).run(`VACUUM INTO \x27${process.env.OUT}\x27`);
'

echo "3/4 Zatrzymuję $SERVICE i podmieniam bazę..."
dc stop "$SERVICE"
dc run --rm --no-deps -T --entrypoint sh "$SERVICE" -c \
  "cd $DIR && rm -f $DB_NAME-wal $DB_NAME-shm && mv restore.tmp.db $DB_NAME"

echo "4/4 Uruchamiam $SERVICE (migrate deploy przy starcie)..."
dc start "$SERVICE"
i=0
until dc exec -T "$SERVICE" bun -e 'const r = await fetch("http://localhost:3000/health"); process.exit(r.ok ? 0 : 1)' 2>/dev/null; do
  i=$((i + 1))
  if [ "$i" -ge 60 ]; then
    echo "Backend nie wstał w 2 min. Logi: docker compose --profile $PROFILE logs $SERVICE" >&2
    echo "Kopia poprzedniej bazy: $DIR/$BACKUP (w wolumenie)" >&2
    exit 1
  fi
  sleep 2
done

echo "Gotowe. Baza wgrana z $IN"
echo "Poprzednia baza: $DIR/$BACKUP (w wolumenie; usuń, gdy niepotrzebna)"
