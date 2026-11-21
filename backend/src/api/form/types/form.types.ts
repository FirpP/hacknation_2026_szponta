import type { Step1Body } from "@api/form/validators/form.validator";

export interface IFormRepository {
  countyExists(id: number): Promise<boolean>;
}

export interface IFormService {
  // Rzuca ValidationError, gdy dane kroku są niepoprawne
  validateStep1(data: Step1Body): Promise<void>;
}
