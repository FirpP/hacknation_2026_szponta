import { describe, expect, it, mock } from "bun:test";
import type { Context } from "hono";
import { FormController } from "@api/form/controllers/form.controller";
import { ValidationError } from "@lib/errors/app-errors";
import type { IFormService } from "@api/form/types/form.types";
import type { Step1Body } from "@api/form/validators/form.validator";

const body: Step1Body = {
  institution: "Urząd Gminy",
  instType: "MUNICIPAL",
  countyId: 5,
  contactName: "Ewa Kot",
  contactEmail: "ewa@example.com",
  creators: [],
  isYouthInitiative: true,
};

const createContext = () =>
  ({
    body: mock((data: unknown, status: number) => ({ data, status })),
  }) as unknown as Context;

const createService = (overrides: Partial<IFormService> = {}): IFormService => ({
  validateStep1: mock(async (): Promise<void> => {}),
  ...overrides,
});

describe("FormController", () => {
  it("powinien odpowiedzieć statusem 204 dla poprawnego kroku 1", async () => {
    const service = createService();
    const c = createContext();

    await new FormController(service).submitStep1(c, body);

    expect(service.validateStep1).toHaveBeenCalledWith(body);
    expect(service.validateStep1).toHaveBeenCalledTimes(1);
    expect(c.body).toHaveBeenCalledWith(null, 204);
    expect(c.body).toHaveBeenCalledTimes(1);
  });

  it("powinien przepuścić ValidationError z serwisu i nie odpowiadać", async () => {
    const service = createService({
      validateStep1: mock(async (): Promise<void> => {
        throw new ValidationError("Przesłane dane są niepoprawne.", [{ field: "countyId", message: "Brak powiatu." }]);
      }),
    });
    const c = createContext();

    await expect(new FormController(service).submitStep1(c, body)).rejects.toBeInstanceOf(ValidationError);
    expect(c.body).not.toHaveBeenCalled();
  });
});
