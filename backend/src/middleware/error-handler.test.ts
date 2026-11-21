import { describe, expect, it, spyOn } from "bun:test";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { z } from "zod";
import { errorHandler } from "@middleware/error-handler";
import { validate } from "@middleware/validate";
import { ConflictError, NotFoundError, ValidationError } from "@lib/errors/app-errors";
import { UsersController } from "@api/users/controllers/users.controller";
import { UsersService } from "@api/users/services/users.service";
import { GetUserIdParamsSchema } from "@api/users/validators/users.validator";
import type { User } from "@api/users/types/users.types";

// Kontrakt błędów: { error: { code, message, details? } } i odpowiedni status HTTP.
// Test na małej aplikacji, bez bazy: te same middleware, kontroler i serwis co w prawdziwych trasach.

const buildApp = (route: () => never | Response) => {
  const app = new Hono();
  app.onError(errorHandler);
  app.get("/boom", () => route());
  return app;
};

// errorHandler loguje 5xx przez console.error, a 4xx przez console.warn
const silenceConsole = () => {
  const spies = [spyOn(console, "error"), spyOn(console, "warn")].map((s) => s.mockImplementation(() => {}));
  return { mockRestore: () => spies.forEach((s) => s.mockRestore()) };
};

describe("errorHandler", () => {
  it("AppError (NotFoundError) -> 404 i kod NOT_FOUND", async () => {
    const spy = silenceConsole();
    const res = await buildApp(() => {
      throw new NotFoundError("Brak zasobu");
    }).request("/boom");

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: "NOT_FOUND", message: "Brak zasobu" } });
    spy.mockRestore();
  });

  it("AppError (ConflictError) -> 409 i kod CONFLICT", async () => {
    const spy = silenceConsole();
    const res = await buildApp(() => {
      throw new ConflictError("Duplikat");
    }).request("/boom");

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: { code: "CONFLICT", message: "Duplikat" } });
    spy.mockRestore();
  });

  it("ValidationError -> 422 z listą details", async () => {
    const spy = silenceConsole();
    const res = await buildApp(() => {
      throw new ValidationError("Zły input", [{ field: "email", message: "Niepoprawny" }]);
    }).request("/boom");

    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Zły input",
        details: [{ field: "email", message: "Niepoprawny" }],
      },
    });
    spy.mockRestore();
  });

  it("HTTPException -> status wyjątku i kod BAD_REQUEST", async () => {
    const res = await buildApp(() => {
      throw new HTTPException(400, { message: "Malformed JSON" });
    }).request("/boom");

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: { code: "BAD_REQUEST", message: "Malformed JSON" } });
  });

  it("HTTPException z innym statusem -> kod zależny od statusu", async () => {
    const res = await buildApp(() => {
      throw new HTTPException(413, { message: "Za duże body" });
    }).request("/boom");

    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ error: { code: "PAYLOAD_TOO_LARGE", message: "Za duże body" } });
  });

  it("Prisma P2002 (duplikat) -> 409 CONFLICT z polem w details", async () => {
    const spy = silenceConsole();
    const res = await buildApp(() => {
      throw new PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
        meta: { modelName: "User", driverAdapterError: { cause: { constraint: { fields: ["email"] } } } },
      });
    }).request("/boom");

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: {
        code: "CONFLICT",
        message: "Wartość pola email jest już zajęta.",
        details: [{ field: "email", message: "Wartość jest już zajęta." }],
      },
    });
    spy.mockRestore();
  });

  it("Prisma P2025 (brak rekordu) -> 404 NOT_FOUND", async () => {
    const spy = silenceConsole();
    const res = await buildApp(() => {
      throw new PrismaClientKnownRequestError("Record not found", {
        code: "P2025",
        clientVersion: "test",
        meta: { modelName: "User" },
      });
    }).request("/boom");

    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("NOT_FOUND");
    spy.mockRestore();
  });

  it("surowy ZodError -> 422 z details (ścieżka pola zapisana kropkami)", async () => {
    const spy = silenceConsole();
    const res = await buildApp(() => {
      z.object({ user: z.object({ age: z.number() }) }).parse({ user: { age: "x" } });
      throw new Error("unreachable");
    }).request("/boom");

    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: { code: string; details: { field: string }[] } };
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details[0]?.field).toBe("user.age");
    spy.mockRestore();
  });

  it("nieznany błąd -> 500 bez wycieku szczegółów", async () => {
    const spy = silenceConsole();
    const res = await buildApp(() => {
      throw new Error("sekretne szczegóły bazy");
    }).request("/boom");

    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).not.toContain("sekretne");
    expect(JSON.parse(text)).toEqual({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Coś poszło nie tak" },
    });
    spy.mockRestore();
  });
});

describe("trasa GET /users/:id (kontrakt błędów end-to-end)", () => {
  const buildUsersApp = (found: User | null) => {
    const repo = {
      getAll: async () => [],
      getById: async () => found,
      create: async () => found!,
      deleteById: async () => false,
    };
    const controller = new UsersController(new UsersService(repo));
    const app = new Hono();
    app.onError(errorHandler);
    app.get("/users/:id", validate("param", GetUserIdParamsSchema), (c) =>
      controller.getUserById(c, c.req.valid("param")),
    );
    return app;
  };

  it("niepoprawny UUID -> 422 z details wskazującym pole id", async () => {
    const spy = silenceConsole();
    const res = await buildUsersApp(null).request("/users/nie-uuid");

    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: { code: string; details: { field: string }[] } };
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details.map((d) => d.field)).toEqual(["id"]);
    spy.mockRestore();
  });

  it("poprawny UUID, ale brak użytkownika -> 404", async () => {
    const spy = silenceConsole();
    const res = await buildUsersApp(null).request("/users/3f2b8c1e-5a4d-4e7b-9c1a-2d6e8f0a1b3c");

    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("NOT_FOUND");
    spy.mockRestore();
  });

  it("poprawny UUID i istniejący użytkownik -> 200", async () => {
    const user: User = { id: "3f2b8c1e-5a4d-4e7b-9c1a-2d6e8f0a1b3c", name: "Jan", email: "jan@example.com" };
    const res = await buildUsersApp(user).request(`/users/${user.id}`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(user);
  });
});
