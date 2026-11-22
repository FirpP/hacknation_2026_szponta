import "dotenv/config"; //! Prisma CLI nie wczytuje .env samodzielnie
import { defineConfig, env } from "prisma/config";
import type { PrismaConfig } from "prisma";

// Celowo bez importu ENV z aplikacji: CLI Prismy (generate, migrate) potrzebuje tylko DATABASE_URL,
// a walidacja całego ENV przerywałaby build obrazu, w którym nie ma pliku .env.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
}) satisfies PrismaConfig;
