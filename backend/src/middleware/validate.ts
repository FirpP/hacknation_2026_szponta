import type { ValidationTargets } from "hono";
import type { ZodType } from "zod";
import { validator } from "hono-openapi";
import { ValidationError } from "@lib/errors/app-errors";

/**
 * Middleware do walidacji danych wejściowych w trasach Hono z użyciem Zod
 * i automatycznym generowaniem specyfikacji OpenAPI.
 * Błąd walidacji trafia do errorHandler jako ValidationError (422).
 *
 * @example
 * router.get("/:id", getUserByIdDocs, validate("param", GetUserIdParamsSchema), (c) =>
 *   userController.getUserById(c, c.req.valid("param")),
 * );
 *
 * @param target - Źródło danych do walidacji (`param`, `query`, `json`, `form`, `header`, `cookie`)
 * @param schema - Schemat Zod
 */
export const validate = <Target extends keyof ValidationTargets, Schema extends ZodType>(
  target: Target,
  schema: Schema,
) =>
  validator(target, schema, (result) => {
    if (!result.success) {
      throw ValidationError.fromIssues(result.error);
    }
  });
