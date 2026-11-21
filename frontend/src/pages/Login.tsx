import type { SubmitEventHandler } from "react";
import { Navigate, useLocation, useNavigate, type Location } from "react-router-dom";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import H1 from "@/components/ui/H1";
import Input from "@/components/ui/Input";
import { useLogin, useMe } from "@/features/auth/auth.hooks";
import { fieldError } from "@/lib/api-client";

const Login = () => {
  const { data: me } = useMe();
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  // <RequireAuth> zapisuje w state, skąd nas przekierował - po zalogowaniu wracamy tam
  const from = (location.state as { from?: Location } | null)?.from?.pathname ?? "/panel";

  if (me) return <Navigate to={from} replace />;

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    login.mutate(
      { username: String(form.get("username")), password: String(form.get("password")) },
      { onSuccess: () => navigate(from, { replace: true }) },
    );
  };

  return (
    <>
      <H1>Logowanie</H1>
      <form className="form" onSubmit={handleSubmit}>
        <Input
          label="Login"
          name="username"
          autoComplete="username"
          required
          error={fieldError(login.error, "username")}
        />
        <Input
          label="Hasło"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          error={fieldError(login.error, "password")}
        />
        <FormError error={login.error} />
        <Button type="submit" disabled={login.isPending}>
          {login.isPending ? "Logowanie..." : "Zaloguj"}
        </Button>
      </form>
    </>
  );
};

export default Login;
