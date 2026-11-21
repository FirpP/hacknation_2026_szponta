import { cors } from "hono/cors";
import { ENV } from "@lib/constants/env";

// CORS ma znaczenie tylko, gdy frontend działa pod innym originem niż API (np. Vite bez proxy).
// W dev (proxy Vite) i na prod (nginx) front i /api są pod tym samym originem.
// Sesja idzie w cookie, więc nie ma nagłówka Authorization.
export const corsMiddleware = cors({
  origin: ENV.FRONTEND_URL,
  credentials: true,
  allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowHeaders: ["Content-Type"],
});
