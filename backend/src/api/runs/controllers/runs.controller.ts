import type { Context } from "hono";
import type { IRunsService } from "@api/runs/types/runs.types";
import type { RunsQuery } from "@api/runs/validators/runs.validator";

export class RunsController {
  constructor(private readonly service: IRunsService) {}

  async listRuns(c: Context, query: RunsQuery) {
    return c.json(await this.service.listRuns(query), 200);
  }
}
