import { z } from "zod";
import { voivodeshipData } from "../../../../prisma/data/voivodeship-data";

// meta.ref - schemat trafia do components.schemas w specu OpenAPI (i do typów frontu po bun run gen:api)

export const VoivodeshipSchema = z
  .enum(voivodeshipData)
  .meta({ ref: "Voivodeship", description: "Nazwa województwa małymi literami" });

export const CountySchema = z
  .object({
    id: z.int().positive(),
    name: z.string().min(1),
  })
  .meta({ ref: "County", description: "Powiat lub miasto na prawach powiatu" });

export const GetCountiesQuerySchema = z
  .object({ voivodeship: VoivodeshipSchema })
  .meta({ ref: "GetCountiesQuery", description: "Województwo, którego powiaty pobieramy" });
export type GetCountiesQuery = z.infer<typeof GetCountiesQuerySchema>;
