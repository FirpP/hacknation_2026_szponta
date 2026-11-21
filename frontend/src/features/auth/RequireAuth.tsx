import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useMe } from "@/features/auth/auth.hooks";

/**
 * Trasa-rodzic dla stron wymagających zalogowania:
 *   <Route element={<RequireAuth />}>
 *     <Route path="/panel" element={<Panel />} />
 *   </Route>
 * Bez sesji przekierowuje na /login i zapamiętuje, skąd przyszedł użytkownik (state.from).
 */
const RequireAuth = () => {
  const { data: me, isPending, error } = useMe();
  const location = useLocation();

  if (isPending) return <p>Sprawdzanie sesji...</p>;
  if (error) return <p className="error">Nie udało się sprawdzić sesji: {error.message}</p>;
  if (!me) return <Navigate to="/login" replace state={{ from: location }} />;

  return <Outlet />;
};

export default RequireAuth;
