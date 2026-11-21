/**
 * Prisma Studio dostępne z hosta, uruchamiane W KONTENERZE (bun run dev:prisma:studio -> http://localhost:5555).
 *
 * Dlaczego tak:
 * - bazy dev nie otwieramy z hosta (VS Code, DBeaver...), bo przy Docker Desktop host i kontener nie dzielą
 *   pamięci współdzielonej SQLite (WAL) ani blokad plików -> podgląd pokazuje stare dane, a może nawet cofnąć zapisy;
 * - Studio nasłuchuje tylko na 127.0.0.1 (bez opcji zmiany), więc przekierowanie portu Dockera do niego nie dociera.
 *   Ten skrypt uruchamia Studio na porcie wewnętrznym i wystawia je przez proxy HTTP na 0.0.0.0.
 */
import path from "node:path";

const PUBLIC_PORT = 5555;
const INTERNAL_PORT = 5556;

// Studio akceptuje SQLite tylko jako file:///ścieżka/absolutna (file:./x.db odrzuca)
const databaseUrl = process.env.DATABASE_URL ?? "";
if (!databaseUrl.startsWith("file:")) {
  console.error(`DATABASE_URL musi wskazywać plik SQLite (file:...), jest: "${databaseUrl}"`);
  process.exit(1);
}
const dbPath = path.resolve(process.cwd(), databaseUrl.replace(/^file:(\/\/)?/, ""));
const studioUrl = `file://${dbPath}`;

const proxy = (fetchHandler: (req: Request) => Promise<Response>) => {
  try {
    return Bun.serve({ hostname: "0.0.0.0", port: PUBLIC_PORT, fetch: fetchHandler });
  } catch {
    // Port zajęty = Studio z poprzedniego uruchomienia nadal działa (np. zamknięty terminal bez Ctrl+C)
    console.log(`Prisma Studio już działa: http://localhost:${PUBLIC_PORT}`);
    console.log("Żeby je zatrzymać: docker compose --profile dev restart backend-dev");
    process.exit(0);
  }
};

proxy(async (req) => {
  const url = new URL(req.url);
  url.protocol = "http:";
  url.hostname = "127.0.0.1";
  url.port = String(INTERNAL_PORT);

  // Studio odrzuca (403) żądania z Origin innym niż http://localhost:<jego port>, a przeglądarka
  // wysyła Origin portu publicznego (np. przy ładowaniu studio.js jako modułu i przy POST /bff)
  const headers = new Headers(req.headers);
  if (headers.has("origin")) headers.set("origin", `http://localhost:${INTERNAL_PORT}`);
  headers.set("host", `localhost:${INTERNAL_PORT}`);

  try {
    return await fetch(url, {
      method: req.method,
      headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer(),
      redirect: "manual",
    });
  } catch {
    return new Response("Prisma Studio jeszcze startuje - odśwież stronę za chwilę.", { status: 503 });
  }
});

// Studio startujemy dopiero, gdy proxy zajęło port (inaczej zostawałyby osierocone instancje)
const studio = Bun.spawn(
  ["bunx", "--bun", "prisma", "studio", "--port", String(INTERNAL_PORT), "--browser", "none", "--url", studioUrl],
  { stdout: "ignore", stderr: "inherit" },
);

console.log(`Prisma Studio (${dbPath}): http://localhost:${PUBLIC_PORT}  (Ctrl+C kończy)`);

const shutdown = () => {
  studio.kill();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Gdy Studio padnie, kończymy też proxy
process.exit(await studio.exited);
