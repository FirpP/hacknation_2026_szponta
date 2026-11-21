import { describe, expect, it, mock } from "bun:test";
import { FormService } from "@api/form/services/form.service";
import { ValidationError } from "@lib/errors/app-errors";
import type { IFormRepository } from "@api/form/types/form.types";
import type { Step1Body } from "@api/form/validators/form.validator";

const step1: Step1Body = {
  institution: "Zespół Szkół Mechanicznych",
  instType: "SCHOOL",
  countyId: 1,
  contactName: "Jan Kowalski",
  contactEmail: "jan@example.com",
  creators: [{ name: "Anna Nowak", role: "nauczycielka" }],
  isYouthInitiative: false,
};

const makeRepo = (overrides: Partial<IFormRepository> = {}): IFormRepository => ({
  countyExists: mock(async (): Promise<boolean> => true),
  ...overrides,
});

describe("FormService", () => {
  it("powinien zaakceptować krok 1 z istniejącym powiatem", async () => {
    const repo = makeRepo();

    await expect(new FormService(repo).validateStep1(step1)).resolves.toBeUndefined();
    expect(repo.countyExists).toHaveBeenCalledWith(1);
  });

  it("powinien rzucić ValidationError z polem countyId gdy powiat nie istnieje", async () => {
    const repo = makeRepo({ countyExists: mock(async () => false) });

    const error = await new FormService(repo).validateStep1(step1).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).details).toEqual([
      { field: "countyId", message: "Wybrany powiat nie istnieje." },
    ]);
  });
});
