import "dotenv/config"; //! Prisma CLI nie wczytuje .env samodzielnie
import { defineConfig, env } from "prisma/config";
import type { PrismaConfig } from "prisma";

// Celowo bez importu ENV z aplikacji: CLI Prismy (generate, migrate) potrzebuje tylko DATABASE_URL,
// a walidacja całego ENV (np. JWT_SECRET na produkcji) przerywałaby build obrazu, w którym nie ma sekretów.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "bun prisma/seed/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
}) satisfies PrismaConfig;
