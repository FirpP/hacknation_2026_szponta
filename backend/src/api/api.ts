import { Hono } from "hono";
import { openAPIRouteHandler } from "hono-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { ENV } from "@lib/constants/env";

import authRouter from "@api/auth/routes/auth.routes";
import panelRouter from "@api/panel/routes/panel.routes";

// /api/v1
export const router = new Hono();

router.route("/auth", authRouter);
router.route("/panel", panelRouter);

// Swagger tylko w developmencie - /api/v1/docs (UI) i /api/v1/openapi.json (spec)
if (ENV.NODE_ENV !== "production") {
  router.get(
    "/openapi.json",
    openAPIRouteHandler(router, {
      documentation: {
        info: {
          title: "Hacknation 2026 API",
          version: "1.0.0",
        },
        components: {
          securitySchemes: {
            cookieAuth: { type: "apiKey", in: "cookie", name: "session" },
          },
        },
        servers: [
          {
            url: "/api/v1",
          },
        ],
      },
    }),
  );
  router.get(
    "/docs",
    swaggerUI({
      url: "/api/v1/openapi.json",
    }),
  );
}

export default router;
