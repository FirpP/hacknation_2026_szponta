import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import Button from "@/components/ui/Button";
import { useLogout, useMe } from "@/features/auth/auth.hooks";

const MainLayout = () => {
  const { data: me } = useMe();
  const logout = useLogout();
  const navigate = useNavigate();

  const handleLogout = () => logout.mutate(undefined, { onSuccess: () => navigate("/") });

  return (
    <>
      <nav className="navbar">
        <NavLink to="/">Home</NavLink>
        <NavLink to="/about">About</NavLink>
        <NavLink to="/panel">Panel</NavLink>
        <div className="navbar__right">
          {me ? (
            <>
              <span>{me.username}</span>
              <Button variant="secondary" onClick={handleLogout} disabled={logout.isPending}>
                Wyloguj
              </Button>
            </>
          ) : (
            <Link to="/login">Zaloguj</Link>
          )}
        </div>
      </nav>
      <main className="container">
        <Outlet />
      </main>
    </>
  );
};

export default MainLayout;
