import type { Context } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { SESSION_COOKIE, sessionCookieOptions } from "@lib/constants/session";
import { ENV } from "@lib/constants/env";
import type { IAuthService } from "@api/auth/types/auth.types";
import type { LoginBody } from "@api/auth/validators/auth.validator";

export class AuthController {
  constructor(private readonly authService: IAuthService) {}

  async login(c: Context, { username, password }: LoginBody) {
    const token: string = await this.authService.login(username, password);
    setCookie(c, SESSION_COOKIE, token, {
      ...sessionCookieOptions(),
      maxAge: ENV.JWT_EXPIRES_IN_SECONDS,
    });

    return c.body(null, 204);
  }

  logout(c: Context) {
    deleteCookie(c, SESSION_COOKIE, sessionCookieOptions());
    return c.body(null, 204);
  }
}
