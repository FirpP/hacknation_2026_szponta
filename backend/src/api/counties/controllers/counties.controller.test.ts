import { describe, expect, it, mock } from "bun:test";
import type { Context } from "hono";
import { CountiesController } from "@api/counties/controllers/counties.controller";
import type { County, ICountiesService } from "@api/counties/types/counties.types";

const counties: County[] = [{ id: 1, name: "bieszczadzki" }];

const createContext = () =>
  ({
    json: mock((data: unknown, status: number) => ({ data, status })),
  }) as unknown as Context;

const createService = (overrides: Partial<ICountiesService> = {}): ICountiesService => ({
  getVoivodeships: mock(async (): Promise<string[]> => ["podkarpackie"]),
  getCounties: mock(async (): Promise<County[]> => counties),
  ...overrides,
});

describe("CountiesController", () => {
  it("powinien odpowiedzieć statusem 200 i listą województw", async () => {
    const c = createContext();

    await new CountiesController(createService()).getVoivodeships(c);

    expect(c.json).toHaveBeenCalledWith(["podkarpackie"], 200);
  });

  it("powinien odpowiedzieć statusem 200 i powiatami wybranego województwa", async () => {
    const service = createService();
    const c = createContext();

    await new CountiesController(service).getCounties(c, { voivodeship: "podkarpackie" });

    expect(service.getCounties).toHaveBeenCalledWith("podkarpackie");
    expect(c.json).toHaveBeenCalledWith(counties, 200);
  });
});
