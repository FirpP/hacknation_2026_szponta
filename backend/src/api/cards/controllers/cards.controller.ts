import type { Context } from "hono";
import type { ICardsService } from "@api/cards/types/cards.types";
import type { CardsQuery, RunsQuery } from "@api/cards/validators/cards.validator";

export class CardsController {
  constructor(private readonly service: ICardsService) {}

  async listCards(c: Context, query: CardsQuery) {
    return c.json(await this.service.listCards(query), 200);
  }

  async getCard(c: Context, id: number) {
    return c.json(await this.service.getCard(id), 200);
  }

  async listRuns(c: Context, query: RunsQuery) {
    return c.json(await this.service.listRuns(query), 200);
  }

  async getStats(c: Context) {
    return c.json(await this.service.getStats(), 200);
  }
}
