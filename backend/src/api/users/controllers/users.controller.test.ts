import { describe, expect, it, mock } from "bun:test";
import type { Context } from "hono";
import { UsersController } from "@api/users/controllers/users.controller";
import type { IUsersService, User } from "@api/users/types/users.types";
import { NotFoundError } from "@lib/errors/app-errors";

const USER_ID = "7d9e1a4c-2b3f-4c5d-8e6a-1f0b9c8d7e6f";
const user: User = { id: USER_ID, name: "Jan", email: "jan@example.com" };

const createContext = () =>
  ({
    json: mock((data: unknown, status: number) => ({ data, status })),
    body: mock((data: unknown, status: number) => ({ data, status })),
  }) as unknown as Context;

const createService = (overrides: Partial<IUsersService> = {}): IUsersService => ({
  getUsers: mock(async (): Promise<User[]> => [user]),
  getUserById: mock(async (): Promise<User> => user),
  createUser: mock(async (): Promise<User> => user),
  deleteUser: mock(async (): Promise<void> => {}),
  ...overrides,
});

describe("UsersController", () => {
  it("powinien odpowiedzieć statusem 200 i listą użytkowników", async () => {
    const service = createService();
    const c = createContext();

    await new UsersController(service).getUsers(c);

    expect(service.getUsers).toHaveBeenCalledTimes(1);
    expect(c.json).toHaveBeenCalledWith([user], 200);
  });

  it("powinien odpowiedzieć statusem 200 i użytkownikiem o podanym id", async () => {
    const service = createService();
    const c = createContext();

    await new UsersController(service).getUserById(c, { id: USER_ID });

    expect(service.getUserById).toHaveBeenCalledWith(USER_ID);
    expect(c.json).toHaveBeenCalledWith(user, 200);
  });

  it("powinien przepuścić NotFoundError z serwisu i nie odpowiadać", async () => {
    const service = createService({
      getUserById: mock(async (): Promise<User> => {
        throw new NotFoundError("Nie znaleziono użytkownika.");
      }),
    });
    const c = createContext();

    await expect(new UsersController(service).getUserById(c, { id: USER_ID })).rejects.toBeInstanceOf(NotFoundError);
    expect(c.json).not.toHaveBeenCalled();
  });

  it("powinien odpowiedzieć statusem 201 i utworzonym użytkownikiem", async () => {
    const service = createService();
    const c = createContext();
    const body = { name: "Jan", email: "jan@example.com" };

    await new UsersController(service).createUser(c, body);

    expect(service.createUser).toHaveBeenCalledWith(body);
    expect(c.json).toHaveBeenCalledWith(user, 201);
  });

  it("powinien odpowiedzieć statusem 204 bez treści po usunięciu", async () => {
    const service = createService();
    const c = createContext();

    await new UsersController(service).deleteUser(c, { id: USER_ID });

    expect(service.deleteUser).toHaveBeenCalledWith(USER_ID);
    expect(c.body).toHaveBeenCalledWith(null, 204);
  });
});
