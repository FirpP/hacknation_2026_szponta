import type { z } from "zod";
import type { CountySchema } from "@api/counties/validators/counties.validator";

export type County = z.infer<typeof CountySchema>;

export interface ICountiesRepository {
  getVoivodeships(): Promise<string[]>;
  getByVoivodeship(voivodeship: string): Promise<County[]>;
}

export interface ICountiesService {
  getVoivodeships(): Promise<string[]>;
  getCounties(voivodeship: string): Promise<County[]>;
}
