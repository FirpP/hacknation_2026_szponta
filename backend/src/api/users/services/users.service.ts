import { NotFoundError } from "@lib/errors/app-errors";
import type { User, IUsersRepository, IUsersService } from "@api/users/types/users.types";
import type { CreateUserBody } from "@api/users/validators/users.validator";

export class UsersService implements IUsersService {
  constructor(private readonly userRepo: IUsersRepository) {}

  async getUsers(): Promise<User[]> {
    return this.userRepo.getAll();
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepo.getById(id);
    if (!user) {
      throw new NotFoundError(`Użytkownik o id: ${id} nie został znaleziony`);
    }
    return user;
  }

  async createUser(data: CreateUserBody): Promise<User> {
    return this.userRepo.create(data);
  }

  async deleteUser(id: string): Promise<void> {
    const deleted = await this.userRepo.deleteById(id);
    if (!deleted) {
      throw new NotFoundError(`Użytkownik o id: ${id} nie został znaleziony`);
    }
  }
}
