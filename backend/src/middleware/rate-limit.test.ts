import { describe, expect, it } from "bun:test";
import { Hono } from "hono";
import { errorHandler } from "@middleware/error-handler";
import { rateLimit } from "@middleware/rate-limit";

const makeApp = (max: number) => {
  const app = new Hono();
  app.onError(errorHandler);
  app.use(rateLimit({ max, windowMs: 60_000 }));
  app.get("/", (c) => c.text("ok"));
  return app;
};

const req = (app: Hono, ip: string) => app.request("/", { headers: { "x-real-ip": ip } });

describe("rateLimit", () => {
  it("blokuje po przekroczeniu limitu i zwraca Retry-After", async () => {
    const app = makeApp(2);
    expect((await req(app, "1.1.1.1")).status).toBe(200);
    expect((await req(app, "1.1.1.1")).status).toBe(200);

    const blocked = await req(app, "1.1.1.1");
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0);
  });

  it("liczy limity osobno dla każdego IP", async () => {
    const app = makeApp(1);
    expect((await req(app, "1.1.1.1")).status).toBe(200);
    expect((await req(app, "2.2.2.2")).status).toBe(200);
  });
});
