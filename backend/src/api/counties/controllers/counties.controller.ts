import type { Context } from "hono";
import type { ICountiesService } from "@api/counties/types/counties.types";
import type { GetCountiesQuery } from "@api/counties/validators/counties.validator";

export class CountiesController {
  constructor(private readonly countiesService: ICountiesService) {}

  async getVoivodeships(c: Context) {
    const voivodeships = await this.countiesService.getVoivodeships();
    return c.json(voivodeships, 200);
  }

  async getCounties(c: Context, { voivodeship }: GetCountiesQuery) {
    const counties = await this.countiesService.getCounties(voivodeship);
    return c.json(counties, 200);
  }
}
