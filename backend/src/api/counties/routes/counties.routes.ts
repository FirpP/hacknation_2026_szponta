import { Hono } from "hono";
import { CountiesRepository } from "@api/counties/repositories/counties.repository";
import { CountiesService } from "@api/counties/services/counties.service";
import { CountiesController } from "@api/counties/controllers/counties.controller";
import { getCountiesDocs, getVoivodeshipsDocs } from "@api/counties/docs/counties.docs";
import { GetCountiesQuerySchema } from "@api/counties/validators/counties.validator";
import { validate } from "@middleware/validate";

// /api/v1/counties
const router = new Hono();

const countiesController = new CountiesController(new CountiesService(new CountiesRepository()));

// Publiczne słowniki do kaskadowego wyboru: województwo, potem powiat
router.get("/voivodeships", getVoivodeshipsDocs, (c) => countiesController.getVoivodeships(c));
router.get("/", getCountiesDocs, validate("query", GetCountiesQuerySchema), (c) =>
  countiesController.getCounties(c, c.req.valid("query")),
);

export default router;
