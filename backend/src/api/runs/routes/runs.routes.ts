import { Hono } from "hono";
import { RunsController } from "@api/runs/controllers/runs.controller";
import { listRunsDocs } from "@api/runs/docs/runs.docs";
import { RunsQuerySchema } from "@api/runs/validators/runs.validator";
import { validate } from "@middleware/validate";
import { runsService } from "@api/runs/runs.container";

const controller = new RunsController(runsService);

// /api/v1/runs
export const runsRouter = new Hono();

runsRouter.get("/", listRunsDocs, validate("query", RunsQuerySchema), (c) =>
  controller.listRuns(c, c.req.valid("query")),
);
