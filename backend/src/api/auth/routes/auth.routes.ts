import { Hono } from "hono";
import { AuthController } from "@api/auth/controllers/auth.controller";
import { loginDocs, logoutDocs } from "@api/auth/docs/auth.docs";
import { LoginBodySchema } from "@api/auth/validators/auth.validator";
import { validate } from "@middleware/validate";
import { rateLimit } from "@middleware/rate-limit";
import { authService } from "@api/auth/auth.container";

// /api/v1/auth
const router = new Hono();

const authController = new AuthController(authService);

// 5 prób logowania na minutę z jednego IP
const loginRateLimit = rateLimit({ max: 5, windowMs: 60_000 });

router.post("/login", loginDocs, loginRateLimit, validate("json", LoginBodySchema), (c) =>
  authController.login(c, c.req.valid("json")),
);
router.post("/logout", logoutDocs, (c) => authController.logout(c));

export default router;
