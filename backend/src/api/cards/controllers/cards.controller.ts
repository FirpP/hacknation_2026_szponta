import type { Context } from "hono";
import type { ICardsService } from "@api/cards/types/cards.types";
import type { CardsQuery } from "@api/cards/validators/cards.validator";

export class CardsController {
  constructor(private readonly service: ICardsService) {}

  async listCards(c: Context, query: CardsQuery) {
    return c.json(await this.service.listCards(query), 200);
  }

  async getCard(c: Context, id: number) {
    return c.json(await this.service.getCard(id), 200);
  }

  async getSimilarCards(c: Context, id: number) {
    return c.json(await this.service.getSimilarCards(id), 200);
  }
}
