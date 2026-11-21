import { Hono } from "hono";
import { UsersRepository } from "@api/users/repositories/users.repository";
import { UsersService } from "@api/users/services/users.service";
import { UsersController } from "@api/users/controllers/users.controller";
import { getUsersDocs, getUserByIdDocs, createUserDocs, deleteUserDocs } from "@api/users/docs/users.docs";
import { CreateUserBodySchema, GetUserIdParamsSchema } from "@api/users/validators/users.validator";
import { validate } from "@middleware/validate";
import { requireAuth } from "@middleware/auth";

// /api/v1/users
const router = new Hono();

const usersRepository = new UsersRepository();
const usersService = new UsersService(usersRepository);
const usersController = new UsersController(usersService);

// Public endpoints
router.get("/", getUsersDocs, (c) => usersController.getUsers(c));
router.get("/:id", getUserByIdDocs, validate("param", GetUserIdParamsSchema), (c) =>
  usersController.getUserById(c, c.req.valid("param")),
);

// Authenticated endpoints
router.post("/", createUserDocs, requireAuth, validate("json", CreateUserBodySchema), (c) =>
  usersController.createUser(c, c.req.valid("json")),
);
router.delete("/:id", deleteUserDocs, requireAuth, validate("param", GetUserIdParamsSchema), (c) =>
  usersController.deleteUser(c, c.req.valid("param")),
);

export default router;
