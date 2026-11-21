import { ValidationError } from "@lib/errors/app-errors";
import type { IFormRepository, IFormService } from "@api/form/types/form.types";
import type { Step1Body } from "@api/form/validators/form.validator";

export class FormService implements IFormService {
  constructor(private readonly formRepo: IFormRepository) {}

  // Format danych sprawdził już zod, tu tylko reguły wymagające bazy
  async validateStep1(data: Step1Body): Promise<void> {
    if (!(await this.formRepo.countyExists(data.countyId))) {
      throw new ValidationError("Przesłane dane są niepoprawne.", [
        { field: "countyId", message: "Wybrany powiat nie istnieje." },
      ]);
    }
  }
}
