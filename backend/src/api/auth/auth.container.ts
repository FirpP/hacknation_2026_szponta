import { ENV } from "@lib/constants/env";
import { AuthRepository } from "@api/auth/repositories/auth.repository";
import { AuthService } from "@api/auth/services/auth.service";

// Composition root modułu auth:
// Wspólna instacja AuthService dla całego projektu.
// Testy tworzą własną instację AuthService z mockiem i nie importują tego pliku.
const authRepository = new AuthRepository();

export const authService = new AuthService(authRepository, {
  jwtSecret: ENV.JWT_SECRET,
  expiresInSeconds: ENV.JWT_EXPIRES_IN_SECONDS,
});
