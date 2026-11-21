import type { Context } from "hono";
import type { User, IUsersService } from "@api/users/types/users.types";
import type { CreateUserBody, GetUserIdParams } from "@api/users/validators/users.validator";

export class UsersController {
  constructor(private readonly usersService: IUsersService) {}

  async getUsers(c: Context) {
    const users: User[] = await this.usersService.getUsers();
    return c.json(users, 200);
  }

  async getUserById(c: Context, { id: userId }: GetUserIdParams) {
    const user = await this.usersService.getUserById(userId);
    return c.json(user, 200);
  }

  async createUser(c: Context, body: CreateUserBody) {
    const user = await this.usersService.createUser(body);
    return c.json(user, 201);
  }

  async deleteUser(c: Context, { id: userId }: GetUserIdParams) {
    await this.usersService.deleteUser(userId);
    return c.body(null, 204);
  }
}
