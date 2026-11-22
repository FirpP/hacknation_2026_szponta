# Radar Innowacji

Prototyp na wyzwanie Podkarpackiego Centrum Innowacji (HackNation 2026). Robot zbiera istniejące innowacje z publicznych źródeł, model AI opisuje je jako karty z oceną potencjału, rekomendowaną ścieżką i cytatami ze źródeł, a strona pozwala je przeszukiwać i filtrować. Aplikacja jest publiczna i tylko do odczytu.

Backend: Hono + Prisma + SQLite (`backend/`). Frontend: React + Vite (`frontend/`). Całość działa w Dockerze.

## Wymagania

- Docker z Docker Compose v2
- Bun (opcjonalnie, tylko do skrótów `bun run ...` z katalogu głównego; każdy skrót ma odpowiednik w `docker compose`)

## Uruchomienie

```sh
docker compose --profile dev up --build    # development, hot reload
docker compose --profile prod up -d --build   # produkcja
```

| Profil | Adres                                                         | Uwagi                                      |
| ------ | ------------------------------------------------------------- | ------------------------------------------ |
| `dev`  | http://localhost:8080 (frontend), http://localhost:3000 (API) | Swagger: http://localhost:8080/api/v1/docs |
| `prod` | http://localhost (nginx, port `APP_PORT`)                     | API tylko przez nginx pod `/api`           |

Przy pierwszym starcie kontener wgrywa gotową bazę z `backend/data/snapshot.db` (karty bez scrapowania i bez kosztów LLM), generuje klienta Prisma i stosuje migracje. Wgranie następuje tylko do pustej bazy, więc istniejących danych nic nie nadpisze. Baza leży w wolumenie Dockera i nie należy otwierać jej z hosta na żywo.

Aby wgrać snapshot od nowa, usuń wolumen z bazą i uruchom ponownie (`docker compose --profile dev down -v`; na produkcji to kasuje bazę).

## Konfiguracja (opcjonalna)

Domyślne wartości wystarczą do uruchomienia. Aby coś zmienić: `cp .env.example .env`, a po zmianie odtwórz kontenery (`docker compose --profile dev up -d`), bo Docker czyta `.env` przy ich tworzeniu.

| Zmienna                                             | Do czego                                                                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`          | Analiza nowych rekordów modelem zgodnym z API OpenAI. Bez nich nowe rekordy są pobierane, ale nie analizowane |
| `EPO_OPS_KEY`, `EPO_OPS_SECRET`                     | Źródła `epo` i `uprp` (bez kluczy są pomijane)                                                                |
| `PBN_APP_ID`, `PBN_APP_TOKEN`                       | Źródło `pbn` (bez tokenu jest pomijane)                                                                       |
| `RADAR_CRON`, `RADAR_TZ`                            | Termin nocnego odświeżania, domyślnie `0 3 * * *` w strefie `Europe/Warsaw`                                   |
| `RADAR_CRON_ENABLED_PROD`, `RADAR_CRON_ENABLED_DEV` | Automatyczne odświeżanie bazy: domyślnie włączone na produkcji i wyłączone w dev                              |
| `APP_PORT`, `FRONTEND_PORT`, `BACKEND_PORT`         | Porty wystawiane na hoście                                                                                    |

## Dane

Na produkcji backend sam uruchamia pipeline (pobranie źródeł i analiza) codziennie o 03:00 czasu polskiego. Ręcznie, z katalogu głównego (w kontenerze `backend-dev`):

```sh
bun run pipeline                 # pobranie wszystkich źródeł + analiza
bun run scrape:ncbr --limit 5    # jedno źródło (ncbr|baztol|epo|uprp|ppm|pbn|pan|interreg)
bun run analyze                  # analiza nowych i zmienionych rekordów
bun run db:snapshot              # zapis bazy do backend/data/snapshot.db (dev, a gdy go nie ma prod)
```

Na produkcji to samo: `docker compose --profile prod exec backend bun run pipeline`.

## Kontrola jakości

```sh
bun run install:all   # zależności backendu i frontendu
bun run check         # typy, lint, format, testy, cykle zależności
```

## Licencja i autorzy

Projekt jest udostępniany na licencji **EUPL-1.2** (pełny tekst w pliku [LICENSE](LICENSE)).

Licensed under the EUPL

Autorzy: Najdz3l, FirpP, Sachiko7552, yDarknessGuy, GRATIZZZ1311, pelus2115.
