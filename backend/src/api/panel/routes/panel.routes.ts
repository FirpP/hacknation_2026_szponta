import { Hono } from "hono";
import { getPanelDocs } from "@api/panel/docs/panel.docs";
import { requireAuth, type AuthVariables } from "@middleware/auth";
import { PanelController } from "@api/panel/controllers/panel.controller";
import { authService } from "@api/auth/auth.container";

const panelController = new PanelController(authService);

// /api/v1/panel
const router = new Hono<{ Variables: AuthVariables }>();

router.use(requireAuth);

router.get("/", getPanelDocs, (c) => panelController.getPanelData(c));

export default router;
