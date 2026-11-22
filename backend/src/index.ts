import { Hono } from "hono";
import { logger } from "hono/logger";
import { ENV } from "@lib/constants/env";
import { errorHandler } from "@middleware/error-handler";

import router from "./api/root";
import { PathNotFoundError } from "./lib/errors/app-errors";
import { startScheduler } from "./pipeline/scheduler";

const app = new Hono({
  strict: false, // wyłączenie strict mode, aby nie wymuszać trailing slash w URL
});

app.onError(errorHandler);

// Obsługa nieznanych tras
app.notFound((c) => c.json(new PathNotFoundError(`Nie ma trasy ${c.req.method} ${c.req.path}.`), 404));

// Logger requestów jest wyłączony dla /health, aby nie zaśmiecać logów, bo healthcheck jest odpytany co 10 sekund
const requestLogger = logger();
app.use((c, next) => (c.req.path === "/health" ? next() : requestLogger(c, next)));

app.route("/", router);

// Codzienny pipeline (scrape + analiza) startuje razem z serwerem, bez ręcznego uruchamiania skryptów.
// W procesie API, bo baza SQLite nie powinna być otwierana z dwóch kontenerów naraz.
if (ENV.RADAR_CRON_ENABLED) startScheduler();

export default {
  port: ENV.PORT,
  fetch: app.fetch,
};
