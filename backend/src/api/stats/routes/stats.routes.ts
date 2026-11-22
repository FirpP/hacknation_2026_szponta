import { Hono } from "hono";
import { StatsController } from "@api/stats/controllers/stats.controller";
import { getStatsDocs } from "@api/stats/docs/stats.docs";
import { statsService } from "@api/stats/stats.container";

const controller = new StatsController(statsService);

// /api/v1/stats
export const statsRouter = new Hono();

statsRouter.get("/", getStatsDocs, (c) => controller.getStats(c));
