import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import { AppError, TooManyRequestsError, ValidationError } from "@lib/errors/app-errors";
import { mapPrismaError } from "@lib/errors/prisma-errors";

const getCurrentTimestamp = () => new Date().toISOString();

// Kody dla błędów rzucanych przez Hono (HTTPException), żeby nie wszystko było BAD_REQUEST
const HTTP_EXCEPTION_CODES: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  413: "PAYLOAD_TOO_LARGE",
};

const respond = (c: Context, err: AppError) => {
  if (err instanceof TooManyRequestsError) {
    c.header("Retry-After", String(err.retryAfterSeconds));
  }
  // 4xx to oczekiwane błędy klienta: jedna linia bez stacka, żeby nie zagłuszały prawdziwych 500
  if (err.statusCode >= 500) {
    console.error(`[${getCurrentTimestamp()}] [${err.name}] ${c.req.method} ${c.req.path}:`, err.message, err.stack);
  } else {
    console.warn(`[${getCurrentTimestamp()}] [${err.name}] ${c.req.method} ${c.req.path}: ${err.message}`);
  }
  return c.json(
    {
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    },
    err.statusCode,
  );
};

export const errorHandler = (err: Error, c: Context) => {
  if (err instanceof AppError) {
    return respond(c, err);
  }

  // Znane błędy Prismy (duplikat -> 409, brak rekordu -> 404), np. z repository.create()/delete()
  const prismaError = mapPrismaError(err);
  if (prismaError) {
    return respond(c, prismaError);
  }

  // Błędy rzucane przez Hono, np. niepoprawny JSON w body przy validate("json", ...)
  if (err instanceof HTTPException) {
    return c.json(
      {
        error: {
          code: HTTP_EXCEPTION_CODES[err.status] ?? `HTTP_${err.status}`,
          message: err.message,
        },
      },
      err.status,
    );
  }

  // Sieć bezpieczeństwa - surowy ZodError z głębszej walidacji (np. schema.parse() w serwisie)
  if (err instanceof ZodError) {
    console.error(`[${getCurrentTimestamp()}] [Unhandled ZodError]:`, err.issues);
    return respond(c, ValidationError.fromIssues(err.issues));
  }

  console.error(`[${getCurrentTimestamp()}] [Unhandled Error] ${c.req.method} ${c.req.path}:`, err);

  return c.json(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Coś poszło nie tak",
      },
    },
    500,
  );
};
