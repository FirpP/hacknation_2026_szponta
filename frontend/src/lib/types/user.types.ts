import type { components } from "@/lib/api-types";

// Typy generowane ze speca OpenAPI backendu (bun run gen:api), nie edytuj ręcznie api-types.ts
export type User = components["schemas"]["User"];
export type CreateUserBody = components["schemas"]["CreateUserBody"];
