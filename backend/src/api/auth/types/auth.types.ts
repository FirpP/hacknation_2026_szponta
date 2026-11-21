import type { z } from "zod";
import type { EmployeeSchema } from "@api/auth/validators/auth.validator";

export type Employee = z.infer<typeof EmployeeSchema>;

export type EmployeeWithHash = Employee & { passwordHash: string };

export interface IAuthRepository {
  findByUsername(username: string): Promise<EmployeeWithHash | null>;
  findById(id: string): Promise<Employee | null>;
}

export interface IAuthService {
  login(username: string, password: string): Promise<string>;
  getEmployeeById(id: string): Promise<Employee>;
}
