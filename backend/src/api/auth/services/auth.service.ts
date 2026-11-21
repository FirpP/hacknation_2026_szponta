import { sign } from "hono/jwt";
import { UnauthorizedError } from "@lib/errors/app-errors";
import type { Employee, IAuthRepository, IAuthService } from "@api/auth/types/auth.types";

export type AuthServiceConfig = {
  jwtSecret: string;
  expiresInSeconds: number;
};

export class AuthService implements IAuthService {
  // Hash do porównania gdy login nie istnieje.
  // Służy do wyrówniania czasu odpowiedzi i utrudnienia ataków typu timing attack.
  private dummyHash: Promise<string> | null = null;

  constructor(
    private readonly authRepo: IAuthRepository,
    private readonly config: AuthServiceConfig,
  ) {}

  async login(username: string, password: string): Promise<string> {
    const found = await this.authRepo.findByUsername(username);

    if (!found) {
      this.dummyHash ??= Bun.password.hash("dummy-password");
      await Bun.password.verify(password, await this.dummyHash);
      throw new UnauthorizedError("Niepoprawny login lub hasło.");
    }

    const valid = await Bun.password.verify(password, found.passwordHash);
    if (!valid) {
      throw new UnauthorizedError("Niepoprawny login lub hasło.");
    }

    // Dzieli przez 1000, bo Date.now() zwraca milisekundy, a JWT używa sekund
    const now = Math.floor(Date.now() / 1000);
    const token = await sign(
      { sub: found.id, iat: now, exp: now + this.config.expiresInSeconds },
      this.config.jwtSecret,
      "HS256",
    );

    return token;
  }

  async getEmployeeById(id: string): Promise<Employee> {
    const employee = await this.authRepo.findById(id);
    if (!employee) {
      // Token ważny, ale konto już nie istnieje
      throw new UnauthorizedError("Sesja wygasła lub konto nie istnieje.");
    }
    return employee;
  }
}
