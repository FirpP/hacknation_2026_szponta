import { Hono } from "hono";
import { FormRepository } from "@api/form/repositories/form.repository";
import { FormService } from "@api/form/services/form.service";
import { FormController } from "@api/form/controllers/form.controller";
import { submitStep1Docs } from "@api/form/docs/form.docs";
import { Step1BodySchema } from "@api/form/validators/form.validator";
import { validate } from "@middleware/validate";
import { rateLimit } from "@middleware/rate-limit";

// /api/v1/form
const router = new Hono();

const formController = new FormController(new FormService(new FormRepository()));

// Publiczne endpointy walidacji kroków, 60 żądań na minutę z jednego IP
const stepRateLimit = rateLimit({ max: 60, windowMs: 60_000 });

// Każdy krok ma własną trasę /submit/<numer>, dzięki temu w Swaggerze ma osobny opis body
router.post("/submit/1", submitStep1Docs, stepRateLimit, validate("json", Step1BodySchema), (c) =>
  formController.submitStep1(c, c.req.valid("json")),
);

export default router;
