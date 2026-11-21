# Template for Hacknation 2026

Jeden runtime (Bun) w całym projekcie. Backend (Hono + Prisma + SQLite) i frontend (React + Vite) to osobne pakiety, każdy z własnym `package.json` i `bun.lock`. Jeden `Dockerfile` i jeden `docker-compose.yml` obsługują development i produkcję (profile `dev` i `prod`).

## Struktura

```
backend/    API: Hono + Prisma (SQLite) + zod, moduły w src/api/<moduł>/ (routes, controllers, services, repositories, validators, docs, types)
frontend/   React + Vite + TanStack Query (alias "@" wskazuje na src/), hooki per funkcja w src/features/<nazwa>/
nginx/      konfiguracja Nginx używana tylko na produkcji
Dockerfile  jeden plik, cele: dev-backend, dev-frontend, backend, web
.github/    CI: typecheck, lint, format, testy, cykle importów i build frontu na każdy push/PR
```

**Po sklonowaniu templatki pod nowy projekt:** nazwa projektu Compose (prefiks kontenerów i wolumenów, w tym bazy) to nazwa katalogu, więc dwa klony na jednej maszynie się nie gryzą. Własną nazwę ustawisz w `.env`: `COMPOSE_PROJECT_NAME=moj-projekt`. Zmień też `<title>` w `frontend/index.html`.

## Development

```sh
docker compose --profile dev up --build   # lub: bun run docker:dev
```

- Frontend (Vite, hot reload): http://localhost:8080 (zapytania do `/api` idą przez proxy Vite do backendu)
- Backend: http://localhost:3000
- Backend i frontend to osobne kontenery (`backend-dev` i `frontend-dev`), więc mają osobne logi: `docker compose --profile dev logs -f backend-dev` lub `frontend-dev` (w Docker Desktop kliknij kontener w grupie o nazwie projektu). Backend loguje każde żądanie (metoda, ścieżka, status, czas); błędy 4xx to jedna linia, 5xx ze stackiem.
- Przy starcie każdy kontener instaluje nowe paczki, a backend dodatkowo generuje klienta Prisma i stosuje migracje.

Zmienne środowiskowe są opcjonalne w developmencie. Jeśli chcesz coś nadpisać: `cp .env.example .env` (po utworzeniu `.env` uruchom kontenery ponownie, bo Docker czyta go przy tworzeniu kontenera).

Prisma (z katalogu głównego, polecenia wykonują się w kontenerze `backend-dev`):

```sh
bun run dev:prisma:seed      # dane przykładowe
bun run dev:prisma:migrate   # nowa migracja po zmianie schema.prisma
bun run dev:prisma:generate  # klient Prisma po zmianie schema.prisma (bez restartu kontenera)
bun run dev:prisma:studio    # podgląd i edycja danych: http://localhost:5555 (Ctrl+C kończy)
bun run dev:db:snapshot      # kopia bazy do backend/data/dev-snapshot.db (do otwarcia w VS Code/DBeaver)
```

**Baza dev leży w wolumenie Dockera** (`/app/backend/data/dev.db` w kontenerze), a nie w katalogu repo. **Nie otwieraj jej z hosta na żywo.** Przy Docker Desktop kontener działa w VM, a SQLite w trybie WAL wymaga pamięci współdzielonej i blokad plików między wszystkimi procesami. Podgląd z hosta (np. rozszerzenie SQLite w VS Code) widziałby wtedy stare dane i mógłby cofnąć zapisy aplikacji. Do przeglądania służy Prisma Studio uruchamiane w kontenerze albo migawka. Zmiany w migawce nie wracają do bazy.

Na świeżym klonie wystarczy `docker compose --profile dev up --build`, bo przy każdym starcie backend sam generuje klienta Prisma i stosuje istniejące migracje. Ręcznie potrzebny jest tylko seed. Uwaga: seed **czyści tabelę users** przed wstawieniem danych (na produkcji odmawia działania). Tworzy też konto pracownika: z `SEED_EMPLOYEE_USERNAME`/`SEED_EMPLOYEE_PASSWORD` z `.env`, a bez nich **`admin`/`admin`**. Ponowny seed tylko aktualizuje hasło. Logowanie: http://localhost:8080/login, potem `/panel` (lista, dodawanie i usuwanie użytkowników).

### Nowy moduł API

```sh
bun run new:module products              # model Product (liczba pojedyncza zgadywana z nazwy)
bun run new:module people --model Person # nazwa modelu podana wprost
```

Generuje `backend/src/api/<nazwa>/` na wzór modułu `users` (GET lista i po id publicznie, POST i DELETE za `requireAuth`, docs, test serwisu), rejestruje router w `src/api/api.ts` i dopisuje model (`id`, `name`, `createdAt`) do `prisma/schema.prisma`. Potem dostosuj pola, uruchom `bun run dev:prisma:migrate` i `bun run gen:api`.

Błędy Prismy nie wymagają obsługi w serwisach: `errorHandler` zamienia duplikat pola `@unique` (P2002) na 409 `CONFLICT` z polem w `details`, a brak rekordu przy update/delete (P2025) na 404.

### Narzędzia na hoście (opcjonalnie)

Aplikacja działa tylko w Dockerze, ale żeby edytor miał podpowiedzi TypeScript, a lint, testy i formatowanie działały bez kontenera, zainstaluj paczki na hoście (wymaga Buna):

```sh
bun run install:all
```

Skrypty z katalogu głównego: `bun run lint | format | format:check | typecheck | test:backend | check:circular`, a `bun run check` uruchamia je wszystkie (to samo robi CI). Testy (`bun test`) nie wymagają bazy, Dockera ani zmiennych środowiska. Typecheck i lint potrzebują wygenerowanego klienta Prisma. Powstaje on na hoście sam po pierwszym `docker compose --profile dev up`, bo katalog `backend/` jest zamontowany w kontenerze. Bez Dockera wygeneruj go ręcznie:

```sh
cd backend && DATABASE_URL=file:./prisma/dev.db bunx --bun prisma generate
```

## Deploy na Droplet (DigitalOcean)

Produkcja to profil `prod`: Nginx na porcie 80 serwuje zbudowany frontend i przekazuje `/api` do backendu. Backend nie jest wystawiony na zewnątrz, a baza SQLite (tryb WAL) leży w wolumenie `<projekt>_backend_data`. Nginx przyjmuje body do 20 MB (uploady) i przepuszcza WebSockety oraz SSE pod `/api`. `index.html` jest zawsze rewalidowany, więc po redeployu przeglądarka nie trzyma starej wersji. Całość mieści się w kilkudziesięciu MB RAM (backend ok. 50 MB, nginx ok. 20 MB).

1. Utwórz Droplet z obrazem **Docker on Ubuntu** (Marketplace) i zaloguj się przez SSH.
2. Przy 2 GB RAM dodaj swap na czas budowania obrazów (`vite build` i `bun install` chwilowo potrzebują więcej pamięci):
   ```sh
   fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
   echo '/swapfile none swap sw 0 0' >> /etc/fstab
   ```
3. Sklonuj repozytorium i utwórz `.env` z `.env.example`. **`JWT_SECRET` jest wymagany na produkcji** (min. 32 znaki, np. `openssl rand -hex 32`): bez niego backend nie wystartuje. Ustaw też `FRONTEND_URL=http://<IP-Dropletu>` oraz **`COOKIE_SECURE=false`**, dopóki aplikacja działa po HTTP: przeglądarki nie zapisują cookie z flagą `Secure` ze strony bez HTTPS, więc bez tej zmiennej logowanie nie zadziała. Żeby utworzyć konto pracownika, podaj `SEED_EMPLOYEE_USERNAME` i `SEED_EMPLOYEE_PASSWORD` (na produkcji hasło musi mieć min. 12 znaków i nie może być domyślne, inaczej skrypt odmówi).
4. Zbuduj i uruchom:
   ```sh
   docker compose --profile prod up -d --build
   ```
5. Konto pracownika z `.env` (nie uruchamia się automatycznie; ponowne uruchomienie jest bezpieczne i tylko aktualizuje hasło):
   ```sh
   bun run prod:employee
   ```
   Skrypt to `backend/prisma/seed-employee.ts`: tworzy tylko konto z `SEED_EMPLOYEE_USERNAME` i `SEED_EMPLOYEE_PASSWORD` (bez tych zmiennych kończy się błędem) i nie dotyka tabeli users. Bez Buna na serwerze: `docker compose --profile prod exec backend bun prisma/seed-employee.ts`. Dane przykładowe (`prisma db seed`) są tylko na dev, bo czyszczą tabelę users.
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

1. W module utwórz/rozszerz `docs/<moduł>.docs.ts` i opisz trasę przez `describeRoute` (wzór: `backend/src/api/users/docs/users.docs.ts`).
2. Schemat odpowiedzi podaj przez `resolver(...)`. Schemat z `.meta({ ref: "Nazwa" })` trafi do `components.schemas`.
3. Dodaj opis jako middleware w routerze: `router.get("/", getUsersDocs, handler)`.

Typy (`User`, `Employee`) wynikają ze schematów zod (`z.infer` w `types/`), więc schemat jest jedynym źródłem prawdy dla specu i kodu. Format błędów (`{ error: { code, message, details? } }`) jest opisany w `ErrorResponseSchema` i przetestowany w `backend/src/middleware/error-handler.test.ts`.

### Typy API na froncie

Frontend nie przepisuje typów ręcznie, tylko generuje je ze speca OpenAPI do `frontend/src/lib/api-types.ts` (plik jest w repo, bo build produkcyjny nie ma dostępu do backendu; nie edytuj go ręcznie). Po zmianie schematu zod lub dodaniu trasy, przy działającym `bun run docker:dev`:

```sh
bun run gen:api   # pobiera http://localhost:3000/api/v1/openapi.json
```

Użycie: `type User = components["schemas"]["User"]` (wzór: `frontend/src/lib/types/user.types.ts`). Do `components.schemas` trafiają tylko schematy z `.meta({ ref: "Nazwa" })`.

## Frontend: wzorce

- **Zapytania** idą przez `api` z `src/lib/api-client.ts` (JSON albo `FormData` przy uploadzie, cookie sesji, błędy jako `ApiError` z `status`, `code` i `details`). Hooki TanStack Query trzymaj w `src/features/<nazwa>/` razem z fabryką kluczy (wzór: `features/users/users.hooks.ts`: `useUsers`, `useCreateUser`, `useDeleteUser`).
- **Auth:** `useMe()` zwraca zalogowanego pracownika albo `null`, a `useLogin()` i `useLogout()` to mutacje (`features/auth/auth.hooks.ts`). Strony chronione wkładasz pod `<Route element={<RequireAuth />}>` w `App.tsx`. Bez sesji następuje przekierowanie na `/login` i powrót po zalogowaniu. 401 z dowolnego zapytania czyści sesję w cache, więc `RequireAuth` odsyła na logowanie.
- **Formularze:** `<Input label name error={fieldError(mutation.error, "email")} />` pokazuje błąd pola z 422/409, a `<FormError error={mutation.error} />` komunikat ogólny (wzór: `pages/Panel.tsx`).
- `ErrorBoundary` zamiast białego ekranu przy błędzie renderu, React Query Devtools (ikonka w rogu) tylko w dev.
