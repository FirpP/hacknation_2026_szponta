import { createMiddleware } from "hono/factory";
import { getConnInfo } from "@hono/bun";
import { TooManyRequestsError } from "@lib/errors/app-errors";
import { ENV } from "@lib/constants/env";

type Options = { max: number; windowMs: number };

/**
 * @description
 * Prosty limit żadań na IP, trzymany w pamięci procesu (reset po restarcie, bez współdzielenia między instancjami).
 * IP z X-Real-IP (ustawia nginx na produkcji), poza proxy z adresu połączenia.
 * @param Options - konfiguracja limitu
 * @param Options.max - maksymalna liczba żądań w oknie czasowym
 * @param Options.windowMs - długość okna czasowego w milisekundach
 * @returns createMiddleware, który rzuca TooManyRequestsError (429) przy przekroczeniu limitu
 * @example
 * const loginRateLimit = rateLimit({ max: 5, windowMs: 60_000 });
 * router.post("/login", loginRateLimit, (c) => authController.login(c));
 */
export const rateLimit = ({ max, windowMs }: Options) => {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return createMiddleware(async (c, next) => {
    const now = Date.now();

    // Sprzątanie wygasłych wpisów, żeby mapa nie rosła w nieskończoność
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }

    let ip = c.req.header("x-real-ip");
    if (!ip) {
      try {
        ip = getConnInfo(c).remote.address;
      } catch {
        // W testach nie ma połączenia, więc remote.address rzuca.
        // W produkcji powinien być nagłówek X-Real-IP z proxy.
        if (ENV.NODE_ENV === "production") {
          console.error(
            "Nie udało się pozyskać adresu IP klienta w rateLimit middleware. W produkcji powinien być ustawiony nagłówek X-Real-IP przez proxy.",
          );
        }
      }
    }
    const key = ip ?? "unknown";

    const entry = hits.get(key) ?? { count: 0, resetAt: now + windowMs };
    entry.count += 1;
    hits.set(key, entry);

    if (entry.count > max) {
      throw new TooManyRequestsError(
        "Zbyt wiele prób. Spróbuj ponownie za chwilę.",
        Math.ceil((entry.resetAt - now) / 1000),
      );
    }

    await next();
  });
};
