import { describe, expect, it } from "bun:test";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import { ENV } from "@lib/constants/env";
import { errorHandler } from "@middleware/error-handler";
import { requireAuth, type AuthVariables } from "@middleware/auth";

const makeApp = () => {
  const app = new Hono<{ Variables: AuthVariables }>();
  app.onError(errorHandler);
  app.use(requireAuth);
  app.get("/", (c) => c.json({ id: c.get("employeeId") }));
  return app;
};

const withCookie = (token: string) => ({ headers: { Cookie: `session=${token}` } });
const now = () => Math.floor(Date.now() / 1000);

describe("requireAuth", () => {
  it("401 bez cookie", async () => {
    const res = await makeApp().request("/");
    expect(res.status).toBe(401);
  });

  it("401 przy tokenie podpisanym innym sekretem", async () => {
    const token = await sign({ sub: "e1", exp: now() + 60 }, "inny-sekret-inny-sekret-inny-sekret-12", "HS256");
    const res = await makeApp().request("/", withCookie(token));
    expect(res.status).toBe(401);
  });

  it("401 przy wygasłym tokenie", async () => {
    const token = await sign({ sub: "e1", exp: now() - 10 }, ENV.JWT_SECRET, "HS256");
    const res = await makeApp().request("/", withCookie(token));
    expect(res.status).toBe(401);
  });

  it("401 przy tokenie bez sub", async () => {
    const token = await sign({ exp: now() + 60 }, ENV.JWT_SECRET, "HS256");
    const res = await makeApp().request("/", withCookie(token));
    expect(res.status).toBe(401);
  });

  it("przepuszcza ważny token i ustawia employeeId", async () => {
    const token = await sign({ sub: "e1", exp: now() + 60 }, ENV.JWT_SECRET, "HS256");
    const res = await makeApp().request("/", withCookie(token));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "e1" });
  });
});
