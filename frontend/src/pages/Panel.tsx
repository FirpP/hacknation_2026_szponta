import { type SubmitEventHandler } from "react";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import H1 from "@/components/ui/H1";
import Input from "@/components/ui/Input";
import { useMe } from "@/features/auth/auth.hooks";
import { useCreateUser, useDeleteUser, useUsers } from "@/features/users/users.hooks";
import { fieldError } from "@/lib/api-client";

// Strona chroniona przez <RequireAuth> w App.tsx - tu użytkownik jest zawsze zalogowany
const Panel = () => {
  const { data: me } = useMe();

  return (
    <>
      <H1>Panel</H1>
      <p>
        Zalogowany jako <strong>{me?.username}</strong>
      </p>
      <CreateUserForm />
      <UsersList />
    </>
  );
};

const CreateUserForm = () => {
  const createUser = useCreateUser();

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const formElement = e.currentTarget;
    const form = new FormData(formElement);
    createUser.mutate(
      { name: String(form.get("name")), email: String(form.get("email")) },
      { onSuccess: () => formElement.reset() },
    );
  };

  return (
    <section className="card">
      <h2>Dodaj użytkownika</h2>
      <form className="form" onSubmit={handleSubmit}>
        <Input label="Imię i nazwisko" name="name" required error={fieldError(createUser.error, "name")} />
        <Input label="Email" name="email" type="email" required error={fieldError(createUser.error, "email")} />
        <FormError error={createUser.error} />
        <Button type="submit" disabled={createUser.isPending}>
          {createUser.isPending ? "Zapisywanie..." : "Dodaj"}
        </Button>
      </form>
    </section>
  );
};

const UsersList = () => {
  const { data: users, isPending, error } = useUsers();
  const deleteUser = useDeleteUser();

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Usunąć użytkownika ${name}?`)) deleteUser.mutate(id);
  };

  return (
    <section className="card">
      <h2>Użytkownicy</h2>
      {isPending && <p>Ładowanie...</p>}
      <FormError error={error ?? deleteUser.error} />
      {users?.length === 0 && <p>Brak użytkowników.</p>}
      {users && users.length > 0 && (
        <ul className="list">
          {users.map((user) => (
            <li key={user.id}>
              <span>
                {user.name} <small>({user.email})</small>
              </span>
              <Button
                variant="danger"
                onClick={() => handleDelete(user.id, user.name)}
                disabled={deleteUser.isPending && deleteUser.variables === user.id}
              >
                Usuń
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default Panel;
