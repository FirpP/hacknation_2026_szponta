import { describe, expect, it, mock } from "bun:test";
import { Hono } from "hono";
import { PanelController } from "@api/panel/controllers/panel.controller";
import type { Employee, IAuthService } from "@api/auth/types/auth.types";
import { UnauthorizedError } from "@lib/errors/app-errors";
import { errorHandler } from "@middleware/error-handler";
import type { AuthVariables } from "@middleware/auth";

const EMPLOYEE_ID = "e1";
const employee: Employee = { id: "7d9e1a4c-2b3f-4c5d-8e6a-1f0b9c8d7e6f", username: "admin" };

const createService = (overrides: Partial<IAuthService> = {}): IAuthService => ({
  login: mock(),
  getEmployeeById: mock(async (): Promise<Employee> => employee),
  ...overrides,
});

// employeeId ustawiamy ręcznie - requireAuth ma własne testy w middleware/auth.test.ts
const makeApp = (service: IAuthService) => {
  const controller = new PanelController(service);
  const app = new Hono<{ Variables: AuthVariables }>();
  app.onError(errorHandler);
  app.use(async (c, next) => {
    c.set("employeeId", EMPLOYEE_ID);
    await next();
  });
  app.get("/", (c) => controller.getPanelData(c));
  return app;
};

describe("PanelController", () => {
  it("powinien odpowiedzieć statusem 200 i danymi pracownika bez ruszania cookie", async () => {
    const service = createService();

    const res = await makeApp(service).request("/");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(employee);
    expect(service.getEmployeeById).toHaveBeenCalledWith(EMPLOYEE_ID);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("powinien usunąć cookie i odpowiedzieć statusem 401 gdy konto nie istnieje", async () => {
    const service = createService({
      getEmployeeById: mock(async (): Promise<Employee> => {
        throw new UnauthorizedError("Sesja wygasła lub konto nie istnieje.");
      }),
    });

    const res = await makeApp(service).request("/");

    expect(res.status).toBe(401);

    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("session=");
    expect(cookie).toContain("Max-Age=0");

    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe("Sesja wygasła lub konto nie istnieje.");
  });

  it("nie powinien usuwać cookie przy innym błędzie niż UnauthorizedError", async () => {
    const service = createService({
      getEmployeeById: mock(async (): Promise<Employee> => {
        throw new Error("Awaria bazy danych");
      }),
    });

    const res = await makeApp(service).request("/");

    expect(res.status).toBe(500);
    expect(res.headers.get("set-cookie")).toBeNull();
  });
});
