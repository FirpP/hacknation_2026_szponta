#!/bin/sh
# Spójna migawka bazy (dev lub prod) do podglądu w kliencie SQLite na hoście (VS Code, DBeaver...).
# Baza leży w wolumenie Dockera i NIE otwieramy jej z hosta na żywo: przy Docker Desktop host i kontener
# nie dzielą pamięci współdzielonej SQLite (WAL) ani blokad plików, więc podgląd widziałby stare dane i mógł cofnąć zapisy.
# VACUUM INTO wykonuje się w kontenerze, więc uwzględnia też dane jeszcze nieprzeniesione z pliku WAL.
#
# Użycie: sh scripts/db-snapshot.sh dev|prod   ->  backend/data/<dev|prod>-snapshot.db
# dev-snapshot.db jest w repo (wgrywanie: db-restore.sh), prod-snapshot.db jest w .gitignore.
# Migawka się nie odświeża - uruchom skrypt ponownie po zmianach. Zmiany w migawce nie wracają do bazy.
set -e

PROFILE="${1:-prod}"
case "$PROFILE" in
  dev) SERVICE=backend-dev; DB=/app/backend/data/dev.db ;;
  prod) SERVICE=backend; DB=/app/backend/data/prod.db ;;
  *) echo "Użycie: $0 dev|prod" >&2; exit 1 ;;
esac

cd "$(dirname "$0")/.."
OUT="data/${PROFILE}-snapshot.db"
mkdir -p data

dc() { docker compose --profile "$PROFILE" "$@"; }

dc exec -T "$SERVICE" sh -c "rm -f /tmp/snap.db"
dc exec -T "$SERVICE" bun -e "import { Database } from 'bun:sqlite'; new Database('$DB', { readonly: true }).run(\"VACUUM INTO '/tmp/snap.db'\")"
dc cp "$SERVICE:/tmp/snap.db" "$OUT"
dc exec -T "$SERVICE" sh -c "rm -f /tmp/snap.db"

echo "Migawka zapisana: $(pwd)/$OUT"
