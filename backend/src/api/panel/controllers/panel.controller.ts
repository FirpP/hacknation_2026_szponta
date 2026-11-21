import type { Context } from "hono";
import type { IAuthService } from "@api/auth/types/auth.types";
import type { AuthVariables } from "@middleware/auth";
import { UnauthorizedError } from "@lib/errors/app-errors";
import { SESSION_COOKIE, sessionCookieOptions } from "@lib/constants/session";
import { deleteCookie } from "hono/cookie";

export class PanelController {
  constructor(private readonly authService: IAuthService) {}

  async getPanelData(c: Context<{ Variables: AuthVariables }>) {
    const employeeId = c.get("employeeId");

    // Łapiemy osobno błąd UnauthorizedError, bo może się zdarzyć, że token jest ważny ale konto już nie istnieje
    try {
      const employee = await this.authService.getEmployeeById(employeeId);
      return c.json(employee, 200);
    } catch (error: unknown) {
      if (error instanceof UnauthorizedError) {
        deleteCookie(c, SESSION_COOKIE, sessionCookieOptions());
      }
      // Rzucamy dalej błąd do error handlera
      throw error;
    }
  }
}
