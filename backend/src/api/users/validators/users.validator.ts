import { z } from "zod";

// meta.ref - schemat trafia do components.schemas w specu OpenAPI (i do typów frontu po bun run gen:api)

export const ValidUserId = z.uuid().meta({ ref: "ValidUserId", description: "UUID użytkownika" });

export const UserSchema = z
  .object({
    id: ValidUserId,
    name: z.string().min(1),
    email: z.email(),
  })
  .meta({ ref: "User", description: "Obiekt reprezentujący użytkownika" });

export const GetUserIdParamsSchema = z
  .object({
    id: ValidUserId,
  })
  .meta({ ref: "GetUserIdParams", description: "Parametry do pobrania użytkownika po ID" });
export type GetUserIdParams = z.infer<typeof GetUserIdParamsSchema>;

export const CreateUserBodySchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    email: z.email().max(254),
  })
  .meta({ ref: "CreateUserBody", description: "Dane nowego użytkownika" });
export type CreateUserBody = z.infer<typeof CreateUserBodySchema>;
