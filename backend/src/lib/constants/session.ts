import { ENV } from "@lib/constants/env";

export const SESSION_COOKIE = "session";

// Powtarzalne ustawienia cookie sesji, żeby nie powtarzać w kodzie kontrolera i middleware.
// Jeśli ustawienia cookie będą się różnić przeglądarka może nie usunąć cookie przy wylogowaniu (np. różne flagi secure).
export const sessionCookieOptions = () => ({
  httpOnly: true,
  secure: ENV.COOKIE_SECURE, // patrz COOKIE_SECURE w lib/constants/env.ts
  sameSite: "Lax" as const,
  path: "/",
});
