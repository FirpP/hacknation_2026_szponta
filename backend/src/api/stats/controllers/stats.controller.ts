import type { Context } from "hono";
import type { IStatsService } from "@api/stats/types/stats.types";

export class StatsController {
  constructor(private readonly service: IStatsService) {}

  async getStats(c: Context) {
    return c.json(await this.service.getStats(), 200);
  }
}
