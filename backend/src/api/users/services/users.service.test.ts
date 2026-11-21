import { describe, expect, it, mock } from "bun:test";
import { UsersService } from "@api/users/services/users.service";
import { NotFoundError } from "@lib/errors/app-errors";
import type { IUsersRepository, User } from "@api/users/types/users.types";

const jan: User = { id: "1", name: "Jan", email: "jan@example.com" };
const anna: User = { id: "2", name: "Anna", email: "anna@example.com" };

// Domyślny mock repozytorium, w teście nadpisujemy tylko potrzebne metody
const makeRepo = (overrides: Partial<IUsersRepository> = {}): IUsersRepository => ({
  getAll: mock(async (): Promise<User[]> => []),
  getById: mock(async (): Promise<User | null> => null),
  create: mock(async (data): Promise<User> => ({ id: "new", ...data })),
  deleteById: mock(async (): Promise<boolean> => true),
  ...overrides,
});

describe("UsersService", () => {
  it("powinien pobrać użytkowników z repozytorium", async () => {
    const repo = makeRepo({ getAll: mock(async () => [jan, anna]) });

    const result = await new UsersService(repo).getUsers();

    expect(result).toEqual([jan, anna]);
    expect(repo.getAll).toHaveBeenCalledTimes(1);
  });

  it("powinien zwrócić użytkownika po id", async () => {
    const repo = makeRepo({ getById: mock(async () => jan) });

    const result = await new UsersService(repo).getUserById("1");

    expect(result).toEqual(jan);
    expect(repo.getById).toHaveBeenCalledWith("1");
  });

  it("powinien rzucić NotFoundError gdy użytkownik nie istnieje", async () => {
    const service = new UsersService(makeRepo());

    await expect(service.getUserById("1")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("powinien utworzyć użytkownika przez repozytorium", async () => {
    const repo = makeRepo();

    const result = await new UsersService(repo).createUser({ name: "Ola", email: "ola@example.com" });

    expect(result).toEqual({ id: "new", name: "Ola", email: "ola@example.com" });
    expect(repo.create).toHaveBeenCalledWith({ name: "Ola", email: "ola@example.com" });
  });

  it("powinien usunąć istniejącego użytkownika", async () => {
    const repo = makeRepo();

    await new UsersService(repo).deleteUser("1");

    expect(repo.deleteById).toHaveBeenCalledWith("1");
  });

  it("powinien rzucić NotFoundError przy usuwaniu nieistniejącego użytkownika", async () => {
    const service = new UsersService(makeRepo({ deleteById: mock(async () => false) }));

    await expect(service.deleteUser("1")).rejects.toBeInstanceOf(NotFoundError);
  });
});
