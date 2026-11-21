import type { Context } from "hono";
import type { IFormService } from "@api/form/types/form.types";
import type { Step1Body } from "@api/form/validators/form.validator";

export class FormController {
  constructor(private readonly formService: IFormService) {}

  async submitStep1(c: Context, body: Step1Body) {
    await this.formService.validateStep1(body);
    return c.body(null, 204);
  }
}
