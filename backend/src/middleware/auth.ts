import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";
import { ENV } from "@lib/constants/env";
import { SESSION_COOKIE } from "@lib/constants/session";
import { UnauthorizedError } from "@lib/errors/app-errors";

export type AuthVariables = { employeeId: string };

/**
 * @description
 * Wymaga ważnego JWT w cookie sesji. Przy braku lub niepoprawnym tokenie rzuca UnauthorizedError (401).
 * Po sukcesie ustawia zmienną lokalną dla requestu.
 * Pozyskanie wartości zmiennej lokalnej: `c.get("employeeId")`.
 *
 * @example
 * router.get("/", getPanelDocs, requireAuth, async (c) => {
 *   const employee = await authService.getEmployeeById(c.get("employeeId"));
 *   return c.json(employee, 200);
 * });
 */
export const requireAuth = createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) {
    throw new UnauthorizedError();
  }

  let sub: unknown;
  try {
    ({ sub } = await verify(token, ENV.JWT_SECRET, "HS256"));
  } catch {
    throw new UnauthorizedError();
  }

  if (typeof sub !== "string") {
    throw new UnauthorizedError();
  }

  c.set("employeeId", sub);
  await next();
});
