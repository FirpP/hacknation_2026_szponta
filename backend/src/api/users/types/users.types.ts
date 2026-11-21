import type { z } from "zod";
import type { CreateUserBody, UserSchema } from "@api/users/validators/users.validator";

// Jedno źródło prawdy: typ wynika ze schematu zod, który opisuje też odpowiedź w specu OpenAPI
export type User = z.infer<typeof UserSchema>;

export interface IUsersRepository {
  getAll(): Promise<User[]>;
  getById(id: string): Promise<User | null>;
  create(data: CreateUserBody): Promise<User>;
  // true gdy usunięto, false gdy rekordu nie było
  deleteById(id: string): Promise<boolean>;
}

export interface IUsersService {
  getUsers(): Promise<User[]>;
  getUserById(id: string): Promise<User>;
  createUser(data: CreateUserBody): Promise<User>;
  deleteUser(id: string): Promise<void>;
}
