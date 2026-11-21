import { PrismaClient } from "../prisma/generated/client";
import { PrismaBunSqlite } from "prisma-adapter-bun-sqlite";
import { ENV } from "@lib/constants/env";

const createPrismaClient = () =>
  new PrismaClient({
    adapter: new PrismaBunSqlite({
      url: ENV.DATABASE_URL,
      // WAL + busy_timeout: równoległe zapisy czekają zamiast kończyć się błędem "database is locked"
      wal: {
        enabled: true,
        synchronous: "NORMAL",
        busyTimeout: 5000,
      },
    }),
    log: ENV.PRISMA_LOG ? ["query"] : [],
  });

// bun --hot przeładowuje moduły, ale zachowuje globalThis. Bez tego każdy reload w dev
// otwierałby nowe połączenie z SQLite, a stare zostawałyby otwarte.
const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createPrismaClient> };

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (ENV.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
