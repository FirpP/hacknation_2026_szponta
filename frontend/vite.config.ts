import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  // Vite nie wrzuca plików .env do process.env wewnątrz configu, więc ładujemy je ręcznie
  const env = loadEnv(mode, __dirname, "");

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: "0.0.0.0",
      port: 8080,
      // Polling zapewnia hot reload w Dockerze także tam, gdzie zdarzenia plików nie przechodzą przez bind mount
      // (np. repo na dysku Windows poza WSL). Kosztuje CPU - na Linuksie/macOS można wyłączyć: VITE_USE_POLLING=false
      watch: {
        usePolling: env.VITE_USE_POLLING !== "false",
        interval: 300,
      },
      hmr: {
        clientPort: 8080,
      },
      // Wszystko co zaczyna się od /api leci do backendu
      proxy: {
        "/api": {
          target: env.VITE_PROXY_TARGET || "http://localhost:3000",
          changeOrigin: true,
          ws: true, // WebSockety pod /api też idą przez proxy
          configure: (proxy) => {
            proxy.on("error", (err, req) => {
              console.warn("[Vite proxy] API request failed:", req.url, err.message);
            });
          },
        },
      },
    },
  };
});
