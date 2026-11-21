import { describe, expect, it, mock } from "bun:test";
import { verify } from "hono/jwt";
import { AuthService } from "@api/auth/services/auth.service";
import { UnauthorizedError } from "@lib/errors/app-errors";
import type { Employee, EmployeeWithHash, IAuthRepository } from "@api/auth/types/auth.types";

const SECRET = "test-secret-test-secret-test-secret-1234";
const config = { jwtSecret: SECRET, expiresInSeconds: 60 };

const makeRepo = (found: EmployeeWithHash | null): IAuthRepository => ({
  findByUsername: mock(async () => found),
  findById: mock(async (): Promise<Employee | null> => (found ? { id: found.id, username: found.username } : null)),
});

describe("AuthService", () => {
  it("loguje przy poprawnym haśle", async () => {
    const passwordHash = await Bun.password.hash("sekret");
    const service = new AuthService(makeRepo({ id: "e1", username: "admin", passwordHash }), config);

    const token = await service.login("admin", "sekret");

    const payload = await verify(token, SECRET, "HS256");
    expect(payload.sub).toBe("e1");
  });

  it("rzuca UnauthorizedError przy złym haśle", async () => {
    const passwordHash = await Bun.password.hash("sekret");
    const service = new AuthService(makeRepo({ id: "e1", username: "admin", passwordHash }), config);

    // await czeka na wynik Promise i sprawdzenie asercji; bez await test by przeszedł mimo braku błędu
    await expect(service.login("admin", "zle")).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rzuca UnauthorizedError gdy login nie istnieje (ten sam komunikat)", async () => {
    const service = new AuthService(makeRepo(null), config);

    const err = await service.login("nikt", "x").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(UnauthorizedError);
    expect((err as UnauthorizedError).message).toBe("Niepoprawny login lub hasło.");
  });

  it("getEmployeeById rzuca UnauthorizedError gdy konto nie istnieje", async () => {
    const service = new AuthService(makeRepo(null), config);

    // await czeka na wynik Promise i sprawdzenie asercji; bez await test by przeszedł mimo braku błędu
    await expect(service.getEmployeeById("e1")).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
