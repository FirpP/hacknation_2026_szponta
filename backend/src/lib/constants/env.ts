import { z } from "zod";
import type { ApplicationEnvironment } from "@lib/types/env.types";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.preprocess((v) => parseInt(String(v ?? "3000"), 10), z.number().int().positive()),
  DATABASE_URL: z.string().min(1),
  FRONTEND_URL: z.url().default("http://localhost:8080"),
  PRISMA_LOG: z.preprocess((v) => v === true || v === "true", z.boolean().default(false)),
  JWT_SECRET: z.string().min(32, "JWT_SECRET musi mieć min. 32 znaki").optional(),
  JWT_EXPIRES_IN_SECONDS: z.preprocess((v) => parseInt(String(v ?? "28800"), 10), z.number().int().positive()),
  // Flaga Secure cookie sesji. Brak zmiennej = Secure tylko na produkcji.
  COOKIE_SECURE: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:\n", z.treeifyError(parsed.error));
  throw new Error("Environment validation failed");
}

// Developmentowy sekret JWT aby go nie ustawiać w .env
const DEV_JWT_SECRET = "development-secret-change-me-0123456789abcdef";
if (parsed.data.NODE_ENV === "production" && !parsed.data.JWT_SECRET) {
  throw new Error("JWT_SECRET jest wymagany na produkcji (min. 32 znaki)");
}

// Przeglądarki nie zapisują cookie z flagą Secure ustawionego przez stronę po HTTP,
// więc produkcja bez HTTPS (np. http://<IP-Dropletu>) wymaga COOKIE_SECURE=false.
const COOKIE_SECURE = parsed.data.COOKIE_SECURE ?? parsed.data.NODE_ENV === "production";
if (parsed.data.NODE_ENV === "production" && !COOKIE_SECURE) {
  console.warn("COOKIE_SECURE=false: cookie sesji bez flagi Secure. Używaj tylko, gdy produkcja działa bez HTTPS.");
}

export const ENV: ApplicationEnvironment = {
  NODE_ENV: parsed.data.NODE_ENV,
  PORT: parsed.data.PORT,
  DATABASE_URL: parsed.data.DATABASE_URL,
  FRONTEND_URL: parsed.data.FRONTEND_URL,
  PRISMA_LOG: parsed.data.PRISMA_LOG,
  JWT_SECRET: parsed.data.JWT_SECRET ?? DEV_JWT_SECRET,
  JWT_EXPIRES_IN_SECONDS: parsed.data.JWT_EXPIRES_IN_SECONDS,
  COOKIE_SECURE,
} as const;
