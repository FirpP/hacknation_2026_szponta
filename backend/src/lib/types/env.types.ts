export type NodeEnv = "development" | "production" | "test";

export type ApplicationEnvironment = {
  NODE_ENV: NodeEnv;
  PORT: number;
  DATABASE_URL: string;
  FRONTEND_URL: string;
  PRISMA_LOG: boolean;
  JWT_SECRET: string;
  JWT_EXPIRES_IN_SECONDS: number;
  COOKIE_SECURE: boolean;
};
