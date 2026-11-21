import { z } from "zod";

export const LoginBodySchema = z
  .object({
    username: z.string().trim().min(1).max(64),
    password: z.string().min(1).max(256),
  })
  .meta({ ref: "LoginBody", description: "Dane logowania pracownika" });
export type LoginBody = z.infer<typeof LoginBodySchema>;

export const EmployeeSchema = z
  .object({
    id: z.uuid(),
    username: z.string().min(1),
  })
  .meta({ ref: "Employee", description: "Zalogowany pracownik" });
