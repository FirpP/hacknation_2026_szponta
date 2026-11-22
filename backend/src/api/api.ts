import { Hono } from "hono";
import { openAPIRouteHandler } from "hono-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { ENV } from "@lib/constants/env";

import { cardsRouter } from "@api/cards/routes/cards.routes";
import { runsRouter } from "@api/runs/routes/runs.routes";
import { statsRouter } from "@api/stats/routes/stats.routes";

// /api/v1
export const router = new Hono();

router.route("/cards", cardsRouter);
router.route("/runs", runsRouter);
router.route("/stats", statsRouter);

// Swagger tylko w developmencie - /api/v1/docs (UI) i /api/v1/openapi.json (spec)
if (ENV.NODE_ENV !== "production") {
  router.get(
    "/openapi.json",
    openAPIRouteHandler(router, {
      documentation: {
        info: {
          title: "Radar Innowacji API",
          version: "1.0.0",
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
