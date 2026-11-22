#!/bin/sh
# Zapisuje spójną migawkę bazy z kontenera (dev lub prod) do JEDNEGO pliku backend/data/snapshot.db.
# Ten plik jest w repo i trafia do obrazów dev i prod przy buildzie. Przy starcie kontenera wgrywa się sam
# do pustej bazy (backend/src/db/restore-snapshot.ts), więc nie ma osobnego skryptu restore.
#
# Użycie: bun run db:snapshot [dev|prod]
#   bez argumentu wybiera działający kontener: dev, a gdy go nie ma, prod (gdy działają oba, bierze dev).
# Po zmianie migawki przebuduj obrazy (docker compose --profile dev up --build), bo jest wgrywana do obrazu.
#
# Bazy NIE otwieramy z hosta na żywo: przy Docker Desktop host i kontener nie dzielą pamięci współdzielonej SQLite (WAL)
# ani blokad plików, więc podgląd widziałby stare dane i mógł cofnąć zapisy. VACUUM INTO wykonuje się w kontenerze,
# więc uwzględnia też dane jeszcze nieprzeniesione z pliku WAL. Zmiany w migawce nie wracają do działającej bazy.
set -e

PROFILE="${1:-auto}"
cd "$(dirname "$0")/.."

if [ "$PROFILE" = auto ]; then
  if [ -n "$(docker compose --profile dev ps -q backend-dev 2>/dev/null)" ]; then PROFILE=dev
  elif [ -n "$(docker compose --profile prod ps -q backend 2>/dev/null)" ]; then PROFILE=prod
  else
    echo "Nie działa żaden kontener backendu. Uruchom profil dev albo prod (bun run docker:dev | docker:prod)." >&2
    exit 1
  fi
fi

case "$PROFILE" in
  dev) SERVICE=backend-dev; DB=/app/backend/data/dev.db ;;
  prod) SERVICE=backend; DB=/app/backend/data/prod.db ;;
  *) echo "Użycie: $0 [dev|prod]" >&2; exit 1 ;;
esac

OUT="data/snapshot.db"
mkdir -p data

dc() { docker compose --profile "$PROFILE" "$@"; }

dc exec -T "$SERVICE" sh -c "rm -f /tmp/snap.db"
dc exec -T "$SERVICE" bun -e "import { Database } from 'bun:sqlite'; new Database('$DB', { readonly: true }).run(\"VACUUM INTO '/tmp/snap.db'\")"
# Najpierw plik tymczasowy, żeby przerwane kopiowanie nie zostawiło w repo uciętego snapshot.db
dc cp "$SERVICE:/tmp/snap.db" "$OUT.tmp"
mv "$OUT.tmp" "$OUT"
dc exec -T "$SERVICE" sh -c "rm -f /tmp/snap.db"

echo "Migawka zapisana: $(pwd)/$OUT (z bazy $PROFILE)"
