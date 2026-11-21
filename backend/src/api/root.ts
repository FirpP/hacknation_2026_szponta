import { Hono } from "hono";
import apiRouter from "./api";

const router = new Hono();

router.get("/health", (c) => c.json({ status: "OK" }));
router.route("/api/v1", apiRouter);

export default router;
