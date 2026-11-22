import { Hono } from "hono";
import { CardsController } from "@api/cards/controllers/cards.controller";
import { getCardDocs, getStatsDocs, listCardsDocs, listRunsDocs } from "@api/cards/docs/cards.docs";
import { CardIdParamsSchema, CardsQuerySchema, RunsQuerySchema } from "@api/cards/validators/cards.validator";
import { validate } from "@middleware/validate";
import { cardsService } from "@api/cards/cards.container";

const controller = new CardsController(cardsService);

// /api/v1/cards (publiczne, tylko odczyt)
export const cardsRouter = new Hono();

cardsRouter.get("/", listCardsDocs, validate("query", CardsQuerySchema), (c) =>
  controller.listCards(c, c.req.valid("query")),
);
cardsRouter.get("/:id", getCardDocs, validate("param", CardIdParamsSchema), (c) =>
  controller.getCard(c, c.req.valid("param").id),
);

// /api/v1/runs
export const runsRouter = new Hono();

runsRouter.get("/", listRunsDocs, validate("query", RunsQuerySchema), (c) =>
  controller.listRuns(c, c.req.valid("query")),
);

// /api/v1/stats
export const statsRouter = new Hono();

statsRouter.get("/", getStatsDocs, (c) => controller.getStats(c));
