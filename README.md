# Radar Innowacji

Prototyp na wyzwanie Podkarpackiego Centrum Innowacji (HackNation 2026): robot zbiera istniejące innowacje z publicznych źródeł, model AI opisuje je jako karty z oceną potencjału i cytatami ze źródeł, a strona pozwala je przeszukiwać i filtrować. Aplikacja jest publiczna i tylko do odczytu.

Jeden runtime (Bun) w całym projekcie. Backend (Hono + Prisma + SQLite) i frontend (React + Vite) to osobne pakiety, każdy z własnym `package.json` i `bun.lock`. Jeden `Dockerfile` i jeden `docker-compose.yml` obsługują development i produkcję (profile `dev` i `prod`).

## Struktura

```
backend/    API: Hono + Prisma (SQLite) + zod, moduły w src/api/<moduł>/ (routes, controllers, services, repositories, validators, docs, types)
frontend/   React + Vite + TanStack Query (alias "@" wskazuje na src/), hooki per funkcja w src/features/<nazwa>/
nginx/      konfiguracja Nginx używana tylko na produkcji
Dockerfile  jeden plik, cele: dev-backend, dev-frontend, backend, web
.github/    CODEOWNERS
```

Nazwa projektu Compose (prefiks kontenerów i wolumenów, w tym bazy) to nazwa katalogu, więc dwa klony na jednej maszynie się nie gryzą. Własną nazwę ustawisz w `.env`: `COMPOSE_PROJECT_NAME=moj-projekt`.

## Development

```sh
docker compose --profile dev up --build   # lub: bun run docker:dev
```

- Frontend (Vite, hot reload): http://localhost:8080 (zapytania do `/api` idą przez proxy Vite do backendu)
- Backend: http://localhost:3000
- Backend i frontend to osobne kontenery (`backend-dev` i `frontend-dev`), więc mają osobne logi: `docker compose --profile dev logs -f backend-dev` lub `frontend-dev` (w Docker Desktop kliknij kontener w grupie o nazwie projektu). Backend loguje każde żądanie (metoda, ścieżka, status, czas); błędy 4xx to jedna linia, 5xx ze stackiem.
- Przy starcie każdy kontener instaluje nowe paczki, a backend dodatkowo generuje klienta Prisma i stosuje migracje.

Zmienne środowiskowe są opcjonalne (analiza LLM potrzebuje `LLM_*`). Jeśli chcesz coś nadpisać: `cp .env.example .env` (po utworzeniu `.env` uruchom kontenery ponownie, bo Docker czyta go przy tworzeniu kontenera).

Prisma (z katalogu głównego, polecenia wykonują się w kontenerze `backend-dev`):

```sh
bun run dev:prisma:migrate   # nowa migracja po zmianie schema.prisma
bun run dev:prisma:generate  # klient Prisma po zmianie schema.prisma (bez restartu kontenera)
bun run dev:prisma:studio    # podgląd i edycja danych: http://localhost:5555 (Ctrl+C kończy)
bun run dev:db:snapshot      # kopia bazy do backend/data/dev-snapshot.db (do otwarcia w VS Code/DBeaver)
bun run dev:db:restore       # wgranie backend/data/dev-snapshot.db (albo podanego pliku) z powrotem do bazy w Dockerze
```

**Przeniesienie gotowej bazy bez ponownego scrapowania** (np. na inny komputer albo na produkcję): `dev:db:snapshot` na źródłowej maszynie, skopiuj plik `backend/data/dev-snapshot.db`, potem na docelowej przy działającym profilu `bun run dev:db:restore` (dev) albo `bun run prod:db:restore data/dev-snapshot.db` (prod; ścieżka względem `backend/`). Skrypt `backend/scripts/db-restore.sh` sprawdza plik (integralność, tabele Radaru), robi kopię obecnej bazy w wolumenie (`<db>.before-restore-<data>.db`), na chwilę zatrzymuje backend, podmienia bazę razem z usunięciem starych plików `-wal`/`-shm` i uruchamia backend, który stosuje brakujące migracje. Odmawia, gdy trwa scrape lub analiza (`radar.lock`).

**Baza dev leży w wolumenie Dockera** (`/app/backend/data/dev.db` w kontenerze), a nie w katalogu repo. **Nie otwieraj jej z hosta na żywo.** Przy Docker Desktop kontener działa w VM, a SQLite w trybie WAL wymaga pamięci współdzielonej i blokad plików między wszystkimi procesami. Podgląd z hosta (np. rozszerzenie SQLite w VS Code) widziałby wtedy stare dane i mógłby cofnąć zapisy aplikacji. Do przeglądania służy Prisma Studio uruchamiane w kontenerze albo migawka. Zmiany w migawce nie wracają do bazy.

Na świeżym klonie wystarczy `docker compose --profile dev up --build`, bo przy każdym starcie backend sam generuje klienta Prisma i stosuje istniejące migracje. Baza jest wtedy pusta: karty wgrasz z migawki w repo przez `bun run dev:db:restore`.

Błędy Prismy nie wymagają obsługi w serwisach: `errorHandler` zamienia duplikat pola `@unique` (P2002) na 409 `CONFLICT` z polem w `details`, a brak rekordu przy update/delete (P2025) na 404.

### Narzędzia na hoście (opcjonalnie)

Aplikacja działa tylko w Dockerze, ale żeby edytor miał podpowiedzi TypeScript, a lint, testy i formatowanie działały bez kontenera, zainstaluj paczki na hoście (wymaga Buna):

```sh
bun run install:all
```

Skrypty z katalogu głównego: `bun run lint | format | format:check | typecheck | test:backend | check:circular`, a `bun run check` uruchamia je wszystkie. Testy (`bun test`) nie wymagają bazy, Dockera ani zmiennych środowiska. Typecheck i lint potrzebują wygenerowanego klienta Prisma. Powstaje on na hoście sam po pierwszym `docker compose --profile dev up`, bo katalog `backend/` jest zamontowany w kontenerze. Bez Dockera wygeneruj go ręcznie:

```sh
cd backend && DATABASE_URL=file:./prisma/dev.db bunx --bun prisma generate
```

## Radar Innowacji: pipeline danych

Pipeline działa tak: scraper → `RawRecord` (surowy fragment źródła, `contentHash`) → analiza LLM → `InnovationCard` → `GET /api/v1/cards`. Każdy etap uruchamiasz osobno. Skrypty z katalogu głównego wykonują się w kontenerze `backend-dev`, więc pipeline i API korzystają z tej samej bazy.

```sh
bun run db:migrate                 # migracje (ScrapeRun, RawRecord, InnovationCard)
bun run dev:db:restore             # gotowe karty z migawki backend/data/dev-snapshot.db, bez scrapowania i LLM
bun run scrape:ncbr --limit 5      # jedno źródło (ncbr|baztol|epo|uprp|ppm|pbn|pan|interreg), --offline = fixture
bun run scrape:all                 # wszystkie źródła, tabela statusów
bun run analyze --limit 3          # karty dla nowych/zmienionych rekordów (--source ncbr, --retry-failed)
bun run pipeline                   # scrape:all + analyze pod jednym lockiem
bun run cron                       # harmonogram co 24 h (RADAR_CRON), --now = pierwszy run od razu; w tle: cron:detached
```

- **Konfiguracja:** zapytania, słowa kluczowe, limity (domyślnie 20 na źródło) i opóźnienia są w [backend/src/radar.config.ts](backend/src/radar.config.ts), a klucze w `.env` (patrz `.env.example`: `LLM_*`, `EPO_OPS_*`).
- **Grzeczny crawler:** robots.txt respektowany ściśle (Disallow lub brak dostępu => `SKIPPED`), własny User-Agent, min. 1 s między requestami do hosta (lub `Crawl-delay`), timeout 20 s, 3 próby z backoffem.
- **Idempotencja:** upsert po `(source, externalId)`. Zmiana `contentHash` oznacza ponowną analizę. Lockfile `backend/data/radar.lock` blokuje nakładanie się runów (kod wyjścia 2).
- **Przejrzystość:** model zwraca cytaty (`evidence`), które kod sprawdza w surowym rekordzie (`verified`). Pole jest `CONFIRMED` tylko z potwierdzonym cytatem; oceny 1–5, TRL i `isInnovation` są `ESTIMATED`.

| Źródło                      | Dostęp                                    | Status (2026-11-21)                                           |
| --------------------------- | ----------------------------------------- | ------------------------------------------------------------- |
| NCBR, wyszukiwarka sukcesów | HTML (cheerio)                            | działa                                                        |
| BazTOL (PUT)                | formularz POST, HTML                      | działa (katalog stron, mała wartość)                          |
| EPO / UPRP                  | EPO OPS API (UPRP: publikacje PL z DOCDB) | wymaga `EPO_OPS_KEY`/`EPO_OPS_SECRET`, `TODO(verify)` CQL     |
| PPM                         | OAI-PMH                                   | `SKIPPED`: robots.txt `Disallow: /`; działa tylko `--offline` |
| PBN                         | API z tokenem aplikacji                   | `SKIPPED` bez tokenu, `TODO(verify)`                          |
| Czasopisma PAN (dLibra)     | OAI-PMH                                   | `SKIPPED`: weryfikacja anti-bot zamiast odpowiedzi            |
| Interreg                    | nieznany                                  | `SKIPPED`: host nie odpowiadał, `TODO(verify)`                |

## Deploy na Droplet (DigitalOcean)

Produkcja to profil `prod`: Nginx na porcie 80 serwuje zbudowany frontend i przekazuje `/api` do backendu. Backend nie jest wystawiony na zewnątrz, a baza SQLite (tryb WAL) leży w wolumenie `<projekt>_backend_data`. `index.html` jest zawsze rewalidowany, więc po redeployu przeglądarka nie trzyma starej wersji. Całość mieści się w kilkudziesięciu MB RAM (backend ok. 50 MB, nginx ok. 20 MB).

1. Utwórz Droplet z obrazem **Docker on Ubuntu** (Marketplace) i zaloguj się przez SSH.
2. Przy 2 GB RAM dodaj swap na czas budowania obrazów (`vite build` i `bun install` chwilowo potrzebują więcej pamięci):
   ```sh
   fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
   echo '/swapfile none swap sw 0 0' >> /etc/fstab
   ```
3. Sklonuj repozytorium. `.env` jest opcjonalny: utwórz go z `.env.example`, jeśli produkcja ma też uruchamiać analizę LLM (`LLM_*`) albo potrzebujesz innego portu (`APP_PORT`).
4. Zbuduj i uruchom:
   ```sh
   docker compose --profile prod up -d --build
   ```
5. Wgraj karty z migawki w repo (bez scrapowania i kosztów LLM; potrzebny Bun na serwerze, inaczej patrz `backend/scripts/db-restore.sh`):
   ```sh
   bun run prod:db:restore data/dev-snapshot.db
   ```
6. Firewall:
   ```sh
   ufw allow OpenSSH && ufw allow 80 && ufw enable
   ```
7. Aktualizacja po zmianach:
   ```sh
   git pull && docker compose --profile prod up -d --build
   ```

Aplikacja działa pod `http://<IP-Dropletu>`.

Konfiguracja Nginx jest w `nginx/default.conf`. Po jej zmianie wystarczy `docker compose --profile prod restart web`, bez przebudowy obrazu.

Podgląd bazy produkcyjnej w kliencie SQLite: baza leży w wolumenie Dockera, więc skrypt `backend/scripts/db-snapshot.sh` (`bun run prod:db:snapshot`, a w dev `bun run dev:db:snapshot`) zapisuje jej spójną migawkę do `backend/data/prod-snapshot.db` (katalog jest w `.gitignore`). Migawka się nie odświeża, uruchom skrypt ponownie po zmianach. Wymaga działającego profilu `prod`.

Backup bazy (z katalogu repo, przy działającym profilu `prod`):

```sh
docker run --rm --volumes-from "$(docker compose --profile prod ps -q backend)" -v "$PWD":/backup alpine tar czf /backup/db-backup.tgz -C /app/backend/data .
```

## Dokumentacja API (Swagger)

Tylko w developmencie (`NODE_ENV` inne niż `production`):

- Swagger UI: http://localhost:8080/api/v1/docs
- Spec OpenAPI (JSON): http://localhost:8080/api/v1/openapi.json

Spec generuje się ze schematów zod. Trasa bez opisu nie pojawia się w dokumentacji. Żeby dodać nową:

1. W module utwórz/rozszerz `docs/<moduł>.docs.ts` i opisz trasę przez `describeRoute` (wzór: `backend/src/api/cards/docs/cards.docs.ts`).
2. Schemat odpowiedzi podaj przez `resolver(...)`. Schemat z `.meta({ ref: "Nazwa" })` trafi do `components.schemas`.
3. Dodaj opis jako middleware w routerze: `cardsRouter.get("/", listCardsDocs, validate("query", CardsQuerySchema), handler)`.

Typy (`CardSummary`, `CardDetail`, `Stats`) wynikają ze schematów zod (`z.infer` w `validators/`), więc schemat jest jedynym źródłem prawdy dla specu i kodu. Format błędów (`{ error: { code, message, details? } }`) jest opisany w `ErrorResponseSchema` i przetestowany w `backend/src/middleware/error-handler.test.ts`.

### Typy API na froncie

Frontend nie przepisuje typów ręcznie, tylko generuje je ze speca OpenAPI do `frontend/src/lib/api-types.ts` (plik jest w repo, bo build produkcyjny nie ma dostępu do backendu; nie edytuj go ręcznie). Po zmianie schematu zod lub dodaniu trasy, przy działającym `bun run docker:dev`:

```sh
bun run gen:api   # pobiera http://localhost:3000/api/v1/openapi.json
```

Użycie: `type CardSummary = components["schemas"]["CardSummary"]` (wzór: `frontend/src/lib/types/cards.types.ts`). Do `components.schemas` trafiają tylko schematy z `.meta({ ref: "Nazwa" })`.

## Frontend: wzorce

- **Zapytania** idą przez `api.get` z `src/lib/api-client.ts` (API jest tylko do odczytu; błędy jako `ApiError` z `status`, `code` i `details`). Hooki TanStack Query trzymaj w `src/features/<nazwa>/` razem z fabryką kluczy (wzór: `features/cards/cards.hooks.ts` i `cards.keys.ts`).
- **Strony:** `/` (opis i statystyki), `/radar` (lista i widok radaru, filtry w URL), `/karty/:id` (karta z cytatami). Style i tokeny kolorów są w `src/styles/global.css`.
- `ErrorBoundary` zamiast białego ekranu przy błędzie renderu, React Query Devtools (ikonka w rogu) tylko w dev.
