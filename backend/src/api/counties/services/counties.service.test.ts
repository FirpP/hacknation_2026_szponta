import { describe, expect, it, mock } from "bun:test";
import { CountiesService } from "@api/counties/services/counties.service";
import type { County, ICountiesRepository } from "@api/counties/types/counties.types";

const counties: County[] = [
  { id: 1, name: "bieszczadzki" },
  { id: 2, name: "Krosno" },
];

const makeRepo = (overrides: Partial<ICountiesRepository> = {}): ICountiesRepository => ({
  getVoivodeships: mock(async (): Promise<string[]> => []),
  getByVoivodeship: mock(async (): Promise<County[]> => []),
  ...overrides,
});

describe("CountiesService", () => {
  it("powinien pobrać województwa z repozytorium", async () => {
    const repo = makeRepo({ getVoivodeships: mock(async () => ["lubelskie", "podkarpackie"]) });

    expect(await new CountiesService(repo).getVoivodeships()).toEqual(["lubelskie", "podkarpackie"]);
  });

  it("powinien pobrać powiaty wybranego województwa", async () => {
    const repo = makeRepo({ getByVoivodeship: mock(async () => counties) });

    const result = await new CountiesService(repo).getCounties("podkarpackie");

    expect(result).toEqual(counties);
    expect(repo.getByVoivodeship).toHaveBeenCalledWith("podkarpackie");
  });
});
