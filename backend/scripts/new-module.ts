/**
 * Generator modułu API (routes, controller, service + test, repository, validator, docs, types).
 * Dopisuje router do src/api/api.ts i model do prisma/schema.prisma (id, name, createdAt).
 *
 * Użycie (z katalogu głównego):  bun run new:module <nazwa-w-liczbie-mnogiej> [--model NazwaModelu]
 * Przykłady:                     bun run new:module products
 *                                bun run new:module order-items
 *                                bun run new:module people --model Person
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dir, "..");

const fail = (message: string): never => {
  console.error(`✖ ${message}`);
  process.exit(1);
};

// ---------- argumenty i nazwy ----------
const args = process.argv.slice(2);
const name = args.find((a) => !a.startsWith("--")) ?? fail("Podaj nazwę modułu, np. bun run new:module products");
if (!/^[a-z][a-z0-9-]*$/.test(name)) fail("Nazwa modułu: małe litery, cyfry i myślniki (kebab-case), np. order-items");

const modelFlag = args.indexOf("--model");
const pascal = (s: string) => s.replace(/(^|-)([a-z0-9])/g, (_, __, ch: string) => ch.toUpperCase());
const singularize = (s: string) => (s.endsWith("ies") ? s.slice(0, -3) + "y" : s.endsWith("s") ? s.slice(0, -1) : s);

const Model =
  modelFlag >= 0
    ? (args[modelFlag + 1] ?? fail("Po --model podaj nazwę, np. --model Person"))
    : pascal(singularize(name));
if (!/^[A-Z][A-Za-z0-9]*$/.test(Model)) fail(`Nazwa modelu "${Model}" musi być w PascalCase`);

const model = Model[0]!.toLowerCase() + Model.slice(1); // accessor Prismy: prisma.orderItem
const Plural = pascal(name); // OrderItems
const plural = Plural[0]!.toLowerCase() + Plural.slice(1); // orderItems

const moduleDir = path.join(ROOT, "src/api", name);
if (existsSync(moduleDir)) fail(`Moduł src/api/${name} już istnieje`);

// ---------- szablony ----------
const files: Record<string, string> = {
  [`validators/${name}.validator.ts`]: `import { z } from "zod";

// meta.ref - schemat trafia do components.schemas w specu OpenAPI (i do typów frontu po bun run gen:api)

export const ${Model}Id = z.uuid().meta({ ref: "${Model}Id", description: "UUID (${Model})" });

export const ${Model}Schema = z
  .object({
    id: ${Model}Id,
    name: z.string().min(1),
  })
  .meta({ ref: "${Model}", description: "${Model}" });

export const ${Model}IdParamsSchema = z.object({ id: ${Model}Id }).meta({ ref: "${Model}IdParams" });
export type ${Model}IdParams = z.infer<typeof ${Model}IdParamsSchema>;

export const Create${Model}BodySchema = z
  .object({
    name: z.string().trim().min(1).max(200),
  })
  .meta({ ref: "Create${Model}Body", description: "Dane nowego rekordu ${Model}" });
export type Create${Model}Body = z.infer<typeof Create${Model}BodySchema>;
`,

  [`types/${name}.types.ts`]: `import type { z } from "zod";
import type { Create${Model}Body, ${Model}Schema } from "@api/${name}/validators/${name}.validator";

export type ${Model} = z.infer<typeof ${Model}Schema>;

export interface I${Plural}Repository {
  getAll(): Promise<${Model}[]>;
  getById(id: string): Promise<${Model} | null>;
  create(data: Create${Model}Body): Promise<${Model}>;
  deleteById(id: string): Promise<boolean>;
}

export interface I${Plural}Service {
  getAll(): Promise<${Model}[]>;
  getById(id: string): Promise<${Model}>;
  create(data: Create${Model}Body): Promise<${Model}>;
  delete(id: string): Promise<void>;
}
`,

  [`repositories/${name}.repository.ts`]: `import prisma from "@/prisma-client";
import type { I${Plural}Repository, ${Model} } from "@api/${name}/types/${name}.types";
import type { Create${Model}Body } from "@api/${name}/validators/${name}.validator";

const select = { id: true, name: true } as const;

export class ${Plural}Repository implements I${Plural}Repository {
  async getAll(): Promise<${Model}[]> {
    return prisma.${model}.findMany({ select, orderBy: { createdAt: "asc" } });
  }

  async getById(id: string): Promise<${Model} | null> {
    return prisma.${model}.findUnique({ where: { id }, select });
  }

  // Duplikat pola @unique rzuca Prisma P2002 -> errorHandler zwraca 409
  async create(data: Create${Model}Body): Promise<${Model}> {
    return prisma.${model}.create({ data, select });
  }

  async deleteById(id: string): Promise<boolean> {
    const { count } = await prisma.${model}.deleteMany({ where: { id } });
    return count > 0;
  }
}
`,

  [`services/${name}.service.ts`]: `import { NotFoundError } from "@lib/errors/app-errors";
import type { I${Plural}Repository, I${Plural}Service, ${Model} } from "@api/${name}/types/${name}.types";
import type { Create${Model}Body } from "@api/${name}/validators/${name}.validator";

export class ${Plural}Service implements I${Plural}Service {
  constructor(private readonly repo: I${Plural}Repository) {}

  async getAll(): Promise<${Model}[]> {
    return this.repo.getAll();
  }

  async getById(id: string): Promise<${Model}> {
    const found = await this.repo.getById(id);
    if (!found) throw new NotFoundError("Nie znaleziono rekordu ${Model} o id: " + id);
    return found;
  }

  async create(data: Create${Model}Body): Promise<${Model}> {
    return this.repo.create(data);
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.repo.deleteById(id);
    if (!deleted) throw new NotFoundError("Nie znaleziono rekordu ${Model} o id: " + id);
  }
}
`,

  [`services/${name}.service.test.ts`]: `import { describe, expect, it, mock } from "bun:test";
import { ${Plural}Service } from "@api/${name}/services/${name}.service";
import { NotFoundError } from "@lib/errors/app-errors";
import type { I${Plural}Repository, ${Model} } from "@api/${name}/types/${name}.types";

const item: ${Model} = { id: "1", name: "Przykład" };

const makeRepo = (overrides: Partial<I${Plural}Repository> = {}): I${Plural}Repository => ({
  getAll: mock(async (): Promise<${Model}[]> => [item]),
  getById: mock(async (): Promise<${Model} | null> => item),
  create: mock(async (data): Promise<${Model}> => ({ id: "new", ...data })),
  deleteById: mock(async (): Promise<boolean> => true),
  ...overrides,
});

describe("${Plural}Service", () => {
  it("zwraca listę z repozytorium", async () => {
    expect(await new ${Plural}Service(makeRepo()).getAll()).toEqual([item]);
  });

  it("rzuca NotFoundError gdy rekord nie istnieje", async () => {
    const service = new ${Plural}Service(makeRepo({ getById: mock(async () => null) }));
    await expect(service.getById("1")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("tworzy rekord", async () => {
    const result = await new ${Plural}Service(makeRepo()).create({ name: "Nowy" });
    expect(result).toEqual({ id: "new", name: "Nowy" });
  });

  it("rzuca NotFoundError przy usuwaniu nieistniejącego rekordu", async () => {
    const service = new ${Plural}Service(makeRepo({ deleteById: mock(async () => false) }));
    await expect(service.delete("1")).rejects.toBeInstanceOf(NotFoundError);
  });
});
`,

  [`controllers/${name}.controller.ts`]: `import type { Context } from "hono";
import type { I${Plural}Service } from "@api/${name}/types/${name}.types";
import type { Create${Model}Body, ${Model}IdParams } from "@api/${name}/validators/${name}.validator";

export class ${Plural}Controller {
  constructor(private readonly service: I${Plural}Service) {}

  async getAll(c: Context) {
    return c.json(await this.service.getAll(), 200);
  }

  async getById(c: Context, { id }: ${Model}IdParams) {
    return c.json(await this.service.getById(id), 200);
  }

  async create(c: Context, body: Create${Model}Body) {
    return c.json(await this.service.create(body), 201);
  }

  async delete(c: Context, { id }: ${Model}IdParams) {
    await this.service.delete(id);
    return c.body(null, 204);
  }
}
`,

  [`docs/${name}.docs.ts`]: `import { z } from "zod";
import { describeRoute, resolver } from "hono-openapi";
import { ${Model}Schema } from "@api/${name}/validators/${name}.validator";
import { ErrorResponseSchema } from "@lib/errors/error-response.schema";

const error = (description: string) => ({
  description,
  content: { "application/json": { schema: resolver(ErrorResponseSchema) } },
});
const ok = (description: string, schema: z.ZodType) => ({
  description,
  content: { "application/json": { schema: resolver(schema) } },
});

export const getAll${Plural}Docs = describeRoute({
  tags: ["${Plural}"],
  summary: "Lista ${Model}",
  responses: { 200: ok("Lista", z.array(${Model}Schema)), 500: error("Nieoczekiwany błąd serwera") },
});

export const get${Model}ByIdDocs = describeRoute({
  tags: ["${Plural}"],
  summary: "${Model} po ID",
  responses: {
    200: ok("Szczegóły", ${Model}Schema),
    404: error("Nie znaleziono"),
    422: error("Niepoprawne ID"),
  },
});

export const create${Model}Docs = describeRoute({
  tags: ["${Plural}"],
  summary: "Dodaj ${Model} (wymaga zalogowania)",
  security: [{ cookieAuth: [] }],
  responses: {
    201: ok("Utworzony rekord", ${Model}Schema),
    401: error("Brak lub niepoprawna sesja"),
    409: error("Konflikt (np. duplikat)"),
    422: error("Niepoprawne dane wejściowe"),
  },
});

export const delete${Model}Docs = describeRoute({
  tags: ["${Plural}"],
  summary: "Usuń ${Model} (wymaga zalogowania)",
  security: [{ cookieAuth: [] }],
  responses: {
    204: { description: "Usunięto" },
    401: error("Brak lub niepoprawna sesja"),
    404: error("Nie znaleziono"),
    422: error("Niepoprawne ID"),
  },
});
`,

  [`routes/${name}.routes.ts`]: `import { Hono } from "hono";
import { ${Plural}Repository } from "@api/${name}/repositories/${name}.repository";
import { ${Plural}Service } from "@api/${name}/services/${name}.service";
import { ${Plural}Controller } from "@api/${name}/controllers/${name}.controller";
import {
  getAll${Plural}Docs,
  get${Model}ByIdDocs,
  create${Model}Docs,
  delete${Model}Docs,
} from "@api/${name}/docs/${name}.docs";
import { Create${Model}BodySchema, ${Model}IdParamsSchema } from "@api/${name}/validators/${name}.validator";
import { validate } from "@middleware/validate";
import { requireAuth } from "@middleware/auth";

// /api/v1/${name}
const router = new Hono();

const controller = new ${Plural}Controller(new ${Plural}Service(new ${Plural}Repository()));

router.get("/", getAll${Plural}Docs, (c) => controller.getAll(c));
router.get("/:id", get${Model}ByIdDocs, validate("param", ${Model}IdParamsSchema), (c) =>
  controller.getById(c, c.req.valid("param")),
);
router.post("/", create${Model}Docs, requireAuth, validate("json", Create${Model}BodySchema), (c) =>
  controller.create(c, c.req.valid("json")),
);
router.delete("/:id", delete${Model}Docs, requireAuth, validate("param", ${Model}IdParamsSchema), (c) =>
  controller.delete(c, c.req.valid("param")),
);

export default router;
`,
};

// ---------- zapis plików modułu ----------
for (const [rel, content] of Object.entries(files)) {
  const file = path.join(moduleDir, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
  console.log(`+ src/api/${name}/${rel}`);
}

// ---------- rejestracja routera w src/api/api.ts ----------
const apiFile = path.join(ROOT, "src/api/api.ts");
const apiLines = readFileSync(apiFile, "utf8").split("\n");
const lastIndex = (re: RegExp) => apiLines.findLastIndex((line) => re.test(line));

const importIdx = lastIndex(/^import \w+Router from "@api\//);
const routeIdx = lastIndex(/^router\.route\(/);
if (importIdx < 0 || routeIdx < 0)
  fail("Nie znalazłem miejsca na rejestrację w src/api/api.ts - dopisz router ręcznie");

// Najpierw późniejsza linia, żeby nie przesunąć indeksu wcześniejszej
apiLines.splice(routeIdx + 1, 0, `router.route("/${name}", ${plural}Router);`);
apiLines.splice(importIdx + 1, 0, `import ${plural}Router from "@api/${name}/routes/${name}.routes";`);
writeFileSync(apiFile, apiLines.join("\n"));
console.log(`~ src/api/api.ts (router.route("/${name}", ...))`);

// ---------- model Prismy ----------
const schemaFile = path.join(ROOT, "prisma/schema.prisma");
const schema = readFileSync(schemaFile, "utf8");
if (new RegExp(`^model ${Model}\\s*\\{`, "m").test(schema)) {
  console.log(`= prisma/schema.prisma: model ${Model} już istnieje, nie zmieniam`);
} else {
  const block = `
model ${Model} {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())
}
`;
  writeFileSync(schemaFile, schema.trimEnd() + "\n" + block);
  console.log(`~ prisma/schema.prisma (model ${Model})`);
}

// Formatowanie wygenerowanych plików (długość nazw zmienia łamanie linii)
Bun.spawnSync(["bunx", "prettier", "--log-level", "warn", "--write", moduleDir, apiFile], {
  cwd: ROOT,
  stdout: "inherit",
  stderr: "inherit",
});

console.log(`
Gotowe. Dalej (przy działającym bun run docker:dev):
  1. Dostosuj pola modelu ${Model} w prisma/schema.prisma i schematy w validators/${name}.validator.ts
  2. bun run dev:prisma:migrate     # migracja + klient Prisma (do tego czasu typecheck zgłosi brak prisma.${model})
  3. bun run gen:api                # typy dla frontu
Endpointy: GET/POST /api/v1/${name}, GET/DELETE /api/v1/${name}/:id (POST i DELETE wymagają zalogowania)`);
