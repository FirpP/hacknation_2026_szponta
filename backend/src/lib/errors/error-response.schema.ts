import { z } from "zod";

// Kształt odpowiedzi błędu zwracanej przez middleware/error-handler.ts - na potrzeby specu OpenAPI
export const ErrorResponseSchema = z
  .object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.array(z.object({ field: z.string(), message: z.string() })).optional(),
    }),
  })
  .meta({ ref: "ErrorResponse" });
