import { describe, expect, it, mock } from "bun:test";
import { Hono } from "hono";
import { AuthController } from "@api/auth/controllers/auth.controller";
import type { IAuthService } from "@api/auth/types/auth.types";
import { ENV } from "@lib/constants/env";
import { UnauthorizedError } from "@lib/errors/app-errors";
import { errorHandler } from "@middleware/error-handler";

const createService = (overrides: Partial<IAuthService> = {}): IAuthService => ({
  login: mock(async (): Promise<string> => "valid-token"),
  getEmployeeById: mock(),
  ...overrides,
});

const makeApp = (service: IAuthService) => {
  const controller = new AuthController(service);
  const app = new Hono();
  app.onError(errorHandler);
  app.post("/login", (c) => controller.login(c, { username: "admin", password: "sekret" }));
  app.post("/logout", (c) => controller.logout(c));
  return app;
};

describe("AuthController", () => {
  describe("login", () => {
    it("powinien odpowiedzieć statusem 204 i ustawić cookie sesji", async () => {
      const service = createService();

      const res = await makeApp(service).request("/login", { method: "POST" });

      expect(res.status).toBe(204);
      expect(await res.text()).toBe("");
      expect(service.login).toHaveBeenCalledWith("admin", "sekret");

      const cookie = res.headers.get("set-cookie") ?? "";
      expect(cookie).toContain("session=valid-token");
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("SameSite=Lax");
      expect(cookie).toContain("Path=/");
      expect(cookie).toContain(`Max-Age=${ENV.JWT_EXPIRES_IN_SECONDS}`);
    });

    it("powinien odpowiedzieć statusem 401 bez cookie gdy serwis rzuci UnauthorizedError", async () => {
      const service = createService({
        login: mock(async (): Promise<string> => {
          throw new UnauthorizedError("Niepoprawny login lub hasło.");
        }),
      });

      const res = await makeApp(service).request("/login", { method: "POST" });

      expect(res.status).toBe(401);
      expect(res.headers.get("set-cookie")).toBeNull();
    });
  });

  describe("logout", () => {
    it("powinien odpowiedzieć statusem 204 i usunąć cookie sesji", async () => {
      const res = await makeApp(createService()).request("/logout", { method: "POST" });

      expect(res.status).toBe(204);

      const cookie = res.headers.get("set-cookie") ?? "";
      expect(cookie).toContain("session=");
      expect(cookie).toContain("Max-Age=0");
    });
  });
});
