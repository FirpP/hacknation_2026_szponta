# Jeden Dockerfile dla całego projektu. Cele (target):
#   dev-backend / dev-frontend - hot reload (docker compose --profile dev)
#   backend - API na Bun, produkcja
#   web     - nginx ze zbudowanym frontendem, produkcja

FROM oven/bun:1.4 AS base
WORKDIR /app

# Zależności są instalowane osobno, żeby zmiana w jednym pakiecie nie unieważniała cache'u drugiego
FROM base AS deps-backend
WORKDIR /app/backend
COPY backend/package.json backend/bun.lock ./
RUN bun install --frozen-lockfile

FROM base AS deps-frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/bun.lock ./
RUN bun install --frozen-lockfile

# ---------- dev (osobne kontenery, osobne logi) ----------
# Kod przychodzi z bind mounta. node_modules z obrazu zasilają wolumen przy pierwszym uruchomieniu,
# a start i tak robi bun install, żeby dociągnąć paczki dodane później.
# Baza startowa (snapshot) jest wgrywana do obrazu przy buildzie, poza /app/backend/data, bo ten katalog jest wolumenem.
# Przy starcie db:restore wgrywa ją do dev.db tylko wtedy, gdy baza nie istnieje albo jest pusta.
FROM deps-backend AS dev-backend
COPY backend/data/snapshot.db /app/seed/snapshot.db
ENV SNAPSHOT_PATH=/app/seed/snapshot.db
EXPOSE 3000
CMD ["sh", "-c", "bun install && bunx --bun prisma generate && bun run db:restore && bunx --bun prisma migrate deploy && exec bun run dev"]

FROM deps-frontend AS dev-frontend
EXPOSE 8080
CMD ["sh", "-c", "bun install && exec bun run dev"]

# ---------- backend (prod) ----------
FROM deps-backend AS backend
ENV NODE_ENV=production
COPY backend/ ./
# generate nie łączy się z bazą, ale prisma.config.ts wymaga zmiennej DATABASE_URL (docelowy jest ustawiany w runtime)
RUN DATABASE_URL=file:./data/prod.db bunx --bun prisma generate
# Baza startowa (snapshot) poza /app/backend/data, bo ten katalog jest wolumenem i zasłania pliki z obrazu.
# Kopię z COPY backend/ usuwamy, żeby Docker nie wypełnił nią pustego wolumenu (zbędne 5 MB obok bazy).
RUN rm -f /app/backend/data/snapshot.db
COPY backend/data/snapshot.db /app/seed/snapshot.db
ENV SNAPSHOT_PATH=/app/seed/snapshot.db
EXPOSE 3000
# Na starcie: wgranie snapshotu do pustej bazy (istniejącej nie rusza), migracje, serwer bez hot reload
CMD ["sh", "-c", "bun run db:restore && bunx --bun prisma migrate deploy && exec bun run src/index.ts"]

# ---------- build frontendu ----------
FROM deps-frontend AS build
COPY frontend/ ./
RUN bun run build

# ---------- web (prod) ----------
FROM nginx:1.27-alpine AS web
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
