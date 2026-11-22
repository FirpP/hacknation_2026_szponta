export type NodeEnv = "development" | "production" | "test";

export type ApplicationEnvironment = {
  NODE_ENV: NodeEnv;
  PORT: number;
  DATABASE_URL: string;
  PRISMA_LOG: boolean;
  SCRAPER_USER_AGENT: string;
  SCRAPE_OFFLINE: boolean;
  LLM_BASE_URL: string | undefined;
  LLM_API_KEY: string | undefined;
  LLM_MODEL: string | undefined;
  LLM_CONCURRENCY: number;
  LLM_MAX_INPUT_CHARS: number;
  LLM_MAX_OUTPUT_TOKENS: number;
  EPO_OPS_KEY: string | undefined;
  EPO_OPS_SECRET: string | undefined;
  PBN_APP_ID: string | undefined;
  PBN_APP_TOKEN: string | undefined;
  RADAR_CRON: string;
};
